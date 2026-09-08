const test = require("node:test");
const assert = require("node:assert/strict");

const { RoomCatalogService } = require("../src/application/RoomCatalogService");
const {
    InMemoryRoomCatalogRepository,
} = require("../src/repositories/InMemoryRoomCatalogRepository");

test("RoomCatalogService 支援建立、列表、改名與刪除 Room", async () => {
    const repository = new InMemoryRoomCatalogRepository();
    const discarded = [];
    const service = new RoomCatalogService(repository, {
        whiteboardRoomRepository: {
            async flush() {},
            async discard(roomId) { discarded.push(roomId); },
        },
    });

    const created = await service.createRoom({ id: "room-1", name: "設計會議" });
    assert.equal(created.name, "設計會議");
    assert.equal((await service.listRooms()).length, 1);

    const renamed = await service.renameRoom("room-1", "產品會議");
    assert.equal(renamed.name, "產品會議");

    await service.deleteRoom("room-1");
    assert.deepEqual(discarded, ["room-1"]);
    await assert.rejects(service.getRoom("room-1"), /找不到 Room/);
});

test("RoomCatalogService 不允許刪除仍有使用者的 Room", async () => {
    const repository = new InMemoryRoomCatalogRepository();
    const service = new RoomCatalogService(repository);
    await service.createRoom({ id: "busy-room" });
    service.setRoomActiveChecker((roomId) => roomId === "busy-room");

    await assert.rejects(
        service.deleteRoom("busy-room"),
        (error) => error.details.code === "ROOM_IN_USE",
    );
    assert.ok(await service.getRoom("busy-room"));
});
