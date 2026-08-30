const { DomainError } = require("../domain/DomainError");
const { SOCKET_EVENTS } = require("../protocol/events");

const getResponder = (callback) =>
    typeof callback === "function" ? callback : () => {};

class WhiteboardGateway {
    constructor(io, whiteboardService, logger = console) {
        this.io = io;
        this.whiteboardService = whiteboardService;
        this.logger = logger;
        this.membersByRoom = new Map();
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
        socket.on(SOCKET_EVENTS.CURSOR_MOVE, (data, callback) =>
            this.handleCursorMove(socket, data, callback));
        socket.on(SOCKET_EVENTS.CURSOR_HIDE, () => this.handleCursorHide(socket));
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
            this.addRoomMember(roomId, socket.id, userName);
            respond({
                success: true,
                roomId,
                socketId: socket.id,
                objects,
                users: this.getRoomMembers(roomId),
                message: `已在房間 ${roomId}`,
            });
            return;
        }

        if (previousRoomId) {
            socket.to(previousRoomId).emit(SOCKET_EVENTS.CURSOR_HIDE, {
                socketId: socket.id,
            });
            socket.leave(previousRoomId);
            this.removeRoomMember(previousRoomId, socket.id);
            socket.to(previousRoomId).emit(SOCKET_EVENTS.USER_LEFT, {
                socketId: socket.id,
                userName: previousUserName,
            });
            this.emitRoomUsers(previousRoomId);
        }

        socket.data.roomId = roomId;
        socket.data.userName = userName;
        socket.join(roomId);
        this.addRoomMember(roomId, socket.id, userName);

        this.logger.log(`${userName} 加入房間：${roomId}`);
        socket.to(roomId).emit(SOCKET_EVENTS.USER_JOINED, {
            socketId: socket.id,
            userName,
        });
        this.emitRoomUsers(roomId);

        const objects = this.whiteboardService.getSnapshot(roomId);
        respond({
            success: true,
            roomId,
            socketId: socket.id,
            objects,
            users: this.getRoomMembers(roomId),
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

    handleCursorMove(socket, data, callback) {
        const respond = getResponder(callback);
        const membership = this.getMembership(socket, respond);
        if (!membership) return;

        const x = data?.x;
        const y = data?.y;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            respond({ success: false, message: "游標座標格式不正確" });
            return;
        }

        socket.to(membership.roomId).emit(SOCKET_EVENTS.CURSOR_MOVE, {
            socketId: socket.id,
            userName: membership.userName,
            x,
            y,
        });
        respond({ success: true });
    }

    handleCursorHide(socket) {
        const { roomId } = socket.data;
        if (!roomId) return;

        socket.to(roomId).emit(SOCKET_EVENTS.CURSOR_HIDE, {
            socketId: socket.id,
        });
    }

    handleDisconnect(socket) {
        const { roomId, userName } = socket.data;

        if (roomId && userName) {
            this.removeRoomMember(roomId, socket.id);
            socket.to(roomId).emit(SOCKET_EVENTS.CURSOR_HIDE, {
                socketId: socket.id,
            });
            socket.to(roomId).emit(SOCKET_EVENTS.USER_LEFT, {
                socketId: socket.id,
                userName,
            });
            this.emitRoomUsers(roomId);
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

    addRoomMember(roomId, socketId, userName) {
        const members = this.membersByRoom.get(roomId) ?? new Map();
        members.set(socketId, userName);
        this.membersByRoom.set(roomId, members);
    }

    removeRoomMember(roomId, socketId) {
        const members = this.membersByRoom.get(roomId);
        if (!members) return;

        members.delete(socketId);
        if (members.size === 0) this.membersByRoom.delete(roomId);
    }

    getRoomMembers(roomId) {
        const members = this.membersByRoom.get(roomId) ?? new Map();
        return Array.from(members, ([socketId, userName]) => ({ socketId, userName }));
    }

    emitRoomUsers(roomId) {
        this.io.to(roomId).emit(SOCKET_EVENTS.ROOM_USERS, {
            roomId,
            users: this.getRoomMembers(roomId),
        });
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
