class WhiteboardService {
    constructor(roomRepository) {
        this.roomRepository = roomRepository;
    }

    async getSnapshot(roomId) {
        const room = await this.roomRepository.getOrCreate(roomId);
        return room.getSnapshot();
    }

    async createObject(roomId, object) {
        const room = await this.roomRepository.getOrCreate(roomId);
        const createdObject = room.createObject(object);
        this.roomRepository.markDirty(roomId);
        return createdObject;
    }

    async updateObject(roomId, object) {
        const room = await this.roomRepository.getOrCreate(roomId);
        const updatedObject = room.updateObject(object);
        this.roomRepository.markDirty(roomId);
        return updatedObject;
    }

    async deleteObject(roomId, objectId, version) {
        const room = await this.roomRepository.getOrCreate(roomId);
        const deletedObject = room.deleteObject(objectId, version);
        this.roomRepository.markDirty(roomId);
        return deletedObject;
    }
}

module.exports = { WhiteboardService };
