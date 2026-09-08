CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
    room_id TEXT PRIMARY KEY,
    objects JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
