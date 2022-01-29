/*
    1.用户账户
*/

var mongoose = require('mongoose')

// 连接数据库
mongoose.connect('mongodb://localhost:27017/test');

var Schema = mongoose.Schema

var userSchema = new Schema({
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
    created_time: {
        type: Date,
        // 如果直接写 Date.now() 就会即可调用
        // 当没有传递 creat_time 时 mongoose 会调用默认的方法，将返回值作为其值
        default: Date.now
    },
    last_modified_time :{
        type: Date,
        default: Date.now
    },
    avatar:{
        //头像
        type: String,
        default: '/public/img/avatar-default.png'
    },
    bio:{
        // 介绍
        type: String,
        default: ''
    },
    gender:{
        type:Number,
        enum:[-1 , 0 , 1],
        default: -1
    },
    birthday:{
        type:Date,
        default:Date.now
    },
    status:{
        type:Number,
        //  0 没有权限限制
        //  1 不可以评论
        //  2 不可以登录
        enum:[ 0 , 1 , 2],
        default: 0
    }
})

module.exports = mongoose.model('User' , userSchema)