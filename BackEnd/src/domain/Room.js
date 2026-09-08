const { DomainError } = require("./DomainError");
const { WhiteboardObjectValidator } = require("./WhiteboardObjectValidator");

class Room {
    #objects = new Map();

    constructor(id) {
        this.id = id;
    }

    getSnapshot() {
        return Array.from(this.#objects.values());
    }

    loadSnapshot(objects) {
        if (!Array.isArray(objects)) {
            throw new DomainError("Snapshot 資料格式不正確");
        }

        const snapshotObjects = new Map();
        for (const object of objects) {
            if (!WhiteboardObjectValidator.isValid(object)) {
                throw new DomainError("Snapshot 包含格式不正確的物件");
            }
            if (snapshotObjects.has(object.id)) {
                throw new DomainError("Snapshot 包含重複的物件 ID");
            }
            snapshotObjects.set(object.id, object);
        }

        this.#objects = snapshotObjects;
    }

    createObject(object) {
        if (!WhiteboardObjectValidator.isValid(object)) {
            throw new DomainError("物件資料格式不正確");
        }

        if (this.#objects.has(object.id)) {
            throw new DomainError("物件 ID 已存在");
        }

        this.#objects.set(object.id, object);
        return object;
    }

    updateObject(object) {
        if (!WhiteboardObjectValidator.isValid(object) || object.version < 2) {
            throw new DomainError("物件更新格式不正確");
        }

        const currentObject = this.#objects.get(object.id);
        if (!currentObject) {
            throw new DomainError("找不到要更新的物件");
        }

        if (object.version <= currentObject.version) {
            throw new DomainError(
                `更新版本過舊，目前版本為 ${currentObject.version}`,
                { currentObject },
            );
        }

        this.#objects.set(object.id, object);
        return object;
    }

    deleteObject(objectId, version) {
        if (!WhiteboardObjectValidator.isValidDelete(objectId, version)) {
            throw new DomainError("物件刪除格式不正確");
        }

        const currentObject = this.#objects.get(objectId);
        if (!currentObject) {
            throw new DomainError("找不到要刪除的物件");
        }

        if (version <= currentObject.version) {
            throw new DomainError(
                `刪除版本過舊，目前版本為 ${currentObject.version}`,
                { currentObject },
            );
        }

        this.#objects.delete(objectId);
        return currentObject;
    }
}

module.exports = { Room };
