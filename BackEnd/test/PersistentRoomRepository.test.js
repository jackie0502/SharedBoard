const test = require("node:test");
const assert = require("node:assert/strict");

const { WhiteboardService } = require("../src/application/WhiteboardService");
const { PersistentRoomRepository } = require("../src/repositories/PersistentRoomRepository");

class FakeSnapshotStore {
    constructor() {
        this.rooms = new Map();
        this.saveCalls = [];
        this.initialized = false;
        this.closed = false;
    }

    async initialize() {
        this.initialized = true;
    }

    async loadRoom(roomId) {
        return structuredClone(this.rooms.get(roomId) ?? []);
    }

    async saveRoom(roomId, objects) {
        const snapshot = structuredClone(objects);
        this.rooms.set(roomId, snapshot);
        this.saveCalls.push({ roomId, objects: snapshot });
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
    store.rooms.set("room-1", [rectangle({ version: 3 })]);
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
    assert.deepEqual(store.rooms.get("room-1"), [rectangle({ x: 90, version: 2 })]);

    const secondRepository = new PersistentRoomRepository(store, { saveIntervalMs: 60_000 });
    const secondService = new WhiteboardService(secondRepository);
    const restored = await secondService.getSnapshot("room-1");

    assert.deepEqual(restored, [rectangle({ x: 90, version: 2 })]);
    await firstRepository.close();
    await secondRepository.close();
});
