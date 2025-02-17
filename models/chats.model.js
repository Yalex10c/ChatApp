const mongoose = require("mongoose")
const schema = mongoose.Schema;
const chatschema = new schema ({
    namechat:{
        type:String, trim:true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,ref:"users"
    },
    message:{
        type:String, trim:true
    },
    media:{
        type:String
    },
    timestamp:{
        type:Date, default:Date.now
    },
    reactions:[{
        username:{type:String},
        reactionCode:{type:String}
    }]
    }
)
const chat = mongoose.model("chat",chatschema)
module.exports = chat