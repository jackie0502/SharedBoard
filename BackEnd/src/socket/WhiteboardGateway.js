const { DomainError } = require("../domain/DomainError");
const { SOCKET_EVENTS } = require("../protocol/events");

const getResponder = (callback) =>
    typeof callback === "function" ? callback : () => {};

class WhiteboardGateway {
    constructor(io, whiteboardService, logger = console) {
        this.io = io;
        this.whiteboardService = whiteboardService;
        this.logger = logger;
    }

    register() {
        this.io.on(SOCKET_EVENTS.CONNECTION, (socket) => this.handleConnection(socket));
    }

    handleConnection(socket) {
        this.logger.log(`使用者已連線：${socket.id}`);

        socket.on(SOCKET_EVENTS.ROOM_JOIN, (data, callback) =>
            this.handleRoomJoin(socket, data, callback));
        socket.on(SOCKET_EVENTS.OBJECT_CREATE, (data, callback) =>
            this.handleObjectCreate(socket, data, callback));
        socket.on(SOCKET_EVENTS.OBJECT_UPDATE, (data, callback) =>
            this.handleObjectUpdate(socket, data, callback));
        socket.on(SOCKET_EVENTS.OBJECT_DELETE, (data, callback) =>
            this.handleObjectDelete(socket, data, callback));
        socket.on(SOCKET_EVENTS.DISCONNECT, () => this.handleDisconnect(socket));
    }

    handleRoomJoin(socket, data, callback) {
        const respond = getResponder(callback);
        const roomId = data?.roomId?.trim();
        const userName = data?.userName?.trim();

        if (!roomId || !userName) {
            respond({
                success: false,
                message: "roomId 和 userName 都不能是空白",
            });
            return;
        }

        const previousRoomId = socket.data.roomId;
        const previousUserName = socket.data.userName;
        const isSameMembership = previousRoomId === roomId && previousUserName === userName;

        if (isSameMembership) {
            const objects = this.whiteboardService.getSnapshot(roomId);
            respond({
                success: true,
                roomId,
                socketId: socket.id,
                objects,
                message: `已在房間 ${roomId}`,
            });
            return;
        }

        if (previousRoomId) {
            socket.leave(previousRoomId);
            socket.to(previousRoomId).emit(SOCKET_EVENTS.USER_LEFT, {
                socketId: socket.id,
                userName: previousUserName,
            });
        }

        socket.data.roomId = roomId;
        socket.data.userName = userName;
        socket.join(roomId);

        this.logger.log(`${userName} 加入房間：${roomId}`);
        socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
            socketId: socket.id,
            userName,
        });

        const objects = this.whiteboardService.getSnapshot(roomId);
        respond({
            success: true,
            roomId,
            socketId: socket.id,
            objects,
            message: `成功加入房間 ${roomId}，載入 ${objects.length} 個物件`,
        });
    }

    handleObjectCreate(socket, data, callback) {
        const respond = getResponder(callback);
        const membership = this.getMembership(socket, respond);
        if (!membership) return;

        try {
            const object = this.whiteboardService.createObject(
                membership.roomId,
                data?.object,
            );

            socket.to(membership.roomId).emit(SOCKET_EVENTS.OBJECT_CREATE, {
                object,
                userName: membership.userName,
            });
            this.logger.log(
                `${membership.userName} 在房間 ${membership.roomId} 建立物件：${object.id}`,
            );
            respond({ success: true, message: "物件已同步" });
        } catch (error) {
            this.respondWithError(error, respond);
        }
    }

    handleObjectUpdate(socket, data, callback) {
        const respond = getResponder(callback);
        const membership = this.getMembership(socket, respond);
        if (!membership) return;

        try {
            const object = this.whiteboardService.updateObject(
                membership.roomId,
                data?.object,
            );

            socket.to(membership.roomId).emit(SOCKET_EVENTS.OBJECT_UPDATE, {
                object,
                userName: membership.userName,
            });
            this.logger.log(
                `${membership.userName} 在房間 ${membership.roomId} 更新物件：${object.id} v${object.version}`,
            );
            respond({ success: true, message: "物件更新已同步" });
        } catch (error) {
            this.respondWithError(error, respond);
        }
    }

    handleObjectDelete(socket, data, callback) {
        const respond = getResponder(callback);
        const membership = this.getMembership(socket, respond);
        if (!membership) return;

        try {
            this.whiteboardService.deleteObject(
                membership.roomId,
                data?.objectId,
                data?.version,
            );

            socket.to(membership.roomId).emit(SOCKET_EVENTS.OBJECT_DELETE, {
                objectId: data.objectId,
                version: data.version,
                userName: membership.userName,
            });
            this.logger.log(
                `${membership.userName} 在房間 ${membership.roomId} 刪除物件：${data.objectId} v${data.version}`,
            );
            respond({ success: true, message: "物件刪除已同步" });
        } catch (error) {
            this.respondWithError(error, respond);
        }
    }

    handleDisconnect(socket) {
        const { roomId, userName } = socket.data;

        if (roomId && userName) {
            socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
                socketId: socket.id,
                userName,
            });
            this.logger.log(`${userName} 離開房間：${roomId}`);
        }

        this.logger.log(`使用者已離線：${socket.id}`);
    }

    getMembership(socket, respond) {
        const { roomId, userName } = socket.data;
        if (roomId && userName) return { roomId, userName };

        respond({ success: false, message: "請先加入房間" });
        return null;
    }

    respondWithError(error, respond) {
        if (error instanceof DomainError) {
            respond({ success: false, message: error.message, ...error.details });
            return;
        }

        this.logger.error("處理白板事件時發生未預期錯誤：", error);
        respond({ success: false, message: "伺服器發生未預期錯誤" });
    }
}

module.exports = { WhiteboardGateway };
