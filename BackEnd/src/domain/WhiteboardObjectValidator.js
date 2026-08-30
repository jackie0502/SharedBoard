const ALLOWED_OBJECT_TYPES = new Set(["rect", "circle", "text", "stroke", "eraser"]);

class WhiteboardObjectValidator {
    static isValid(object) {
        return Boolean(
            object &&
            typeof object.id === "string" &&
            object.id.length > 0 &&
            object.id.length <= 100 &&
            ALLOWED_OBJECT_TYPES.has(object.type) &&
            Number.isFinite(object.x) &&
            Number.isFinite(object.y) &&
            Number.isInteger(object.version) &&
            object.version >= 1
        );
    }

    static isValidDelete(objectId, version) {
        return (
            typeof objectId === "string" &&
            objectId.length > 0 &&
            objectId.length <= 100 &&
            Number.isInteger(version) &&
            version >= 2
        );
    }
}

module.exports = { WhiteboardObjectValidator };
