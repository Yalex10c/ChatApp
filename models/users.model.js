const mongoose = require("mongoose")
const schema = mongoose.Schema;
const userschema = new schema ({
    username:{
        type:String, trim:true
    },
    profilephoto:{
        type:String
    },
    socketid:{
        type:String
    }
})
const users = mongoose.model("users",userschema)
module.exports = users

