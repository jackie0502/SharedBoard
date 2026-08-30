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

const createSocket = (id) => ({
    id,
    data: {},
    rooms: new Set(),
    join(roomId) { this.rooms.add(roomId); },
    leave(roomId) { this.rooms.delete(roomId); },
    to: () => ({ emit: () => {} }),
});

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
