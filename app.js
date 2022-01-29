const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');
const session = require('express-session')
const router = require('./router')
const cors = require('cors')
const moment = require('moment');
const template = require('art-template')
const app = express()

// cors中间件解决跨域问题
//  1.下载  npm i cors
//  2.引入  var cors = require('cors')
//  3.配置  app.use(cors())
app.use(cors())

// 静态资源
app.use('/public/' , express.static(path.join(__dirname, './public/')))
app.use('/node_modules/' , express.static(path.join(__dirname, './node_modules/')))


app.engine('html' , require('express-art-template'))
app.set('views' , path.join( __dirname , './views/'))   //默认就是 ./views 目录

// 向模板内部导入 dateFormate 变量
template.defaults.imports.moment = moment;

// 配置body-parser (post请求体) 
// 放在挂载路由之前
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// 配置 cookie
// 第三方中间件： express-cookie
app.use(cookieParser());

// Express 框架默认不支持 Session 和 Cookie
// 第三方中间件： express-session
//  1.　下载　2. 配置 （路由之前） 3. 使用
app.use(session({
    secret: 'myKeyBoard',   //配置加密字符串
    resave: false,
    saveUninitialized: true
}))

// 挂载路由
app.use(router)

// 配置处理404的中间件
app.use(function(req , res){
    res.render('404.html')
})
// 配置一个全局错误处理中间件
app.use(function(err, req, res, next){
    // token解析失败导致的错误
    if(err.name === 'UnauthorizedError') {
        res.status(401).json({
            err_code: 500,
            message: '无效的token'
        })
    }
    // 其他原因导致的错误给用户一个系统繁忙的错误信息 
    res.status(200).json({
        err_code: 500,
        message: err.message
    })
})

app.listen(3000 , function() {
    console.log('Running at port 3000 ...')
})


