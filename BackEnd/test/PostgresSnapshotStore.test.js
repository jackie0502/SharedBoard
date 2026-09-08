const test = require("node:test");
const assert = require("node:assert/strict");

const { PostgresSnapshotStore } = require("../src/persistence/PostgresSnapshotStore");

test("PostgresSnapshotStore 會建立資料表並讀寫 JSONB Snapshot", async () => {
    const calls = [];
    const expectedObjects = [{ id: "rect-1", type: "rect", x: 1, y: 2, version: 1 }];
    const pool = {
        async query(sql, values) {
            calls.push({ sql, values });
            if (sql.includes("SELECT objects")) {
                return { rowCount: 1, rows: [{ objects: expectedObjects }] };
            }
            return { rowCount: 1, rows: [] };
        },
    };
    const store = new PostgresSnapshotStore({ pool });

    await store.initialize();
    const loaded = await store.loadRoom("room-1");
    await store.saveRoom("room-1", expectedObjects);
    await store.close();

    assert.match(calls[0].sql, /CREATE TABLE IF NOT EXISTS whiteboard_snapshots/);
    assert.deepEqual(loaded, expectedObjects);
    assert.deepEqual(calls[1].values, ["room-1"]);
    assert.deepEqual(calls[2].values, ["room-1", JSON.stringify(expectedObjects)]);
});
