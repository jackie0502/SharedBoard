const { Pool } = require("pg");

const CREATE_ROOMS_TABLE_SQL = `
    CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
`;

const IMPORT_SNAPSHOT_ROOMS_SQL = `
    INSERT INTO rooms (id, name, created_at, updated_at)
    SELECT room_id, room_id, updated_at, updated_at
    FROM whiteboard_snapshots
    ON CONFLICT (id) DO NOTHING
`;

const ADD_SNAPSHOT_ROOM_FOREIGN_KEY_SQL = `
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'whiteboard_snapshots_room_id_fkey'
              AND conrelid = 'whiteboard_snapshots'::regclass
        ) THEN
            ALTER TABLE whiteboard_snapshots
            ADD CONSTRAINT whiteboard_snapshots_room_id_fkey
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
        END IF;
    END
    $$
`;

const mapRoom = (row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
});

class PostgresRoomCatalogRepository {
    constructor({
        connectionString,
        ssl = false,
        connectionTimeoutMillis = 5000,
        pool,
        logger = console,
    } = {}) {
        if (!pool && !connectionString) {
            throw new Error("PostgresRoomCatalogRepository 需要 connectionString 或 pool");
        }
        this.ownsPool = !pool;
        this.logger = logger;
        this.pool = pool ?? new Pool({
            connectionString,
            ssl: ssl ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis,
        });
        this.pool.on?.("error", (error) => {
            this.logger.error("Room Catalog PostgreSQL 連線池錯誤：", error);
        });
    }

    async initialize() {
        await this.pool.query(CREATE_ROOMS_TABLE_SQL);
        await this.pool.query(IMPORT_SNAPSHOT_ROOMS_SQL);
        await this.pool.query(ADD_SNAPSHOT_ROOM_FOREIGN_KEY_SQL);
    }

    async list() {
        const result = await this.pool.query(
            "SELECT id, name, created_at, updated_at FROM rooms ORDER BY updated_at DESC, id ASC",
        );
        return result.rows.map(mapRoom);
    }

    async findById(roomId) {
        const result = await this.pool.query(
            "SELECT id, name, created_at, updated_at FROM rooms WHERE id = $1",
            [roomId],
        );
        return result.rowCount === 0 ? null : mapRoom(result.rows[0]);
    }

    async create(roomId, name) {
        const result = await this.pool.query(
            `INSERT INTO rooms (id, name)
             VALUES ($1, $2)
             ON CONFLICT (id) DO NOTHING
             RETURNING id, name, created_at, updated_at`,
            [roomId, name],
        );
        return result.rowCount === 0 ? null : mapRoom(result.rows[0]);
    }

    async ensure(roomId, name) {
        const result = await this.pool.query(
            `INSERT INTO rooms (id, name)
             VALUES ($1, $2)
             ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
             RETURNING id, name, created_at, updated_at`,
            [roomId, name],
        );
        return mapRoom(result.rows[0]);
    }

    async update(roomId, name) {
        const result = await this.pool.query(
            `UPDATE rooms SET name = $2, updated_at = NOW()
             WHERE id = $1
             RETURNING id, name, created_at, updated_at`,
            [roomId, name],
        );
        return result.rowCount === 0 ? null : mapRoom(result.rows[0]);
    }

    async delete(roomId) {
        const result = await this.pool.query(
            "DELETE FROM rooms WHERE id = $1",
            [roomId],
        );
        return result.rowCount > 0;
    }

    async close() {
        if (this.ownsPool) await this.pool.end();
    }
}

module.exports = {
    ADD_SNAPSHOT_ROOM_FOREIGN_KEY_SQL,
    CREATE_ROOMS_TABLE_SQL,
    IMPORT_SNAPSHOT_ROOMS_SQL,
    PostgresRoomCatalogRepository,
};
