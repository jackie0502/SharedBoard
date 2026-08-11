const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// 建立 Socket.IO Server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.get("/", (req, res) => {
    res.json({
        message: "SharedBoard backend is running",
    });
});

// 有使用者連上 Socket.IO
io.on("connection", (socket) => {
    console.log(`使用者已連線：${socket.id}`);

    socket.on("room:join", (data, callback) => {
        const roomId = data?.roomId?.trim();
        const userName = data?.userName?.trim();

        if (!roomId || !userName) {
            callback({
                success: false,
                message: "roomId 和 userName 都不能是空白",
            });

            return;
        }

        // 將資料保存於這次 Socket 連線
        socket.data.roomId = roomId;
        socket.data.userName = userName;

        // 加入 Socket.IO Room
        socket.join(roomId);

        console.log(`${userName} 加入房間：${roomId}`);

        // 通知同房間的其他使用者
        socket.to(roomId).emit("user:joined", {
            socketId: socket.id,
            userName,
        });

        // 回覆發出 room:join 的使用者
        callback({
            success: true,
            roomId,
            socketId: socket.id,
            message: `成功加入房間 ${roomId}`,
        });
    });

    socket.on("disconnect", () => {
        const { roomId, userName } = socket.data;

        if (roomId && userName) {
            socket.to(roomId).emit("user:left", {
                socketId: socket.id,
                userName,
            });

            console.log(`${userName} 離開房間：${roomId}`);
        }

        console.log(`使用者已離線：${socket.id}`);
    });
});

// 注意：這裡改成 server.listen
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});