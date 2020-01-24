# bilibili-live-monitor (b站舰长、抽奖、天选监听)
![Github](https://img.shields.io/github/license/Billyzou0741326/bilibili-live-raffle-monitor)
![Github](https://img.shields.io/badge/nodejs-10.16.3-blue)

## Info
 - 运行于服务器或本地localhost的TS/JS版b站舰长监听
 - 此程序无需用户提供账号信息 且不收集任何数据
 - [bilibili-raffle-js](https://github.com/Billyzou0741326/bilibili-raffle-js)为此项目的client
 - 覆盖率: null (未统计)

## Features
 - 推送监听到的舰长、达到可抽奖时间段的高能信息 (默认WS接口8999)
 - 以http返回json视图的**未过期**舰长/提督/总督/高能/天选 (默认http接口9001)
 - http路径`/guard`, `/gift`, `/anchor`
 - `/build/db/record.json`为静态房间列表(永久监听)；初次运行时自动建立，运行过程中自动存入记录；此后每次运行自动读取静态房间记录

## Limitations
 - 推送格式可能不太兼容其它大佬的版本 有需求开Issues
 - 未完成pk抓取
 - 覆盖率你们说了算23333



# Getting Started

## Requirements
 - 运行环境[node.js](https://nodejs.org/en/download/)

## Execution (运行方式)

### 运行前 (Optional)
 - 可以自行用TypeScript编译一下源码 编译后的代码在build里
 - Linux需要用root权限打开`/etc/security/limits.conf`加上这两行 (这个是放宽连接数限制的)   
    ```
    * hard nofile 60000
    * soft nofile 60000
    ```

### 运行方式
 1. 命令行切换到package.json所在的目录
 2. `npm install`                       (执行一次就好)
 3. `node ./build/main.js`              (正常运行)
 4. 运行后可以进浏览器<http://{ip}:9001/guard>查看可领取范围内的舰长, <http://{ip}:9001/gift>查看可领取范围内的抽奖 (可能要等会), <http://{ip}:9001/anchor>查看进行中的天选抽奖
 5. Client端用WS连接8999端口接收推送

### Docker
docker run --publish 8999:8999 --publish 9001:9001 <image-name>

## Config file 设置 (src/settings.json)

### 服务器版、需公网ip
```javascript
{
    "bilibili-danmu": {
        "host": "broadcastlv.chat.bilibili.com",
        "port": 2243
    },
    "default-ws-server": {
        "host": "0.0.0.0",
        "port": 8999
    },
    "default-http-server": {
        "host": "0.0.0.0",
        "port": 9001
    }
}
```

### 本地版、不连外网
```javascript
{
    "bilibili-ws": {
        "host": "broadcastlv.chat.bilibili.com",
        "port": 2243
    },
    "default-ws-server": {
        "host": "127.0.0.1",
        "port": 8999
    },
    "default-http-server": {
        "host": "127.0.0.1",
        "port": 9001
    }
}
```

## Broadcast Format (http, ws)

 - 以category区分类别 可能是`gift`, `guard`, `storm`, `pk`, `anchor`

### /storm (风暴) --仅WS--
```javascript
{
    "id": "1909565617562",
    "roomid": 3974839,
    "category": "storm",
    "type": "storm",
    "name": "节奏风暴",
    "expireAt": "1579832000"
}
```

### /guard (船员) --http/ws--
```javascript
{
    "id": 1909418,
    "roomid": 11771685,
    "category": "guard",
    "type": "guard",
    "name": "提督",
    "expireAt": 1579832000
}
```

### /gift (高能) --http/ws--
```javascript
{
    "id": 662502,
    "roomid": 21175464,
    "category": "gift",
    "type": "GIFT_30405",
    "name": "33地图抽奖抽奖",
    "wait": 120,                // 无视该变量 仅内用 所有推送的高能都是抽奖时间段内的
    "expireAt": 1579828602
}
```

### /anchor (天选) --仅http--
```javascript
{
    "id": 65248,
    "roomid": 11437906,
    "category": "anchor",
    "type": "anchor",
    "expireAt": 1579828373,
    "name": "小主播比较穷只能抽0.5元的奖",
    "award_num": 1,
    "gift_name": "",
    "gift_num": 1,
    "gift_price": 0,
    "requirement": "关注主播",
    "danmu": "小主播点个关注吧，关注了就别取消惹，谢谢"
}
```

## Bug report
有问题可以来[Issue](https://github.com/Billyzou0741326/bilibili-live-monitor-ts/issues)聊天
有大问题可以炸我邮箱<zouguanhan@gmail.com>
