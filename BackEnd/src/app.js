const path = require("path");
const cors = require("cors");
const express = require("express");
const { createRoomRouter } = require("./http/createRoomRouter");

const createApp = ({ roomCatalogService } = {}) => {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, "..", "public")));

    if (roomCatalogService) {
        app.use("/api/rooms", createRoomRouter(roomCatalogService));
    }

    app.get("/", (_request, response) => {
        response.json({ message: "SharedBoard backend is running" });
    });

    return app;
};

module.exports = { createApp };
