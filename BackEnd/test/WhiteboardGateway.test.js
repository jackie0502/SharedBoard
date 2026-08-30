const test = require("node:test");
const assert = require("node:assert/strict");

const { WhiteboardGateway } = require("../src/socket/WhiteboardGateway");

const createIo = () => {
    const events = [];
    return {
        events,
        to: (roomId) => ({
            emit: (event, data) => events.push({ roomId, event, data }),
        }),
    };
};

const createSocket = (id) => {
    const events = [];
    return {
        id,
        data: {},
        events,
        rooms: new Set(),
        join(roomId) { this.rooms.add(roomId); },
        leave(roomId) { this.rooms.delete(roomId); },
        to: (roomId) => ({
            emit: (event, data) => events.push({ roomId, event, data }),
        }),
    };
};

test("Gateway 會維護加入與離開房間的成員名單", () => {
    const io = createIo();
    const service = { getSnapshot: () => [] };
    const logger = { log: () => {}, error: () => {} };
    const gateway = new WhiteboardGateway(io, service, logger);
    const alice = createSocket("socket-a");
    const bob = createSocket("socket-b");
    let aliceResponse;
    let bobResponse;

    gateway.handleRoomJoin(alice, { roomId: "room-1", userName: "Alice" }, (data) => {
        aliceResponse = data;
    });
    gateway.handleRoomJoin(bob, { roomId: "room-1", userName: "Bob" }, (data) => {
        bobResponse = data;
    });

    assert.deepEqual(aliceResponse.users, [
        { socketId: "socket-a", userName: "Alice" },
    ]);
    assert.deepEqual(bobResponse.users, [
        { socketId: "socket-a", userName: "Alice" },
        { socketId: "socket-b", userName: "Bob" },
    ]);

    gateway.handleDisconnect(bob);

    assert.deepEqual(gateway.getRoomMembers("room-1"), [
        { socketId: "socket-a", userName: "Alice" },
    ]);
    assert.deepEqual(io.events.at(-1), {
        roomId: "room-1",
        event: "room:users",
        data: {
            roomId: "room-1",
            users: [{ socketId: "socket-a", userName: "Alice" }],
        },
    });
});

test("Gateway 只會向同房間其他使用者廣播有效游標座標", () => {
    const io = createIo();
    const service = { getSnapshot: () => [] };
    const logger = { log: () => {}, error: () => {} };
    const gateway = new WhiteboardGateway(io, service, logger);
    const alice = createSocket("socket-a");
    let validResponse;
    let invalidResponse;

    gateway.handleRoomJoin(alice, { roomId: "room-1", userName: "Alice" }, () => {});
    alice.events.length = 0;
    gateway.handleCursorMove(alice, { x: 120, y: 80 }, (data) => {
        validResponse = data;
    });
    gateway.handleCursorMove(alice, { x: "bad", y: 80 }, (data) => {
        invalidResponse = data;
    });

    assert.deepEqual(validResponse, { success: true });
    assert.equal(invalidResponse.success, false);
    assert.deepEqual(alice.events, [{
        roomId: "room-1",
        event: "cursor:move",
        data: {
            socketId: "socket-a",
            userName: "Alice",
            x: 120,
            y: 80,
        },
    }]);
});

test("Gateway 會廣播選取狀態與正在建立的圖形預覽", () => {
    const io = createIo();
    const service = { getSnapshot: () => [] };
    const logger = { log: () => {}, error: () => {} };
    const gateway = new WhiteboardGateway(io, service, logger);
    const alice = createSocket("socket-a");
    let response;

    gateway.handleRoomJoin(alice, { roomId: "room-1", userName: "Alice" }, () => {});
    alice.events.length = 0;
    gateway.handleInteractionUpdate(alice, {
        objectId: "shape-1",
        isDraft: true,
        preview: {
            id: "shape-1",
            type: "circle",
            x: 20,
            y: 30,
            width: 80,
            height: 60,
            color: "#22c55e",
            version: 1,
        },
    }, (data) => { response = data; });

    assert.deepEqual(response, { success: true });
    assert.equal(alice.events[0].event, "interaction:update");
    assert.equal(alice.events[0].data.userName, "Alice");
    assert.equal(alice.events[0].data.preview.type, "circle");

    gateway.handleInteractionHide(alice);
    assert.deepEqual(alice.events.at(-1), {
        roomId: "room-1",
        event: "interaction:hide",
        data: { socketId: "socket-a" },
    });
});

test("Gateway 會拒絕無效的圖形預覽", () => {
    const gateway = new WhiteboardGateway(createIo(), { getSnapshot: () => [] }, {
        log: () => {}, error: () => {},
    });
    const alice = createSocket("socket-a");
    let response;
    gateway.handleRoomJoin(alice, { roomId: "room-1", userName: "Alice" }, () => {});

    gateway.handleInteractionUpdate(alice, {
        objectId: "shape-1",
        preview: { id: "shape-1", type: "circle", x: "bad", y: 0, width: 10, height: 10 },
    }, (data) => { response = data; });

    assert.equal(response.success, false);
});
