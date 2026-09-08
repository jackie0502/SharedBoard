class RoomPersistenceState {
    constructor(roomId) {
        this.roomId = roomId;
        this.loaded = false;
        this.loadingPromise = null;
        this.persistedRevision = 0;
        this.changeSequence = 0;
        this.savedChangeSequence = 0;
        this.retryAttempts = 0;
        this.conflicted = false;
        this.saveTimer = null;
        this.inFlightSave = null;
    }

    get isDirty() {
        return this.changeSequence > this.savedChangeSequence;
    }

    markLoaded(revision) {
        this.persistedRevision = revision;
        this.loaded = true;
    }

    markDirty() {
        this.changeSequence += 1;
    }

    captureChangeSequence() {
        return this.changeSequence;
    }

    markSaveSucceeded(changeSequence, revision) {
        this.savedChangeSequence = Math.max(
            this.savedChangeSequence,
            changeSequence,
        );
        this.persistedRevision = revision;
        this.retryAttempts = 0;
        this.conflicted = false;
    }

    markSaveFailed() {
        this.retryAttempts += 1;
        return this.retryAttempts;
    }

    markConflicted() {
        this.conflicted = true;
    }

    clearSaveTimer() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = null;
    }
}

module.exports = { RoomPersistenceState };
