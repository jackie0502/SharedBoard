const { DomainError } = require("./DomainError");

const ROOM_ID_PATTERN = /^[\p{L}\p{N}_-]+$/u;

class RoomMetadata {
    static normalizeId(value) {
        const id = typeof value === "string" ? value.trim() : "";
        if (!id || id.length > 50 || !ROOM_ID_PATTERN.test(id)) {
            throw new DomainError(
                "Room ID 必須是 1 到 50 個字元，且只能包含文字、數字、底線或連字號",
                { status: 400, code: "INVALID_ROOM_ID" },
            );
        }
        return id;
    }

    static normalizeName(value, fallbackId) {
        const name = typeof value === "string" ? value.trim() : "";
        const normalized = name || fallbackId;
        if (!normalized || normalized.length > 80) {
            throw new DomainError("Room 名稱必須是 1 到 80 個字元", {
                status: 400,
                code: "INVALID_ROOM_NAME",
            });
        }
        return normalized;
    }
}

module.exports = { RoomMetadata };
