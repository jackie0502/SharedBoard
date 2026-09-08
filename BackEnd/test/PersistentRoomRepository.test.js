const test = require("node:test");
const assert = require("node:assert/strict");

const { WhiteboardService } = require("../src/application/WhiteboardService");
const { SnapshotConflictError } = require("../src/persistence/SnapshotConflictError");
const { PersistentRoomRepository } = require("../src/repositories/PersistentRoomRepository");

class FakeSnapshotStore {
    constructor() {
        this.rooms = new Map();
        this.saveCalls = [];
        this.initialized = false;
        this.closed = false;
        this.failSaveCount = 0;
    }

    async initialize() {
        this.initialized = true;
    }

    async loadRoom(roomId) {
        return structuredClone(
            this.rooms.get(roomId) ?? { objects: [], revision: 0 },
        );
    }

    async saveRoom(roomId, objects, expectedRevision) {
        if (this.failSaveCount > 0) {
            this.failSaveCount -= 1;
            throw new Error("temporary database failure");
        }

        const currentRevision = this.rooms.get(roomId)?.revision ?? 0;
        if (currentRevision !== expectedRevision) {
            throw new SnapshotConflictError(roomId, expectedRevision);
        }

        const snapshot = structuredClone(objects);
        const revision = currentRevision + 1;
        this.rooms.set(roomId, { objects: snapshot, revision });
        this.saveCalls.push({ roomId, objects: snapshot, expectedRevision });
        return revision;
    }

    async close() {
        this.closed = true;
    }
}

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

test("PersistentRoomRepository 會從 Snapshot Store 載入房間", async () => {
    const store = new FakeSnapshotStore();
    store.rooms.set("room-1", {
        objects: [rectangle({ version: 3 })],
        revision: 7,
    });
    const repository = new PersistentRoomRepository(store, { saveIntervalMs: 60_000 });
    const service = new WhiteboardService(repository);

    await repository.initialize();
    const snapshot = await service.getSnapshot("room-1");

    assert.equal(store.initialized, true);
    assert.deepEqual(snapshot, [rectangle({ version: 3 })]);
    await repository.close();
});

test("保存後可由全新的 Repository 還原 Room Snapshot", async () => {
    const store = new FakeSnapshotStore();
    const firstRepository = new PersistentRoomRepository(store, { saveIntervalMs: 60_000 });
    const firstService = new WhiteboardService(firstRepository);

    await firstRepository.initialize();
    await firstService.createObject("room-1", rectangle());
    await firstService.updateObject("room-1", rectangle({ x: 90, version: 2 }));
    await firstRepository.flushAll();

    assert.equal(store.saveCalls.length, 1);
    assert.deepEqual(store.rooms.get("room-1"), {
        objects: [rectangle({ x: 90, version: 2 })],
        revision: 1,
    });

    const secondRepository = new PersistentRoomRepository(store, { saveIntervalMs: 60_000 });
    const secondService = new WhiteboardService(secondRepository);
    const restored = await secondService.getSnapshot("room-1");

    assert.deepEqual(restored, [rectangle({ x: 90, version: 2 })]);
    await firstRepository.close();
    await secondRepository.close();
});

test("暫時保存失敗時會保留 dirty 狀態並允許之後重試", async () => {
    const store = new FakeSnapshotStore();
    store.failSaveCount = 1;
    const logger = { error: () => {} };
    const repository = new PersistentRoomRepository(store, {
        saveIntervalMs: 60_000,
        retryBaseMs: 10,
        logger,
    });
    const service = new WhiteboardService(repository);

    await repository.initialize();
    await service.createObject("room-retry", rectangle());
    await assert.rejects(repository.flush("room-retry"), /temporary database failure/);
    assert.deepEqual(repository.getPersistenceStatus().dirtyRoomIds, ["room-retry"]);

    await repository.flush("room-retry");
    assert.deepEqual(repository.getPersistenceStatus(), {
        dirtyRoomIds: [],
        conflictedRoomIds: [],
    });
    await repository.close();
});

test("兩個 Repository 不會讓舊 revision 覆蓋較新的 Snapshot", async () => {
    const store = new FakeSnapshotStore();
    const logger = { error: () => {} };
    const firstRepository = new PersistentRoomRepository(store, {
        saveIntervalMs: 60_000,
        logger,
    });
    const secondRepository = new PersistentRoomRepository(store, {
        saveIntervalMs: 60_000,
        logger,
    });
    const firstService = new WhiteboardService(firstRepository);
    const secondService = new WhiteboardService(secondRepository);

    await Promise.all([
        firstService.getSnapshot("shared-room"),
        secondService.getSnapshot("shared-room"),
    ]);
    await firstService.createObject("shared-room", rectangle({ id: "from-first" }));
    await secondService.createObject("shared-room", rectangle({ id: "from-second" }));
    await firstRepository.flush("shared-room");

    await assert.rejects(
        secondRepository.flush("shared-room"),
        SnapshotConflictError,
    );
    assert.deepEqual(store.rooms.get("shared-room").objects, [
        rectangle({ id: "from-first" }),
    ]);
    assert.deepEqual(secondRepository.getPersistenceStatus().conflictedRoomIds, [
        "shared-room",
    ]);

    await firstRepository.close();
    await assert.rejects(secondRepository.close(), AggregateError);
});

test("Snapshot 內含無效物件時拒絕載入 Room", async () => {
    const store = new FakeSnapshotStore();
    store.rooms.set("broken-room", {
        objects: [{ id: "broken", type: "rect", x: "invalid", y: 0, version: 1 }],
        revision: 1,
    });
    const repository = new PersistentRoomRepository(store, { saveIntervalMs: 60_000 });
    const service = new WhiteboardService(repository);

    await assert.rejects(service.getSnapshot("broken-room"), /Snapshot 包含格式不正確/);
    await repository.close();
});
