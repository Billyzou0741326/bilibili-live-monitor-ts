# 登录助手

`node ./build/bilibili/login.js <username> <password>`

\<username\>替换为用户名, \<password\>替换为密码

以json格式输出:

```javascript
{
    "user": {
        "username": "________",
        "password": "________"
    },
    "web": {
        "bili_jct": "4fcabbada437c55b56a13022________",
        "DedeUserID": "48_______",
        "DedeUserID__ckMd5": "c23c9f005434efd4",
        "sid": "5h7ackrr",
        "SESSDATA": "c46c____%2C159000____%2C5715____"
    },
    "app": {
        "access_token": "9929________________________ad41",
        "refresh_token": "d785_______________________eca41",
        "mid": 48_______,
        "expires_in": 2592000
    }
}
```

常见错误:

> Usage: node <filename> <username> <password>

运行格式不正确

> (Login) [0] - {"code":0, ...}

出现验证

> (Login) [-629] - 账号或者密码错误

