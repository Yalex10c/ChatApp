const http = require("http");
const io = require("socket.io");
const ngrok = require("ngrok");

const Port = 3000;
const messages = [];
const users = {};

const server = http.createServer();
server.listen(Port, async () => {
    console.log(` Server running on port ${Port}`);

    try {
        await ngrok.kill(); // Mata cualquier instancia previa
        const url = await ngrok.connect({ addr: 3000, authtoken: "2sk2CwhDhrOwwv4kecHFfguOkwj_w2vnHTj7fgK8RDAoePwB" });
        console.log(` Public URL: ${url}`);
    } catch (error) {
        console.error("Error starting ngrok", error);
    }
});

const socketServer = io(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

socketServer.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.emit("messageHistory", messages);

    socket.on("setUsername", (username) => {
        users[socket.id] = username;
        console.log(`User assigned: ${username} (Socket ID: ${socket.id})`);
        let messageservor = `User connected: ${users[socket.id] || "Anonymous"}`;
        messages.push(messageservor);
        socketServer.emit("message", messageservor);
    });

    socket.on("message", (data) => {
        const username = users[socket.id] || "Anonymous";
        let messageInput = `${username} says: ${data}`;
        messages.push(messageInput);
        socketServer.emit("message", messageInput);
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${users[socket.id] || "Anonymous"} (${socket.id})`);
        let messageserver = `User disconnected: ${users[socket.id] || "Anonymous"}`;
        messages.push(messageserver);
        socketServer.emit("message", messageserver);
        delete users[socket.id];
    });
});