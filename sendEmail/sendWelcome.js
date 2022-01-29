const nodemailer = require('nodemailer')

let user = '2667252524@qq.com'      //开启SMTP服务的QQ邮箱
let pass = 'okyciqpqldvldhgg'       //授权码
let transporter = nodemailer.createTransport({
    host: 'smtp.qq.com',
    secure: true,
    auth: {
        user: user,
        pass: pass  
    }
})

module.exports =  function(email , newUser){
    return new Promise(function(resolve, reject) {
        transporter.sendMail({
            from: user,
            to: email, 
            subject: '欢迎您加入 iBlog' ,
            html : 
            `<p>您好，您在 iBlog 的账户激活成功，您的登录 nickname 是：${ newUser.nickname }</p>

            <p>您的账户邮箱是：${ newUser.email }</p>

            <p>Blog - 开发者的网上家园 </p>
            
            <p>代码改变世界！</p>
            `
        }, function (err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        });
    })
}