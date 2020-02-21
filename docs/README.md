# bilibili-live-monitor (b站舰长、抽奖、天选监听)
![Github](https://img.shields.io/github/license/Billyzou0741326/bilibili-live-raffle-monitor)
![Github](https://img.shields.io/badge/nodejs-10.16.3-blue)

> [Get Started](before-starting/README.md)

## Info
 - 运行于服务器或本地localhost的TS/JS版b站舰长监听
 - 此程序无需用户提供账号信息 且不收集任何数据
 - [bilibili-raffle-js](https://github.com/Billyzou0741326/bilibili-raffle-js)为此项目的client
 - 覆盖率: null (未统计)

## Features
 - 推送监听到的舰长、达到可抽奖时间段的高能信息 (默认WS接口8999)
 - 以http返回json视图的**未过期**舰长/提督/总督/高能/天选 (默认http接口9001)
 - http路径`/guard`, `/gift`, `/pk`, `/storm`, `/anchor`
 - `/build/db/record.json`为静态房间列表(永久监听)；初次运行时自动建立，运行过程中自动存入记录；此后每次运行自动读取静态房间记录

## Limitations
 - 推送格式可能不太兼容其它大佬的版本 有需求开Issues
 - **Windows运行效率极差 原因不明 很可能是底层问题**
 - 覆盖率你们说了算23333




## Bug report
有问题可以来[Issue](https://github.com/Billyzou0741326/bilibili-live-monitor-ts/issues)聊天
有大问题可以炸我邮箱<zouguanhan@gmail.com>
