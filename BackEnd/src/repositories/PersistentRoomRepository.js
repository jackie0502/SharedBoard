const { InMemoryRoomRepository } = require("./InMemoryRoomRepository");
const { RoomPersistenceState } = require("./RoomPersistenceState");
const { SnapshotConflictError } = require("../persistence/SnapshotConflictError");

class PersistentRoomRepository {
    #states = new Map();
    #closing = false;

    constructor(snapshotStore, {
        memoryRepository = new InMemoryRoomRepository(),
        saveIntervalMs = 1000,
        retryBaseMs = 1000,
        retryMaxMs = 30_000,
        shutdownFlushAttempts = 3,
        logger = console,
    } = {}) {
        this.snapshotStore = snapshotStore;
        this.memoryRepository = memoryRepository;
        this.saveIntervalMs = saveIntervalMs;
        this.retryBaseMs = retryBaseMs;
        this.retryMaxMs = retryMaxMs;
        this.shutdownFlushAttempts = shutdownFlushAttempts;
        this.logger = logger;
    }

    async initialize() {
        await this.snapshotStore.initialize();
    }

    async getOrCreate(roomId) {
        const state = this.#getState(roomId);
        if (!state.loaded) {
            await this.#loadRoom(state);
        }
        return this.memoryRepository.getOrCreate(roomId);
    }

    find(roomId) {
        return this.memoryRepository.find(roomId);
    }

    getPersistenceStatus() {
        const states = Array.from(this.#states.values());
        return {
            dirtyRoomIds: states
                .filter((state) => state.isDirty)
                .map((state) => state.roomId),
            conflictedRoomIds: states
                .filter((state) => state.conflicted)
                .map((state) => state.roomId),
        };
    }

    markDirty(roomId) {
        const state = this.#getState(roomId);
        state.markDirty();
        this.#scheduleSave(state);
    }

    async discard(roomId) {
        const state = this.#states.get(roomId);
        if (state) {
            state.clearSaveTimer();
            if (state.inFlightSave) await state.inFlightSave;
            this.#states.delete(roomId);
        }
        this.memoryRepository.delete(roomId);
    }

    async flush(roomId) {
        const state = this.#getState(roomId);
        const inFlightSave = state.inFlightSave;
        if (inFlightSave) {
            await inFlightSave;
            if (state.isDirty) return this.flush(roomId);
            return;
        }

        const save = this.#performFlush(state);
        state.inFlightSave = save;
        try {
            await save;
        } finally {
            if (state.inFlightSave === save) state.inFlightSave = null;
        }
    }

    async #performFlush(state) {
        state.clearSaveTimer();

        const room = this.memoryRepository.find(state.roomId);
        if (!state.isDirty || !room) return;
        const changeSequence = state.captureChangeSequence();

        try {
            const savedRevision = await this.snapshotStore.saveRoom(
                state.roomId,
                room.getSnapshot(),
                state.persistedRevision,
            );
            state.markSaveSucceeded(changeSequence, savedRevision);
            if (state.isDirty) this.#scheduleSave(state);
        } catch (error) {
            if (error instanceof SnapshotConflictError) {
                state.markConflicted();
                this.logger.error(
                    `房間 ${state.roomId} 發生 Snapshot revision 衝突；已阻止舊資料覆蓋，請確認是否同時執行多個後端實例：`,
                    error,
                );
            } else {
                const attempt = state.markSaveFailed();
                const retryDelayMs = this.#getRetryDelay(attempt);
                this.logger.error(
                    `保存房間 ${state.roomId} Snapshot 失敗；第 ${attempt} 次失敗，將於 ${retryDelayMs}ms 後重試：`,
                    error,
                );
                if (!this.#closing) this.#scheduleSave(state, retryDelayMs);
            }
            throw error;
        }
    }

    async flushAll() {
        const dirtyStates = Array.from(this.#states.values())
            .filter((state) => state.isDirty);
        const results = await Promise.allSettled(
            dirtyStates.map((state) => this.flush(state.roomId)),
        );
        const errors = results
            .filter((result) => result.status === "rejected")
            .map((result) => result.reason);
        if (errors.length > 0) {
            throw new AggregateError(errors, "部分 Room Snapshot 保存失敗");
        }
    }

    async close() {
        this.#closing = true;
        for (const state of this.#states.values()) state.clearSaveTimer();

        let flushError;
        try {
            for (let attempt = 1; attempt <= this.shutdownFlushAttempts; attempt += 1) {
                try {
                    await this.flushAll();
                    flushError = undefined;
                    break;
                } catch (error) {
                    flushError = error;
                    if (
                        this.#containsSnapshotConflict(error) ||
                        attempt === this.shutdownFlushAttempts
                    ) {
                        break;
                    }
                    const retryDelayMs = this.#getRetryDelay(attempt);
                    this.logger.error(
                        `關閉前保存 Snapshot 失敗，將於 ${retryDelayMs}ms 後重試（${attempt}/${this.shutdownFlushAttempts}）：`,
                        error,
                    );
                    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                }
            }
        } finally {
            await this.snapshotStore.close();
        }

        if (flushError) throw flushError;
    }

    async #loadRoom(state) {
        if (!state.loadingPromise) {
            state.loadingPromise = (async () => {
                const { objects, revision } = await this.snapshotStore.loadRoom(
                    state.roomId,
                );
                const room = this.memoryRepository.getOrCreate(state.roomId);
                room.loadSnapshot(objects);
                state.markLoaded(revision);
            })().finally(() => {
                state.loadingPromise = null;
            });
        }

        await state.loadingPromise;
    }

    #scheduleSave(state, delayMs = this.saveIntervalMs) {
        if (this.#closing || state.saveTimer) return;

        state.saveTimer = setTimeout(() => {
            this.flush(state.roomId).catch(() => {});
        }, delayMs);
        state.saveTimer.unref?.();
    }

    #getState(roomId) {
        if (!this.#states.has(roomId)) {
            this.#states.set(roomId, new RoomPersistenceState(roomId));
        }
        return this.#states.get(roomId);
    }

    #getRetryDelay(attempt) {
        return Math.min(this.retryBaseMs * (2 ** (attempt - 1)), this.retryMaxMs);
    }

    #containsSnapshotConflict(error) {
        if (error instanceof SnapshotConflictError) return true;
        return error instanceof AggregateError &&
            error.errors.some((nestedError) => this.#containsSnapshotConflict(nestedError));
    }
}

module.exports = { PersistentRoomRepository };
