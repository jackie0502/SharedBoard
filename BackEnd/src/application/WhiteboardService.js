class WhiteboardService {
    constructor(roomRepository) {
        this.roomRepository = roomRepository;
    }

    getSnapshot(roomId) {
        return this.roomRepository.getOrCreate(roomId).getSnapshot();
    }

    createObject(roomId, object) {
        return this.roomRepository.getOrCreate(roomId).createObject(object);
    }

    updateObject(roomId, object) {
        return this.roomRepository.getOrCreate(roomId).updateObject(object);
    }

    deleteObject(roomId, objectId, version) {
        return this.roomRepository.getOrCreate(roomId).deleteObject(objectId, version);
    }
}

module.exports = { WhiteboardService };
