const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const { createApp } = require("./app");
const { WhiteboardService } = require("./application/WhiteboardService");
const { InMemoryRoomRepository } = require("./repositories/InMemoryRoomRepository");
const { WhiteboardGateway } = require("./socket/WhiteboardGateway");

const createSharedBoardServer = ({ logger = console } = {}) => {
    const app = createApp();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    const roomRepository = new InMemoryRoomRepository();
    const whiteboardService = new WhiteboardService(roomRepository);
    const gateway = new WhiteboardGateway(io, whiteboardService, logger);
    gateway.register();

    return {
        app,
        server,
        io,
        roomRepository,
        whiteboardService,
    };
};

const startServer = (port = process.env.PORT || 3000, options) => {
    const sharedBoardServer = createSharedBoardServer(options);
    sharedBoardServer.server.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
    return sharedBoardServer;
};

if (require.main === module) {
    startServer();
}

module.exports = { createSharedBoardServer, startServer };
