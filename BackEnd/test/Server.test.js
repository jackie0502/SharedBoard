const http = require("http");
const test = require("node:test");
const assert = require("node:assert/strict");

const { startServer } = require("../src/server");

test("HTTP 監聽失敗時會關閉 Room Repository", async () => {
    const occupiedServer = http.createServer();
    await new Promise((resolve) => occupiedServer.listen(0, resolve));
    const port = occupiedServer.address().port;
    let closeCalls = 0;
    const roomRepository = {
        async close() { closeCalls += 1; },
        getOrCreate() { throw new Error("not used"); },
    };
    const logger = { log: () => {}, error: () => {} };

    try {
        await assert.rejects(
            startServer(port, { roomRepository, logger }),
            (error) => error.code === "EADDRINUSE",
        );
        assert.equal(closeCalls, 1);
    } finally {
        await new Promise((resolve) => occupiedServer.close(resolve));
    }
});
