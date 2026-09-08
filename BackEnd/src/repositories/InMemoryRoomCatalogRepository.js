class InMemoryRoomCatalogRepository {
    constructor() {
        this.rooms = new Map();
    }

    async initialize() {}

    async list() {
        return Array.from(this.rooms.values())
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((room) => structuredClone(room));
    }

    async findById(roomId) {
        const room = this.rooms.get(roomId);
        return room ? structuredClone(room) : null;
    }

    async create(roomId, name) {
        if (this.rooms.has(roomId)) return null;
        const now = new Date().toISOString();
        const room = { id: roomId, name, createdAt: now, updatedAt: now };
        this.rooms.set(roomId, room);
        return structuredClone(room);
    }

    async ensure(roomId, name) {
        const existing = this.rooms.get(roomId);
        if (existing) {
            existing.updatedAt = new Date().toISOString();
            return structuredClone(existing);
        }
        return this.create(roomId, name);
    }

    async update(roomId, name) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        room.name = name;
        room.updatedAt = new Date().toISOString();
        return structuredClone(room);
    }

    async delete(roomId) {
        return this.rooms.delete(roomId);
    }

    async close() {}
}

module.exports = { InMemoryRoomCatalogRepository };
