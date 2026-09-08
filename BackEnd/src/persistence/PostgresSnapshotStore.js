const { Pool } = require("pg");

const CREATE_SNAPSHOT_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
        room_id TEXT PRIMARY KEY,
        objects JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
`;

class PostgresSnapshotStore {
    constructor({ connectionString, ssl = false, pool } = {}) {
        if (!pool && !connectionString) {
            throw new Error("PostgresSnapshotStore 需要 connectionString 或 pool");
        }

        this.ownsPool = !pool;
        this.pool = pool ?? new Pool({
            connectionString,
            ssl: ssl ? { rejectUnauthorized: false } : undefined,
        });
    }

    async initialize() {
        await this.pool.query(CREATE_SNAPSHOT_TABLE_SQL);
    }

    async loadRoom(roomId) {
        const result = await this.pool.query(
            "SELECT objects FROM whiteboard_snapshots WHERE room_id = $1",
            [roomId],
        );

        if (result.rowCount === 0) return [];
        return Array.isArray(result.rows[0].objects) ? result.rows[0].objects : [];
    }

    async saveRoom(roomId, objects) {
        await this.pool.query(
            `
                INSERT INTO whiteboard_snapshots (room_id, objects, updated_at)
                VALUES ($1, $2::jsonb, NOW())
                ON CONFLICT (room_id)
                DO UPDATE SET objects = EXCLUDED.objects, updated_at = NOW()
            `,
            [roomId, JSON.stringify(objects)],
        );
    }

    async close() {
        if (this.ownsPool) await this.pool.end();
    }
}

module.exports = { CREATE_SNAPSHOT_TABLE_SQL, PostgresSnapshotStore };
