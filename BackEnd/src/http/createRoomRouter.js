const express = require("express");
const { DomainError } = require("../domain/DomainError");

const asyncHandler = (handler) => (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
};

const createRoomRouter = (roomCatalogService) => {
    const router = express.Router();

    router.get("/", asyncHandler(async (_request, response) => {
        response.json({ rooms: await roomCatalogService.listRooms() });
    }));

    router.get("/:roomId", asyncHandler(async (request, response) => {
        response.json({ room: await roomCatalogService.getRoom(request.params.roomId) });
    }));

    router.post("/", asyncHandler(async (request, response) => {
        const room = await roomCatalogService.createRoom(request.body);
        response.status(201).json({ room });
    }));

    router.patch("/:roomId", asyncHandler(async (request, response) => {
        const room = await roomCatalogService.renameRoom(
            request.params.roomId,
            request.body?.name,
        );
        response.json({ room });
    }));

    router.delete("/:roomId", asyncHandler(async (request, response) => {
        await roomCatalogService.deleteRoom(request.params.roomId);
        response.status(204).end();
    }));

    router.use((error, _request, response, _next) => {
        if (error instanceof DomainError) {
            response.status(error.details.status ?? 400).json({
                message: error.message,
                code: error.details.code,
            });
            return;
        }
        response.status(500).json({ message: "Room API 發生未預期錯誤" });
    });

    return router;
};

module.exports = { createRoomRouter };
