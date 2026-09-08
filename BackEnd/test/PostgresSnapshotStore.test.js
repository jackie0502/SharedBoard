const test = require("node:test");
const assert = require("node:assert/strict");

const { PostgresSnapshotStore } = require("../src/persistence/PostgresSnapshotStore");
const { SnapshotConflictError } = require("../src/persistence/SnapshotConflictError");

test("PostgresSnapshotStore 會建立資料表並讀寫 JSONB Snapshot", async () => {
    const calls = [];
    const expectedObjects = [{ id: "rect-1", type: "rect", x: 1, y: 2, version: 1 }];
    const pool = {
        async query(sql, values) {
            calls.push({ sql, values });
            if (sql.includes("SELECT objects,")) {
                return {
                    rowCount: 1,
                    rows: [{ objects: expectedObjects, revision: "3" }],
                };
            }
            if (sql.includes("RETURNING revision")) {
                return { rowCount: 1, rows: [{ revision: "4" }] };
            }
            return { rowCount: 1, rows: [] };
        },
    };
    const store = new PostgresSnapshotStore({ pool });

    await store.initialize();
    const loaded = await store.loadRoom("room-1");
    const savedRevision = await store.saveRoom("room-1", expectedObjects, 3);
    await store.close();

    assert.match(calls[0].sql, /CREATE TABLE IF NOT EXISTS whiteboard_snapshots/);
    assert.match(calls[1].sql, /ADD COLUMN IF NOT EXISTS revision/);
    assert.deepEqual(loaded, { objects: expectedObjects, revision: 3 });
    assert.equal(savedRevision, 4);
    assert.deepEqual(calls[2].values, ["room-1"]);
    assert.deepEqual(calls[3].values, [
        "room-1",
        JSON.stringify(expectedObjects),
        3,
    ]);
});

test("PostgresSnapshotStore 會拒絕用舊 revision 覆蓋 Snapshot", async () => {
    const pool = {
        async query() {
            return { rowCount: 0, rows: [] };
        },
    };
    const store = new PostgresSnapshotStore({ pool });

    await assert.rejects(
        store.saveRoom("room-1", [], 2),
        SnapshotConflictError,
    );
});
