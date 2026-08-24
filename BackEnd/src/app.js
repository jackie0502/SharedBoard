const path = require("path");
const cors = require("cors");
const express = require("express");

const createApp = () => {
    const app = express();

    app.use(cors());
    app.use(express.json());
    app.use(express.static(path.join(__dirname, "..", "public")));

    app.get("/", (_request, response) => {
        response.json({ message: "SharedBoard backend is running" });
    });

    return app;
};

module.exports = { createApp };
