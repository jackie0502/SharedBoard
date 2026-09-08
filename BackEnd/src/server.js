const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const { createApp } = require("./app");
const { WhiteboardService } = require("./application/WhiteboardService");
const { PersistenceConfig } = require("./config/PersistenceConfig");
const { PostgresSnapshotStore } = require("./persistence/PostgresSnapshotStore");
const { InMemoryRoomRepository } = require("./repositories/InMemoryRoomRepository");
const { PersistentRoomRepository } = require("./repositories/PersistentRoomRepository");
const { WhiteboardGateway } = require("./socket/WhiteboardGateway");

const createConfiguredRoomRepository = async ({ env = process.env, logger = console } = {}) => {
    const config = PersistenceConfig.fromEnvironment(env);
    if (!config.enabled) {
        logger.log("未設定 DATABASE_URL，使用記憶體 Room State");
        return new InMemoryRoomRepository();
    }

    const snapshotStore = new PostgresSnapshotStore({
        ...config.storeOptions,
        logger,
    });
    const roomRepository = new PersistentRoomRepository(snapshotStore, {
        ...config.repositoryOptions,
        logger,
    });

    try {
        await roomRepository.initialize();
    } catch (error) {
        await roomRepository.close().catch((closeError) => {
            logger.error("PostgreSQL 初始化失敗後，關閉連線池時再次發生錯誤：", closeError);
        });
        throw error;
    }
    logger.log("PostgreSQL Snapshot 持久化已啟用");
    return roomRepository;
};

const createSharedBoardServer = ({
    logger = console,
    roomRepository = new InMemoryRoomRepository(),
} = {}) => {
    const app = createApp();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    const whiteboardService = new WhiteboardService(roomRepository);
    const gateway = new WhiteboardGateway(io, whiteboardService, logger);
    gateway.register();

    return {
        app,
        server,
        io,
        roomRepository,
        whiteboardService,
        async close() {
            await roomRepository.close();
            if (io.httpServer?.listening) {
                await new Promise((resolve) => io.close(resolve));
            }
        },
    };
};

const startServer = async (port = process.env.PORT || 3000, options = {}) => {
    const logger = options.logger ?? console;
    const roomRepository = options.roomRepository ?? await createConfiguredRoomRepository({
        env: options.env ?? process.env,
        logger,
    });
    const sharedBoardServer = createSharedBoardServer({ logger, roomRepository });

    try {
        await new Promise((resolve, reject) => {
            sharedBoardServer.server.once("error", reject);
            sharedBoardServer.server.listen(port, () => {
                sharedBoardServer.server.off("error", reject);
                resolve();
            });
        });
    } catch (error) {
        await sharedBoardServer.close().catch((closeError) => {
            logger.error("伺服器啟動失敗後，釋放資源時再次發生錯誤：", closeError);
        });
        throw error;
    }

    const actualPort = sharedBoardServer.server.address().port;
    logger.log(`Server is running at http://localhost:${actualPort}`);
    return sharedBoardServer;
};

if (require.main === module) {
    startServer()
        .then((sharedBoardServer) => {
            let closing = false;
            const shutdown = async (signal) => {
                if (closing) return;
                closing = true;
                console.log(`收到 ${signal}，正在保存 Snapshot 並關閉伺服器…`);
                try {
                    await sharedBoardServer.close();
                    process.exit(0);
                } catch (error) {
                    console.error("關閉伺服器失敗：", error);
                    process.exit(1);
                }
            };

            process.on("SIGINT", () => shutdown("SIGINT"));
            process.on("SIGTERM", () => shutdown("SIGTERM"));
        })
        .catch((error) => {
            console.error("啟動伺服器失敗：", error);
            process.exit(1);
        });
}

module.exports = {
    createConfiguredRoomRepository,
    createSharedBoardServer,
    startServer,
};
