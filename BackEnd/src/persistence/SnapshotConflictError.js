class SnapshotConflictError extends Error {
    constructor(roomId, expectedRevision) {
        super(
            `房間 ${roomId} 的 Snapshot 已被其他伺服器更新（預期 revision ${expectedRevision}）`,
        );
        this.name = "SnapshotConflictError";
        this.roomId = roomId;
        this.expectedRevision = expectedRevision;
    }
}

module.exports = { SnapshotConflictError };
