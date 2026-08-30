const test = require("node:test");
const assert = require("node:assert/strict");

const { DomainError } = require("../src/domain/DomainError");
const { Room } = require("../src/domain/Room");
const { InMemoryRoomRepository } = require("../src/repositories/InMemoryRoomRepository");
const { WhiteboardService } = require("../src/application/WhiteboardService");

const rectangle = (changes = {}) => ({
    id: "rect-1",
    type: "rect",
    x: 10,
    y: 20,
    width: 100,
    height: 60,
    version: 1,
    ...changes,
});

test("Room 建立物件後會出現在 Snapshot", () => {
    const room = new Room("room-1");
    const object = rectangle();

    room.createObject(object);

    assert.deepEqual(room.getSnapshot(), [object]);
});

test("Room 接受橡皮擦軌跡並保存在 Snapshot", () => {
    const room = new Room("room-1");
    const eraser = {
        id: "eraser-1",
        type: "eraser",
        x: 0,
        y: 0,
        points: [10, 20, 30, 40],
        strokeWidth: 24,
        version: 1,
    };

    room.createObject(eraser);

    assert.deepEqual(room.getSnapshot(), [eraser]);
});

test("Room 不允許重複的物件 ID", () => {
    const room = new Room("room-1");
    room.createObject(rectangle());

    assert.throws(
        () => room.createObject(rectangle()),
        (error) => error instanceof DomainError && error.message === "物件 ID 已存在",
    );
});

test("Room 只接受版本較新的更新", () => {
    const room = new Room("room-1");
    room.createObject(rectangle());
    const updated = rectangle({ x: 80, version: 2 });

    room.updateObject(updated);

    assert.deepEqual(room.getSnapshot(), [updated]);
    assert.throws(
        () => room.updateObject(rectangle({ version: 2 })),
        (error) =>
            error instanceof DomainError &&
            error.message === "更新版本過舊，目前版本為 2" &&
            error.details.currentObject === updated,
    );
});

test("Room 刪除失敗時會附上目前物件", () => {
    const room = new Room("room-1");
    const currentObject = rectangle({ version: 3 });
    room.createObject(currentObject);

    assert.throws(
        () => room.deleteObject(currentObject.id, 3),
        (error) =>
            error instanceof DomainError &&
            error.details.currentObject === currentObject,
    );
});

test("WhiteboardService 透過 Repository 操作同一個 Room", () => {
    const repository = new InMemoryRoomRepository();
    const service = new WhiteboardService(repository);
    const object = rectangle();

    service.createObject("room-1", object);
    const snapshot = service.getSnapshot("room-1");
    service.deleteObject("room-1", object.id, 2);

    assert.deepEqual(snapshot, [object]);
    assert.deepEqual(service.getSnapshot("room-1"), []);
    assert.equal(repository.find("missing-room"), null);
});
