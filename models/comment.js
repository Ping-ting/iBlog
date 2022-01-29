/*
    评论
*/

//  1.引入 mongoose 模块
const mongoose = require('mongoose')

var Schema = mongoose.Schema

mongoose.connect('mongodb://localhost:27017/test');

//  2.创建博客集合规则
const commentSchema = new Schema({
    // 文章 id
    blogId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog',
    },
    // 评论人 id
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    //  评论时间
    time: {
        type: Date,
        default: Date.now
    },
    // 评论内容
    content: {
        type: String
    }
})

//  3.将集合规则作为模块成员进行导出
module.exports = mongoose.model('Comment' , commentSchema)