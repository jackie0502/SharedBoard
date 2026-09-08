const test = require("node:test");
const assert = require("node:assert/strict");

const { createSharedBoardServer } = require("../src/server");

test("Room REST API 提供完整 CRUD", async () => {
    const sharedBoardServer = createSharedBoardServer({
        logger: { log: () => {}, error: () => {} },
    });
    await new Promise((resolve) => sharedBoardServer.server.listen(0, resolve));
    const baseUrl = `http://localhost:${sharedBoardServer.server.address().port}/api/rooms`;

    try {
        let response = await fetch(baseUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: "api-room", name: "API Room" }),
        });
        assert.equal(response.status, 201);
        assert.equal((await response.json()).room.name, "API Room");

        response = await fetch(baseUrl);
        assert.equal(response.status, 200);
        assert.equal((await response.json()).rooms[0].id, "api-room");

        response = await fetch(`${baseUrl}/api-room`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Renamed Room" }),
        });
        assert.equal((await response.json()).room.name, "Renamed Room");

        response = await fetch(`${baseUrl}/api-room`, { method: "DELETE" });
        assert.equal(response.status, 204);

        response = await fetch(`${baseUrl}/api-room`);
        assert.equal(response.status, 404);
    } finally {
        await sharedBoardServer.close();
    }
});
