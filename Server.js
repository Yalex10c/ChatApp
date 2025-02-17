const http = require("http");
const io = require("socket.io"); //Almaceno las variables del npm
const ngrok = require("ngrok");
const mongoose= require("mongoose")
const user = require("./models/users.model")
const chat = require("./models/chats.model")

const connect = async ()=>{
    console.log("Intentando conectar mongoDB")
    try{
        await mongoose.connect ("mongodb://localhost:27017/ChatApp")
        if(mongoose.connection.readyState === 1){console.log("MongoDB conectado")}else{console.log("MongoDB no se conecto")}

    }catch (error) {
        console.log("Error al conectar mongoDB:", error.message)
    }
}
connect()
const saveuser = async(data,socketid)=>{
    try { 
        const usermodel = new user({
            username:data.username,profilephoto:data.profilephoto,
            socketid:socketid
        })
        const saveduser = await usermodel.save()
        return saveduser
        
    } catch (error) { console.log ("Error al guardar usuario",error)
        
    }

}

const savemessage = async (user, message, data) => {
    try { 
        const now = new Date();
        let imagebase64 = "";

        // Verificar si data.image existe antes de procesarlo
        if (data && data.image) {
            imagebase64 = data.image}
            const chatmodel = new chat({
            media: imagebase64, // Guardar la ruta de la imagen en la BD
            namechat: "Chatsu",
            user: user._id,
            message: message,
            timestamp: now
        });
        const newMessage = await chatmodel.save();
        return newMessage;
        
        // Crear y guardar el mensaje en MongoDB
    
    } catch (error) {
        console.error("❌ Error al guardar el mensaje:", error);
    }
};

const deleteuser = async(socketid)=>{ 
    try { 
        await user.deleteOne({socketid:socketid})

} catch (error) { console.log("Error al eliminar el usuario",error)
    
}

}

const getuser = async(socketid)=>{
    try {
        const userfind = await user.findOne({
            socketid:socketid
        })
        return userfind
    } catch (error) {
        console.log("Error al encontrar al usuario", error)
    }
}

const getmessages = async()=>{
    try {
        const messages = await chat.find().populate("user", "username profilephoto").sort({timestamp:1});
        console.log (messages)
        return messages
    } catch (error) {
        console.log ("Error al obtener mensajes",error)
    }
}

const Port = 3000;
const users = {};

const server = http.createServer(); //declaro una variable para la creación del server 
server.listen(Port, async () => { //async función asincrona, porque dentro de una parte de la función, espera que haga 
    console.log(` Server running on port ${Port}`);

    try {
        await ngrok.kill(); // Mata cualquier instancia previa, para comenzar con la linea de abajo
        const url = await ngrok.connect({ addr: 3000, authtoken: "2sk2CwhDhrOwwv4kecHFfguOkwj_w2vnHTj7fgK8RDAoePwB" });
        console.log(` Public URL: ${url}`);
    } catch (error) {
        console.error("Error starting ngrok", error);
    }
});

const socketServer = io(server, {
    cors: {
        origin: "*", //indico al server que reciba solis de todo el mundo
        methods: ["GET", "POST"]
    }
});

socketServer.on("connection", async (socket) => {
    console.log("User connected:", socket.id);

    const history = await chat
    .find()
    .populate("user", "username profilephoto")
    .sort({ timestamp: 1 });
    const formattedHistory = history.map(msg => ({
    _id: msg._id,
    message: msg.message,
    timestamp: msg.timestamp,
    username: msg.user?.username,
    profilephoto: msg.user?.profilephoto,
    media: msg.media,
    reactions:msg.reactions
}));

socket.emit("messageHistory", formattedHistory);
    socket.on("setprofile", async (data) => {
        users[socket.id] = data.username;
        const usersaved = await saveuser(data,socket.id);
        console.log(`User assigned: ${data.username} (Socket ID: ${socket.id})`);
        let messageservor = `User connected: ${users[socket.id] || "Anonymous"}`;
        const newmessageserver =await savemessage(usersaved, messageservor)
        socketServer.emit("message", newmessageserver);
    });

    socket.on("message", async (data) => {
        const userfinded = await getuser (socket.id)
        let messageInput = `${userfinded.username} says: ${data.message}`;      
        const newmessage = await savemessage(userfinded,messageInput,data);
        const fullMessage = await chat
        .findById(newmessage._id)
        .populate("user", "username profilephoto");
        socketServer.emit("message", {
            _id:fullMessage._id,
            user: fullMessage.user.username,
        profilephoto: fullMessage.user.profilephoto, 
        message: fullMessage.message,
        media: fullMessage.media || "",
        timestamp: fullMessage.timestamp,
        reactions:fullMessage.reactions
        });
    });

    socket.on("reaction", async (data) => {
    const { messageId, username, reactionCode } = data;

    try {
        const message = await chat.findById(messageId);

        if (!message) {
            console.log(` Message not found: ${messageId}`);
            return;
        }
        const existingReaction = message.reactions.find(
            (reaction) => reaction.username === username && reaction.reactionCode === reactionCode
        );

        let updatedMessage;

        if (existingReaction) {
            updatedMessage = await chat.findByIdAndUpdate(
                messageId,
                { $pull: { reactions: { username, reactionCode } } },
                { new: true }
            );
        } else {
            updatedMessage = await chat.findByIdAndUpdate(
                messageId,
                { $push: { reactions: { username, reactionCode } } },
                { new: true }
            );
        }

        console.log(updatedMessage.reactions);
        socketServer.emit("reaction", updatedMessage);
    } catch (error) {
        console.error("Error handling reaction:", error);
    }
});
    socket.on("disconnect", async () => {
        console.log(`User disconnected: ${users[socket.id] || "Anonymous"} (${socket.id})`);
        let messageserver = `User disconnected: ${users[socket.id] || "Anonymous"}`;
        const userfinded = await getuser (socket.id)
        const newDisconnectserver = await savemessage(userfinded,messageserver);
        socketServer.emit("message", newDisconnectserver);
        await deleteuser(socket.id)
    });
});