# chrome调试

## 方法一: 普通运行
1. `node --inspect=0.0.0.0:9055 build/main.js` (格式 `--inspect=<ip>:<port>`)
2. 进行[调试](#调试)

## 方法二: pm2运行
1. 修改`ecosystem.config.js`:
```javascript
module.exports = {
  apps : [{
    name: 'live',
    script: './build/main.js',

    // Options reference: https://pm2.keymetrics.io/docs/usage/application-declaration/
    args: [
        '--color'
    ],
    env: {
        FORCE_COLOR: 1
    },
    interpreter_args: [
        '--inspect=0.0.0.0:9055'    // 调试地址
    ],
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }],
};
```
2. `pm2 start ecosystem.config.js`运行
3. 进行[调试](#调试)


## 调试
1. 打开chrome浏览器, url输入`chrome://inspect`, 进入`devices`界面
2. 点开 **Open dedicated DevTools for Node**, 进入`Connection`界面
3. 输入\<ip\>:\<port\>地址 (i.e: 127.0.0.1:9055)
4. `Console`界面查看输出, `Memory`界面调试内存泄漏
