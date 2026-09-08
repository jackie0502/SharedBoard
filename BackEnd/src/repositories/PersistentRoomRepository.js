const { InMemoryRoomRepository } = require("./InMemoryRoomRepository");

class PersistentRoomRepository {
    #loadedRooms = new Set();
    #loadingRooms = new Map();
    #dirtyVersions = new Map();
    #saveTimers = new Map();
    #closing = false;

    constructor(snapshotStore, {
        memoryRepository = new InMemoryRoomRepository(),
        saveIntervalMs = 1000,
        logger = console,
    } = {}) {
        this.snapshotStore = snapshotStore;
        this.memoryRepository = memoryRepository;
        this.saveIntervalMs = saveIntervalMs;
        this.logger = logger;
    }

    async initialize() {
        await this.snapshotStore.initialize();
    }

    async getOrCreate(roomId) {
        if (!this.#loadedRooms.has(roomId)) {
            await this.#loadRoom(roomId);
        }
        return this.memoryRepository.getOrCreate(roomId);
    }

    find(roomId) {
        return this.memoryRepository.find(roomId);
    }

    markDirty(roomId) {
        const version = (this.#dirtyVersions.get(roomId) ?? 0) + 1;
        this.#dirtyVersions.set(roomId, version);
        this.#scheduleSave(roomId);
    }

    async flush(roomId) {
        const timer = this.#saveTimers.get(roomId);
        if (timer) clearTimeout(timer);
        this.#saveTimers.delete(roomId);

        const dirtyVersion = this.#dirtyVersions.get(roomId);
        const room = this.memoryRepository.find(roomId);
        if (dirtyVersion === undefined || !room) return;

        try {
            await this.snapshotStore.saveRoom(roomId, room.getSnapshot());
            if (this.#dirtyVersions.get(roomId) === dirtyVersion) {
                this.#dirtyVersions.delete(roomId);
            } else {
                this.#scheduleSave(roomId);
            }
        } catch (error) {
            this.logger.error(`保存房間 ${roomId} Snapshot 失敗：`, error);
            if (!this.#closing) this.#scheduleSave(roomId);
            throw error;
        }
    }

    async flushAll() {
        const roomIds = Array.from(this.#dirtyVersions.keys());
        await Promise.all(roomIds.map((roomId) => this.flush(roomId)));
    }

    async close() {
        this.#closing = true;
        for (const timer of this.#saveTimers.values()) clearTimeout(timer);
        this.#saveTimers.clear();

        try {
            await this.flushAll();
        } finally {
            await this.snapshotStore.close();
        }
    }

    async #loadRoom(roomId) {
        if (!this.#loadingRooms.has(roomId)) {
            const loading = (async () => {
                const objects = await this.snapshotStore.loadRoom(roomId);
                const room = this.memoryRepository.getOrCreate(roomId);
                room.loadSnapshot(objects);
                this.#loadedRooms.add(roomId);
            })().finally(() => this.#loadingRooms.delete(roomId));

            this.#loadingRooms.set(roomId, loading);
        }

        await this.#loadingRooms.get(roomId);
    }

    #scheduleSave(roomId) {
        if (this.#closing || this.#saveTimers.has(roomId)) return;

        const timer = setTimeout(() => {
            this.flush(roomId).catch(() => {});
        }, this.saveIntervalMs);
        timer.unref?.();
        this.#saveTimers.set(roomId, timer);
    }
}

module.exports = { PersistentRoomRepository };
