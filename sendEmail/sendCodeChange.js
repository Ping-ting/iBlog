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

module.exports =  function(email, code){
    return new Promise(function(resolve, reject) {
        transporter.sendMail({
            from: user,
            to: email, 
            subject: 'iBlog 账户修改密码验证' ,
            html : 
            `<p>您好，目前您正在 iBlog 通过邮箱验证码修改密码；</p>

            <p>您的账户修改密码的验证码为: <span style = " font-weight : 600 ; font-size: 18px;"> ${code} </span></p>

            <p>该验证码2分钟内有效。</p>
            
            <p>如果不是本人操作，请忽略。</p>
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