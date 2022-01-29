/*
    热门博客
*/

//  1.引入 mongoose 模块
const mongoose = require('mongoose')

var Schema = mongoose.Schema

mongoose.connect('mongodb://localhost:27017/test');

//  2.创建博客集合规则
const hotBloggerSchema = new Schema({
    // 文章的作者
    blogger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    // 浏览量
    num: {
        type: Number ,
        default: 0
    }
})

//  3.将集合规则作为模块成员进行导出
module.exports = mongoose.model('HotBlogger' , hotBloggerSchema)