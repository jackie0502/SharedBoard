const { Room } = require("../domain/Room");

class InMemoryRoomRepository {
    #rooms = new Map();

    getOrCreate(roomId) {
        if (!this.#rooms.has(roomId)) {
            this.#rooms.set(roomId, new Room(roomId));
        }

        return this.#rooms.get(roomId);
    }

    find(roomId) {
        return this.#rooms.get(roomId) ?? null;
    }

    delete(roomId) {
        return this.#rooms.delete(roomId);
    }
}

module.exports = { InMemoryRoomRepository };
