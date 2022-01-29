/*
    博客
*/

//  1.引入 mongoose 模块
const mongoose = require('mongoose')

var Schema = mongoose.Schema

mongoose.connect('mongodb://localhost:27017/test');

//  2.创建博客集合规则
const blogSchema = new Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,   // 数据库当中的独有类型
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: true
    },
    time: {
        type: Date , 
        default: Date.now
    },
    cover: {
        type: String,
        default: './public/img/blogCover.png'
    },
    kind: {
        type: String,
        enum: ['原创','翻译','转载'],
        default: '原创'
    },
    tag: {
        type: Array , 
        default: []
    },
    content: {
        type: String 
    }
})

//  3.将集合规则作为模块成员进行导出
module.exports = mongoose.model('Blog' , blogSchema)