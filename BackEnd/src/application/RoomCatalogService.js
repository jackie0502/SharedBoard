const { randomUUID } = require("crypto");
const { DomainError } = require("../domain/DomainError");
const { RoomMetadata } = require("../domain/RoomMetadata");

class RoomCatalogService {
    constructor(roomCatalogRepository, { whiteboardRoomRepository } = {}) {
        this.roomCatalogRepository = roomCatalogRepository;
        this.whiteboardRoomRepository = whiteboardRoomRepository;
        this.isRoomActive = () => false;
    }

    setRoomActiveChecker(checker) {
        this.isRoomActive = checker;
    }

    async listRooms() {
        return this.roomCatalogRepository.list();
    }

    async getRoom(roomId) {
        const id = RoomMetadata.normalizeId(roomId);
        const room = await this.roomCatalogRepository.findById(id);
        if (!room) this.#throwNotFound(id);
        return room;
    }

    async createRoom({ id: requestedId, name: requestedName } = {}) {
        const generatedId = `room-${randomUUID().slice(0, 8)}`;
        const id = RoomMetadata.normalizeId(requestedId || generatedId);
        const name = RoomMetadata.normalizeName(requestedName, id);
        const room = await this.roomCatalogRepository.create(id, name);
        if (!room) {
            throw new DomainError(`Room ${id} 已存在`, {
                status: 409,
                code: "ROOM_ALREADY_EXISTS",
            });
        }
        return room;
    }

    async ensureRoom(roomId) {
        const id = RoomMetadata.normalizeId(roomId);
        return this.roomCatalogRepository.ensure(id, id);
    }

    async renameRoom(roomId, name) {
        const id = RoomMetadata.normalizeId(roomId);
        const normalizedName = RoomMetadata.normalizeName(name, "");
        const room = await this.roomCatalogRepository.update(id, normalizedName);
        if (!room) this.#throwNotFound(id);
        return room;
    }

    async deleteRoom(roomId) {
        const id = RoomMetadata.normalizeId(roomId);
        if (this.isRoomActive(id)) {
            throw new DomainError("仍有使用者在此 Room，無法刪除", {
                status: 409,
                code: "ROOM_IN_USE",
            });
        }

        await this.whiteboardRoomRepository?.flush?.(id);
        const deleted = await this.roomCatalogRepository.delete(id);
        if (!deleted) this.#throwNotFound(id);
        await this.whiteboardRoomRepository?.discard?.(id);
    }

    #throwNotFound(roomId) {
        throw new DomainError(`找不到 Room ${roomId}`, {
            status: 404,
            code: "ROOM_NOT_FOUND",
        });
    }
}

module.exports = { RoomCatalogService };
