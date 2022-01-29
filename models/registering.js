/*
    1.用于注册激活账户发送验证码的比对
    2.用于修改密码发送验证码验证
*/

var mongoose = require('mongoose')

// 连接数据库
mongoose.connect('mongodb://localhost:27017/test');

var Schema = mongoose.Schema

var RegisteringSchema = new Schema({
    email:{
        type: String,
        required : true
    },
    nickname: {
        type: String,
        required : true
    },
    password:{
        type: String,
        required : true
    },
    post_time:{
        type: Date,
        default:0
    },
    post_code:{
        type: String,
        default:''
    }
})

module.exports = mongoose.model('Registering' , RegisteringSchema)