const express = require('express')
const User = require('./models/user')
const Registering = require('./models/registering')
const Blog = require('./models/blog')
const Comment = require('./models/comment')
const Like = require('./models/like')
const Skim = require('./models/skim')
const HotBlog = require('./models/hotBlog')
const HotBlogger = require('./models/hotBlogger')
const sendCode = require('./sendEmail/sendCode')
const sendWelcome = require("./sendEmail/sendWelcome")
const sendCodeChange = require("./sendEmail/sendCodeChange")
const md5 = require('blueimp-md5')
const Joi = require('joi')
const path = require('path')
const formidable = require('formidable')
const pagination = require('mongoose-sex-page')
const { number } = require('joi')

// 注册账户信息验证
const schemaRegister = Joi.object({
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).required(),
    nickname: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(3).max(30).required(),
})
// 修改基本信息验证
const schemaChangeInformation = Joi.object({
    //大于3 小于30 没有其他特殊字符的字符串
    nickname: Joi.string().alphanum().min(3).max(30),
    // 0 或者 1 表示 女 男
    gender: Joi.number().integer().min(0).max(1),
    // 不超过长度 50 的个人简介
    bio: Joi.string().min(3).max(50)
})
// 通过旧密码修改密码验证
const schemaChangePasswordByOld = Joi.object({
    oldPassword: Joi.string().min(3).max(30).required(),
    newPassword: Joi.string().min(3).max(30).required(),
    confirmPassword: Joi.string().min(3).max(30).required(),
})
// 发送验证码的邮箱验证
const schemaEmail = Joi.object({    
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).required(),
})
// 通过邮箱验证修改密码验证
const schemaChangePasswordByCode = Joi.object({
    email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } }).required(),
    newPassword: Joi.string().min(3).max(30).required(),
    confirmPassword: Joi.string().min(3).max(30).required(),
    getCode: Joi.required()
})
// 发表文章的信息验证
const schemaPublishBlog = Joi.object({    
    title: Joi.string().required(),
    kind: Joi.string().required(),
    tag: Joi.required(),
    content: Joi.string().required(),
})

var router = express.Router()
// 渲染首页
router.get('/' , async function(req , res, next){
    //当前页
    let page = req.query.page
    if(!page){
        page = 1
    }
    // 每页的博客数量
    const pageSize = 2
    // 多表联合查询
    let blogs = await Blog.find().populate('author').skip((page - 1)*pageSize).limit(pageSize).lean().sort({time : -1})
    .catch(function(err){
        console.log(err)
        return next(err)
    })
    // 下标页
    let pages = []                                          //储存分页信息的数组
    let AllBlogNum = await Blog.estimatedDocumentCount()    //博客总数量
    let totalNumber = Math.ceil(AllBlogNum / pageSize)      //总分页的数量
    let pagingNum = 5                                       //分页栏一共显示的分页个数 建议是奇数 
    let start = page - Math.floor(pagingNum/2)                                    //分页栏开始的页数
    if(page <= Math.floor(pagingNum/2)){
        start = 1
    } 
    if(page > totalNumber - Math.floor(pagingNum/2)){
        start = totalNumber - Math.floor(pagingNum/2)*2
    }
    for(let i = start ; i <= (start + Math.floor(pagingNum/2)*2) ; i++){
        pages.push(Number(i))
    }
    console.log(pages , 'now:',page,'totalNumber:',totalNumber)
    let hotBlogs = await HotBlog.find().populate('blog').populate('author').lean().sort({views: -1})
    let hotBlogsPart = []
    let partBlogNum = 5
    while(partBlogNum --){
        hotBlogsPart.unshift(hotBlogs[partBlogNum])
    }
    let hotBloggers = await HotBlogger.find().populate('blogger').lean().sort({num: -1})
    console.log(hotBloggers.length)
    let hotBloggersPart = []
    let hotBloggersNum = 5
    while(hotBloggersNum --){
        hotBloggersPart.unshift(hotBloggers[hotBloggersNum])
    }
    if(req.session.user){
        User.findOne({
            email: req.session.user.email
        }).then(function(data){
            res.render('index.html' , {
                user: data,
                blogs: blogs,
                pages: pages,
                now: Number(page),
                all: totalNumber,
                hotBlogsPart: hotBlogsPart,
                hotBloggersPart: hotBloggersPart
            })
        })
    }else{
        res.render('index.html' , {
            user: null,
            blogs: blogs,
            pages: pages,
            now: Number(page),
            all: totalNumber,
            hotBlogsPart: hotBlogsPart,
            hotBloggersPart: hotBloggersPart
        })
    }
})

// 渲染登录页面
router.get('/login' , function(req , res, next){
    console.log('req.cookies.user ：' ,req.cookies.user)
    if(req.cookies.user){
        res.render('login.html' , {
            account: req.cookies.user
        })
    }else{
        res.render('login.html')
    }
})

// 处理登录请求
router.post('/login' , function(req , res, next){
    console.log('收到登录请求')
    console.log('req.body:' ,req.body)
    console.log('req.cookies' , req.cookies)
    let body = req.body
    User.findOne({
        email: body.email,
        password: md5( md5( body.password ) )
    })
    .then( function(data) {
        if(!data){
            return res.status(200).json({
                err_code:1,
                message: '密码或者邮箱有误'
            })
        }else{
            // 登录成功 通过Session记录登录状态
            req.session.user = data
            // 根据是否记住邮箱密码来设置cookie
            if(req.body.remember === 'on'){
                res.cookie('user' , {
                    email: req.body.email,
                    password: req.body.password
                },{
                    // 设置记住时间为七天
                    maxAge: 7*24*60*60*1000
                })
            }else{
                // 如果这次没有设置记住 清理 user 的 okie
                res.clearCookie('user')
            }
            return res.status(200).json({
                err_code:0,
                message: '登录成功！'
            })
            
        }
    })
    .catch( function(err) {
        return res.status(500).json({
            err_code:500,
            message: '服务端错误'
        })
    })
})

// 渲染注册页面
router.get('/register' , function(req , res, next){
    res.render('register.html')
})

// 处理注册请求
router.post('/register' , function(req , res , next){
    //  1. 获取数据
    //  2. 操作数据库
    //  3. 发送响应
    var body = req.body
    // 首先判断数据的格式
    console.log('error:' , schemaRegister.validate(req.body).error&&schemaRegister.validate(req.body).error.message)
    if(schemaRegister.validate(req.body).error){
        // 格式有误
        return res.status(200).json({
            err_code:2,
            message:schemaRegister.validate(req.body).error.message
        })
    }
    User.findOne({
        email: body.email
    } , function(err , data){
        // Express提供一个响应方法 json()
        // 传入对象 自动转换成字符串返回响应
        if(err){
            return next(err)
        }
        if(data){
            return res.status(200).json({
                err_code:1,
                message:'邮箱已注册'
            })
        }
        // 再次检查是否 register 
        Registering.remove({
            email: body.email
        }).then(function(data){
            console.log('当前email尝试注册过，已经移除注册信息')
        }
        ).catch(function(err){
            console.log('当前email还未尝试注册过')
        }
        )
        // 存入 registering
        new Registering(body).save(function (err , registering){
            if(err){
                return next(err)
            }
            return res.status(200).json({
                err_code:0,
                message: body.email
            })
        })
    })
})

// 渲染邮箱验证页面
router.get('/email' , function(req , res){
    res.render('email.html' , {
        email: req.query.email
    })
})

// 处理邮箱验证请求
router.post('/sendCode' , function(req , res, next){
    // console.log('收到发送验证码的请求啦，需要发送的邮箱是：', req.body)
    // 发送验证码 将post_code存入数据库
    let post_code = num()
    let result = sendCode(req.body.email, post_code)
    result
    .then( function(data){
        console.log('邮件发送成功')
        // 更新数据库 post_code post_time
        Registering.findOneAndUpdate({
            email: req.body.email
        } , {
            post_code: post_code,
            post_time: Date.now()
        }).then(function(data){
            console.log('post_code post_time 更新成功')
        }).catch(function(err){
            return next(err)
        })
    } , function(err){
        return next(err)
    })
    // 响应
    return res.status(200).json({
        message: '发送验证码成功'
    })
})

// 生成六位验证码 String类型
function num(){
    return Math.random().toFixed(6).slice(-6).toString()
}

// 处理验证码请求
router.post('/sureCode' , function(req , res,next){
    console.log('收到验证码请求了' , req.body)
    var body = req.body
    Registering.findOne({
        email: body.email
    }).then(function(data){
        if(data.post_code == body.getCode){
            if(Date.now() -  data.post_time > 60000){
                return res.status(200).json({
                    err_code:2,
                    message: '超过一分钟，验证码失效，请重新获取！'
                })
            }else{
                // 创建用户 执行注册
                let newUser = {
                    email: data.email,
                    nickname: data.nickname,
                    // md5 俩次加密password
                    password: md5(md5(data.password))
                }
                new User(newUser).save(function(err , data){
                    if(err){
                        return next(err)
                    }
                    // data 为新建的用户 document
                    console.log(data)
                    sendWelcome(newUser.email , newUser)
                        .then(function(data){
                            return res.status(200).json({
                                err_code:0,
                                message: '成功！'
                            })
                        })
                        .catch(function(err){
                            return res.status(200).json({
                                err_code:500,
                                message: '系统繁忙，稍后再试...'
                            })
                        })
                        
                })
            }
        }else{
            return res.status(200).json({
                err_code:1,
                message: '验证码错误'
            })
        }
    }).catch(function(err){
        return res.status(500).json({
            err_code:500,
            message: '系统繁忙，稍后再试...'
        })
    })
})

// 处理退出请求
router.get('/logout' , function(req , res){
    // 清除登录状态
    req.session.user = null
    // req.session.destroy()
    // 刷新当前页面
    // a 标签是同步请求 服务端可以重定向
    res.redirect('/')
})

// 渲染修改密码页面
router.get('/forgetPassword' , function(req , res){
    res.send('找回密码-还没写')
})

// 渲染修改信息首页
router.get('/changeInformation' , function(req , res){
    User.findOne({
        email: req.session.user.email
    }).then(function(data){
        res.render('changeInformation.html' , {
            user: data,
        })
    })
})

//处理基本信息修改提交请求
router.post('/changeInformation' , function(req , res , next){
    console.log('收到修改基本信息请求')
    const form = formidable({ 
        multiples: true ,
        keepExtensions: true
    })
    form.uploadDir = path.join( __dirname , 'public' , 'uploads','avatar' )
    form.parse(req , (err, fields, files) => {
        if(err){
            return next(err)
        }
        else{
            //  1.验证表单数据格式
            let errMes = schemaChangeInformation.validate(fields).err
            if(errMes){
                console.log(errMes.message)
                return res.status(200).json({
                    err_code:1,
                    message: errMes.message
                })
            }
            //  2.修改数据库对应信息
            // 将字符串类型的数据转 Date 
            if(fields.birthday){
                fields.birthday = new Date(fields.birthday)
            }
            if(fields.gender != ''){
                fields.gender = Number(fields.gender)
            }
            if(JSON.stringify(files) != "{}"){
                fields.avatar = '/public/uploads/avatar/'  + files.avatar.newFilename
            }
            console.log(fields)
            User.findOneAndUpdate({
                email: req.session.user.email
            } , fields).then(function(data){
                return res.status(200).json({
                err_code:0,
                message: '基本信息修改成功！'
            })
            }).catch(function(err){
                return next(err)
            })
        }
    })

})

// 处理通过旧密码修改密码请求
router.post('/changePasswordByOld' , function(req , res , next){
    console.log(req.body)
    // 1.验证格式
    if(schemaChangePasswordByOld.validate(req.body).error){
        // 格式有误
        return res.status(200).json({
            err_code:1,
            message:schemaChangePasswordByOld.validate(req.body).error.message
        })
    }else if(req.body.newPassword != req.body.confirmPassword){
        // 俩次密码不同
        return res.status(200).json({
            err_code:1,
            message:'两次输入的新密码不一致 !'
        })
    }else if(req.body.newPassword == req.body.oldPassword){
        return res.status(200).json({
            err_code:1,
            message:'新设置的密码不能与原密码相同 !'
        })
    }
    // 2.比对旧密码
    User.findOne({
        email: req.session.user.email
    }).then(function(data){
        if(data.password != md5(md5(req.body.oldPassword)) ){
            return res.status(200).json({
                err_code:1,
                message:'输入的旧密码错误 !'
            })
        }else{
            User.findOneAndUpdate({
                email: req.session.user.email
            },{
                password: md5(md5(req.body.newPassword)) 
            }).then(function(data){
                return res.status(200).json({
                    err_code:0,
                    message: '密码修改成功！'
                    })
            }).catch(function(err){
                return next(err)
            })
        }
    }).catch(function(err){
        console.log(err)
        return next(err)
    })
})

// 渲染通过邮箱验证码修改密码页面
router.get('/changePasswordByCode' , function(req , res , next){
    res.render('changePasswordByEmail.html')
})

// 处理发送验证码请求
router.get('/sendChangePasswordCode' , function(req , res , next){
    console.log(req.query)
    const email = req.query.email
    if(schemaEmail.validate(req.query).error){
        // 格式有误
        return res.status(200).json({
            err_code:2,
            message:schemaEmail.validate(req.body).error.message
        })
    }
    // 判断邮箱有没有注册过
    User.findOne({
        email: email
    }).then(function(data){
        if(!data){
            return res.status(200).json({
                err_code:1,
                message: '该邮箱还未激活！'
            })
        }
    }).catch(function(err){
        console.log(err)
        return next(err)
    })
    // 发送验证码 将post_code存入数据库
    let post_code = num()
    let result = sendCodeChange(email, post_code)
    result
    .then( function(data){
        console.log('修改密码邮件发送成功')
        // 更新数据库 post_code post_time
        Registering.findOneAndUpdate({
            email: email
        } , {
            post_code: post_code,
            post_time: Date.now()
        }).then(function(data){
            console.log('post_code post_time 更新成功')
            return res.status(200).json({
                err_code:0,
                message: '发送验证码成功'
            })
        }).catch(function(err){
            console.log(err)
            return next(err)
        })
    } , function(err){
        console.log(err)
        return next(err)
    })
})

// 处理通过邮箱验证码修改密码请求
router.post('/changePasswordByCode' , function(req , res , next){
    // console.log(req.body)
    //  1.查看验证码是否有效 超时或者不匹配
    Registering.findOne({
        email: req.body.email
    }).then(function(data){
        if(Date.now() -  data.post_time <= 150000){
            if(data.post_code != req.body.getCode){
                // console.log(data.post_code , req.body.getCode)
                return res.status(200).json({
                    err_code:1,
                    message: '验证码有误！'
                })
            }else{
                //  2.判断密码
                if(schemaChangePasswordByCode.validate(req.body).error){
                    // 格式有误
                    return res.status(200).json({
                        err_code:1,
                        message:schemaChangePasswordByCode.validate(req.body).error.message
                    })
                }else if(req.body.newPassword != req.body.confirmPassword){
                    // 俩次密码不同
                    return res.status(200).json({
                        err_code:1,
                        message:'两次输入的新密码不一致 !'
                    })
                }else{
                    User.findOneAndUpdate({
                        email: req.body.email
                    },{
                        password: md5(md5(req.body.newPassword)) 
                    }).then(function(data){
                        return res.status(200).json({
                            err_code:0,
                            message: '密码修改成功！'
                            })
                    }).catch(function(err){
                        console.log(err)
                        return next(err)
                    })
                }
            }
        }else{
            return res.status(200).json({
                err_code:1,
                message: '超过两分钟，验证码失效，请重新获取！'
            })
        }
    }).catch(function(err){
        console.log(err)
        return next(err)
    })
})

// 渲染发表博客页面
router.get('/publishBlog' , function(req , res , next){
    User.findOne({
        email: req.session.user.email
    }).then(function(data){
        res.render('publishBlog.html' , {
            user: data,
        })
    })
})

// 处理发表博客请求
router.post('/publishBlog' , function(req , res , next){
    console.log('收到发表博客的请求了')
    const form = formidable({ 
        multiples: true ,
        keepExtensions: true
    })
    form.uploadDir = path.join( __dirname , 'public' , 'uploads','blogCover' )
    form.parse(req , (err, fields, files) => {
        if(err){
            console.log(err)
            return next(err)
        }
        else{
            //  1.验证文章表单数据格式
            let errMes = schemaPublishBlog.validate(fields).error
            if(errMes){
                console.log(errMes)
                return res.status(200).json({
                    err_code:1,
                    message: errMes.message
                })
            }
            //  2.数据库信息
            if(fields.tag && !(fields.tag instanceof Array ) ){
                fields.tag = [fields.tag]
            }
            if(files.cover != undefined){
                fields.cover = '/public/uploads/blogCover/'  + files.cover.newFilename
            }else{
                fields.cover = '/public/img/blogCover.png'
            }
            User.findOne({
                email: req.session.user.email
            }).then(function(user){
                fields.author = user._id
                // 储存数据
                new Blog(fields).save()
                .then(function(blog){
                    return res.status(200).json({
                        err_code:0,
                        message: '发表成功！'
                    })
                }).catch(function(err){
                    console.log(err)
                    return next(err)
                })
                }).catch(function(err){
                    console.log(err)
                    return next(err)
                })
        }
    })
})

// 处理博客详情页
router.get('/detail',async function(req,res,next){
    let id = req.query.id.split('').slice(1,-1).join('')
    console.log('当前详情页博客id：',id)

    let blog = await Blog.findById(id).populate('author').lean().catch(function(err){
        console.log(err)
        return next(err)
    })
    let comments = await Comment.find({blogId: id}).populate('userId').lean().sort({time : -1}).catch(function(err){
        console.log(err)
        return next(err)
    })
    let likeNum = await Like.countDocuments({blogId: id})
    let isLike;
    let user = null;
    if(!req.session.user){
        isLike = 0
        // 浏览量的添加
        new Skim({
            blogId: id 
        }).save()
        .then(function(data){
            console.log('浏览量 + 1')
        }).catch(function(err){
            console.log(err) 
            return next(err)
        })
    }else{
        user = await User.findOne({email: req.session.user.email})
        let like = await Like.findOne({blogId: id , userId: user._id})
        if(like){
            isLike = 1
        }else{
            isLike = 0
        }
        new Skim({
            blogId: id , 
            userId: user._id
        }).save()
        .then(function(data){
            console.log('浏览量 + 1')
        }).catch(function(err){
            console.log(err) 
            return next(err)
        })
    }
    let skimNum = await Skim.countDocuments({blogId: id})
    return res.render('detailBlog.html',{
        blog: blog,                     //当前博客信息
        comments: comments,             //当前博客评论
        commentNum: comments.length,    //评论数量
        likeNum: likeNum,               //点赞数量
        isLike: isLike,                 //当前登录用户是否点赞
        skimNum: skimNum,               //浏览量
        user: user                      //当前登录用户
    })
})

// 处理发表评论请求
router.post('/publishComment' , async function(req , res , next){
    req.body.blogId = req.body.blogId.split('').slice(1,-1).join('')
    if(!req.session.user){
        return res.status(200).json({
            err_code:1,
            message: '请先登录再发表评论！'
        })
    }
    let user = await User.findOne({email: req.session.user.email})
    req.body.userId = user._id
    new Comment(req.body).save()
    .then(function(data){
        console.log('存进数据库的评论：',data)
        return res.status(200).json({
            err_code:0,
            message: '评论成功！'
        })
    }).catch(function(err){
        console.log(err)
        return next(err)
    })
})

// 处理点赞请求
router.post('/likeBlog' , async function(req, res, next){
    req.body.id = req.body.id.split('').slice(1,-1).join('')
    console.log(req.body)
    let blogId = req.body.id
    if(!req.session.user){
        return res.status(200).json({
            err_code:1,
            message: '请先登录再点赞！'
        })
    }
    let user = await User.findOne({email: req.session.user.email})
    let flag = await Like.findOne({
        blogId: blogId,
        userId: user._id
    })
    if(!flag){
        new Like({
            blogId: blogId,
            userId: user._id
        }).save().then(function(data){
            return res.status(200).json({
                err_code:0,
                message: '点赞成功！'
            })
        }).catch(function(err){
            console.log(err) 
            return next(err)
        })
    }else{
        Like.deleteOne({
            blogId: blogId,
            userId: user._id
        }).then(function(data){
            return res.status(200).json({
                err_code:0,
                message: '取消成功！'
            })
        }).catch(function(err){
            console.log(err) 
            return next(err)
        })
    }

})

// 渲染个人主页
router.get('/personalHomepage' , async function(req , res, next){
    console.log('个人主页id：',req.query)
    let personalId = req.query.id.split('').slice(1,-1).join('')
    let person = await User.findById(personalId)
    let personBlogs = await Blog.find({author: personalId}).populate('author').lean().sort({time : -1})
    let user = null
    if(req.session.user){
        user = await User.findOne({email: req.session.user.email})
    }
    let blogsNum = personBlogs.length
    // return res.send(JSON.stringify(personBlogs))
    res.render('personalHomepage.html' , {
        user:user,
        person: person,
        blogs: personBlogs,
        blogsNum: blogsNum
    })
})

//渲染内容管理页面
router.get('/managerBlog', async function(req , res , next){
    console.log('内容管理id：',req.query)
    let personalId = req.query.id.split('').slice(1,-1).join('')
    let person = await User.findById(personalId)
    let personBlogs = await Blog.find({author: personalId}).populate('author').lean().sort({time : -1})
    let user = null
    if(req.session.user){
        user = await User.findOne({email: req.session.user.email})
    }
    let blogsNum = personBlogs.length
    // return res.send(JSON.stringify(personBlogs))
    res.render('managerBlog.html' , {
        user:user,
        person: person,
        blogs: personBlogs,
        blogsNum: blogsNum
    })
}) 

// 删除博客请求
router.post('/deleteBlog' , async function(req , res , next){
    console.log('删除博客id：',req.body)
    let blogId = req.body.id.split('').slice(1,-1).join('')
    Blog.findByIdAndDelete(blogId)
    .then(function(data){
        return res.status(200).json({
            err_code: 0,
            message: '博客删除成功！'
        })
    }).catch(function(err){
        console.log(err)
        return next(err)
    })
})

// 渲染编辑博客页面
router.get('/editBlog' , async function(req , res , next){
    console.log('编辑博客id：',req.query)
    let id = req.query.id.split('').slice(1,-1).join('')
    let blog = await Blog.findById(id).populate('author').lean().catch(function(err){
        console.log(err)
        return next(err)
    })
    let comments = await Comment.find({blogId: id}).populate('userId').lean().sort({time : -1}).catch(function(err){
        console.log(err)
        return next(err)
    })
    let likeNum = await Like.countDocuments({blogId: id})
    let user = await User.findOne({email: req.session.user.email})
    let like = await Like.findOne({blogId: id , userId: user._id})
    let isLike;
    if(like){
        isLike = 1
    }else{
        isLike = 0
    }
    tags = ['Python','Java','C/C++','Golang','Node','PHP']
    kinds = ['原创' , '转载' , '翻译']
    let skimNum = await Skim.countDocuments({blogId: id})
    return res.render('editBlog.html',{
        blog: blog,                     //当前博客信息
        comments: comments,             //当前博客评论
        commentNum: comments.length,    //评论数量
        likeNum: likeNum,               //点赞数量
        isLike: isLike,                 //当前登录用户是否点赞
        skimNum: skimNum,               //浏览量
        user: user,                      //当前登录用户
        tags: tags,                     //标签数组
        kinds: kinds                    //类型数组
    })
})

// 处理编辑博客保存请求
router.post('/editBlog' , async function(req, res, next){
    console.log('收到修改博客的请求了')
    const form = formidable({ 
        multiples: true ,
        keepExtensions: true
    })
    form.uploadDir = path.join( __dirname , 'public' , 'uploads','blogCover' )
    form.parse(req , (err, fields, files) => {
        if(err){
            console.log(err)
            return next(err)
        }
        else{
            if(fields.tag && !(fields.tag instanceof Array ) ){
                fields.tag = [fields.tag]
            }
            if(files.cover != undefined){
                fields.cover = '/public/uploads/blogCover/'  + files.cover.newFilename
            }
            let blogId = fields.blogId.split('').slice(1,-1).join('')
            delete fields.blogId 
            console.log('id:',blogId)
            console.log('更新的信息：',fields)
            Blog.findByIdAndUpdate(blogId , fields)
            .then(function(blog){
                return res.status(200).json({
                    err_code:0,
                    message: '修改成功！'
                })
            }).catch(function(err){
                console.log(err)
                return next(err)
            })
        }
    })
})

//删除评论请求
router.post('/deleteComment' , async function(req , res , next){
    console.log('删除评论id：',req.body)
    let commentId = req.body.id.split('').slice(1,-1).join('')
    Comment.findByIdAndDelete(commentId)
    .then(function(data){
        return res.status(200).json({
            err_code: 0,
            message: '评论删除成功！'
        })
    }).catch(function(err){
        console.log(err)
        return next(err)
    })
}) 

// 搜索请求的处理
router.post('/searchBlog' , async function(req, res, next){
    console.log(req.body)
    let blogs
    let searchNav = req.body.searchContent
    if(req.body.searchTag == ''){
        // 全局搜索
        let pattern = new RegExp(req.body.searchContent, 'i')
        blogs = await Blog.find({$or: [{title:  {$regex:pattern}} , {content:  {$regex:pattern}} ]}).populate('author').lean().sort({time : -1})
    }else{
        // 分标签搜索
        let pattern = new RegExp(req.body.searchContent, 'i')
        blogs = await Blog.find({ tag: req.body.searchTag ,$or: [{title:  {$regex:pattern}} , {content:  {$regex:pattern}} ]}).populate('author').lean().sort({time : -1})
    }
    let user = null
    if(req.session.user){
        user = await User.findOne({email: req.session.user.email})
    }
    let nothingMess = null
    if(blogs.length == 0){
        nothingMess =  searchNav 
    }
    return res.render('searchBlog.html',{
        user: user,
        blogs: blogs,
        searchNav: searchNav,
        nothingMess: nothingMess
    })
})

// 博客标签分类请求处理
router.get('/classifyBlog' , async function(req,res, next){
    console.log('博客分类：',req.query.tag)
    let blogs = await Blog.find({ tag: req.query.tag }).populate('author').lean().sort({time : -1})
    let user = null
    if(req.session.user){
        user = await User.findOne({email: req.session.user.email})
    }
    let nothingMess = null
    if(blogs.length == 0){
        nothingMess =  req.query.tag 
    }
    return res.render('searchBlog.html',{
        user: user,
        blogs: blogs,
        nothingMess: nothingMess,
        Tag: req.query.tag 
    })
})

// 渲染热门博客和博主的排行榜
router.get('/hot' ,async function(req , res , next){
    console.log('热门：',req.query.more)
    let user = null
    if(req.session.user){
        user = await User.findOne({email: req.session.user.email})
    }
    if(req.query.more == 'blog'){
        let deleteAll = await HotBlog.deleteMany({ 'views': {$gte:0 }})
        console.log(deleteAll)
        let blogs = await Blog.find().populate('author').lean()
        for(let i = 0; i < blogs.length ; i ++){
            let skimNum = await Skim.countDocuments({blogId: blogs[i]._id})
            new HotBlog({
                blog: blogs[i]._id,
                views: skimNum ,
                author: blogs[i].author._id
            }).save()
            .catch(function(err){
                console.log(err)
                return next(err)
            })
        }
        let hotBlogs = await HotBlog.find().populate('blog').populate('author').lean().sort({views: -1})
        console.log(hotBlogs.length)
        return res.render('hot.html' , {
            user: user ,
            hotBlogs: hotBlogs ,
            more: '热门博客'
        })
    }else if(req.query.more == 'blogger'){
        let deleteAll = await HotBlogger.deleteMany({ 'num': {$gte:0 }})
        console.log(deleteAll)
        let blogger = await User.find().lean()
        for(let i = 0; i < blogger.length ; i ++){
            
            let blogsNum = await Blog.countDocuments({author: blogger[i]._id})
            new HotBlogger({
                blogger: blogger[i]._id,
                num: blogsNum
            }).save().then(function(data){
                console.log('存')
            })
            .catch(function(err){
                console.log(err)
                return next(err)
            })
        }
        let hotBloggers = await HotBlogger.find().populate('blogger').lean().sort({num: -1})
        console.log( '取', hotBloggers.length)
        return res.render('hot.html' , {
            user: user ,
            hotBloggers: hotBloggers ,
            more: '热门博主'
        })
    }
    
})

module.exports = router