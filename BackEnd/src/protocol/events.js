const SOCKET_EVENTS = Object.freeze({
    CONNECTION: "connection",
    DISCONNECT: "disconnect",
    ROOM_JOIN: "room:join",
    USER_JOINED: "user:joined",
    USER_LEFT: "user:left",
    OBJECT_CREATE: "object:create",
    OBJECT_UPDATE: "object:update",
    OBJECT_DELETE: "object:delete",
});

module.exports = { SOCKET_EVENTS };
