CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO rooms (id, name, created_at, updated_at)
SELECT room_id, room_id, updated_at, updated_at
FROM whiteboard_snapshots
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'whiteboard_snapshots_room_id_fkey'
          AND conrelid = 'whiteboard_snapshots'::regclass
    ) THEN
        ALTER TABLE whiteboard_snapshots
        ADD CONSTRAINT whiteboard_snapshots_room_id_fkey
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
    END IF;
END
$$;
