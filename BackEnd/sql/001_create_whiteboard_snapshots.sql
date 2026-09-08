CREATE TABLE IF NOT EXISTS whiteboard_snapshots (
    room_id TEXT PRIMARY KEY,
    objects JSONB NOT NULL DEFAULT '[]'::jsonb,
    revision BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
