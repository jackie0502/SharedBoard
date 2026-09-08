const { Pool } = require("pg");
const { SnapshotConflictError } = require("./SnapshotConflictError");

const CREATE_SNAPSHOT_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
        room_id TEXT PRIMARY KEY,
        objects JSONB NOT NULL DEFAULT '[]'::jsonb,
        revision BIGINT NOT NULL DEFAULT 1,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
`;

const ADD_REVISION_COLUMN_SQL = `
    ALTER TABLE whiteboard_snapshots
    ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1
`;

class PostgresSnapshotStore {
    constructor({
        connectionString,
        ssl = false,
        connectionTimeoutMillis = 5000,
        pool,
        logger = console,
    } = {}) {
        if (!pool && !connectionString) {
            throw new Error("PostgresSnapshotStore 需要 connectionString 或 pool");
        }

        this.ownsPool = !pool;
        this.logger = logger;
        this.pool = pool ?? new Pool({
            connectionString,
            ssl: ssl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis,
        });

        this.pool.on?.("error", (error) => {
            this.logger.error("PostgreSQL 連線池發生未預期錯誤：", error);
        });
    }

    async initialize() {
        await this.pool.query(CREATE_SNAPSHOT_TABLE_SQL);
        await this.pool.query(ADD_REVISION_COLUMN_SQL);
    }

    async loadRoom(roomId) {
        const result = await this.pool.query(
            "SELECT objects, revision FROM whiteboard_snapshots WHERE room_id = $1",
            [roomId],
        );

        if (result.rowCount === 0) return { objects: [], revision: 0 };

        const { objects, revision: rawRevision } = result.rows[0];
        const revision = Number(rawRevision);
        if (!Array.isArray(objects)) {
            throw new Error(`房間 ${roomId} 的 Snapshot objects 不是陣列`);
        }
        if (!Number.isSafeInteger(revision) || revision < 1) {
            throw new Error(`房間 ${roomId} 的 Snapshot revision 格式不正確`);
        }

        return { objects, revision };
    }

    async saveRoom(roomId, objects, expectedRevision) {
        if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
            throw new Error("expectedRevision 必須是大於或等於 0 的安全整數");
        }

        const result = await this.pool.query(
            `
                WITH updated AS (
                    UPDATE whiteboard_snapshots
                    SET
                        objects = $2::jsonb,
                        revision = revision + 1,
                        updated_at = NOW()
                    WHERE room_id = $1 AND revision = $3
                    RETURNING revision
                ),
                inserted AS (
                    INSERT INTO whiteboard_snapshots (
                        room_id,
                        objects,
                        revision,
                        updated_at
                    )
                    SELECT $1, $2::jsonb, 1, NOW()
                    WHERE $3 = 0 AND NOT EXISTS (SELECT 1 FROM updated)
                    ON CONFLICT (room_id) DO NOTHING
                    RETURNING revision
                )
                SELECT revision FROM updated
                UNION ALL
                SELECT revision FROM inserted
            `,
            [roomId, JSON.stringify(objects), expectedRevision],
        );

        if (result.rowCount === 0) {
            throw new SnapshotConflictError(roomId, expectedRevision);
        }

        const revision = Number(result.rows[0].revision);
        if (!Number.isSafeInteger(revision) || revision < 1) {
            throw new Error(`房間 ${roomId} 保存後收到無效的 Snapshot revision`);
        }
        return revision;
    }

    async close() {
        if (this.ownsPool) await this.pool.end();
    }
}

module.exports = {
    ADD_REVISION_COLUMN_SQL,
    CREATE_SNAPSHOT_TABLE_SQL,
    PostgresSnapshotStore,
};
