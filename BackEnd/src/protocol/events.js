const SOCKET_EVENTS = Object.freeze({
    CONNECTION: "connection",
    DISCONNECT: "disconnect",
    ROOM_JOIN: "room:join",
    USER_JOINED: "user:joined",
    USER_LEFT: "user:left",
    ROOM_USERS: "room:users",
    CURSOR_MOVE: "cursor:move",
    CURSOR_HIDE: "cursor:hide",
    INTERACTION_UPDATE: "interaction:update",
    INTERACTION_HIDE: "interaction:hide",
    OBJECT_CREATE: "object:create",
    OBJECT_UPDATE: "object:update",
    OBJECT_DELETE: "object:delete",
});

module.exports = { SOCKET_EVENTS };
