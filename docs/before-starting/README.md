# 运行前

## Requirements
 - 运行环境[node.js](https://nodejs.org/en/download/)

## Config file 设置 (src/settings.json)
> 修改settings后务必[重新编译](#自行编译-optional-windowslinux)

> 修改`build/settings.json`则无需重新编译

### 服务器版、需公网ip
```javascript
{
    "servers": {
        "default-ws-server": {
            "host": "0.0.0.0",
            "port": 8999,
            "enable": true
        },
        "default-http-server": {
            "host": "0.0.0.0",
            "port": 9001,
            "enable": true
        },
        // 其它servers默认不开启 ("enable": false)
    }
}
```

### 本地版、不连外网
```javascript
{
    "servers": {
        "default-ws-server": {
            "host": "127.0.0.1",
            "port": 8999,
            "enable": true
        },
        "default-http-server": {
            "host": "127.0.0.1",
            "port": 9001,
            "enable": true
        },
        // 其它servers默认不开启 ("enable": false)
    },
}
```


### 房间收集策略
```javascript
    "room-collector-strategy": {
        "fixedRoomExpiry": 30,                // 非活跃房间在数据库中的保存天数
        "dynamicRoomsQueryInterval": 120,     // 查询动态房间列表间隔，单位为秒
    }
```

### 负载均衡
如果需要使用多个服务器来均衡负载，可以修改load-balancing设置。totalServers是服务器总数，serverIndex是本服务器序号，在0与totalServers减1之间。每个服务器需使用不同序号。
需要说明的是，负载并不是完全均衡。实现方式是取房间号对于服务器总数的余数，所以每个服务器监听的房间数目会有一定出入，但相差不会很多。每个服务器监听的房间并不会重复。
客户端需要同时添加所有服务器。注意并不是所有的客户端都支持多服务器。如果有不支持的客户端，请将totalServers设置为1（默认设置），在此设置下程序以传统单服务器方式运行。
```javascript
    "load-balancing": {
        "totalServers": 2,
        "serverIndex": 0
    }
```

## 自行编译 (Optional) (Windows/Linux)
1. 执行`npm install -g typescript`
2. 命令行切换到package.json所在的目录
3. 执行`tsc`

## Linux
> 用root权限打开`/etc/security/limits.conf`加上这几行 (这个是放宽连接数限制的)
```
* hard nofile 65536
* soft nofile 65536
* hard nproc 1024
* soft nproc 1024
```

## Windows

### 修改Registry
> [TcpTimedWaitDelay](https://docs.microsoft.com/en-us/biztalk/technical-guides/settings-that-can-be-modified-to-improve-network-performance)问题
1. `Win-R`打开*run*界面
2. 输入`regedit`打开*Registry Editor*
3. 一路打开目录 *HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters*
4. 右键 `new -> DWORD (32bi-t) Value`
5. 命名为 `TcpTimedWaitDelay`
6. 右键 `TcpTimedWaitDelay`，选`Modify`
7. `Base`那一栏选`Decimal` (10进制)，输入框写30吧（数值区见下表）
8. 设置完成

| Machine Type                              | Range                 |
|-------------------------------------------|-----------------------|
| Windows Server 2012 and earlier           | 30-300 (decimal)      |
| Windows 8 and earlier                     | 30-300 (decimal)      |
| **Windows Server 2012 R2 and later        | 2-300 (decimal)**     |
| **Windows 8.1 and later                   | 2-300 (decimal)**     |

### 修改端口限制
> windows默认仅使用49152向上的端口建立连接 因此实际可用的只有16000个左右 [详情](https://docs.microsoft.com/en-us/windows/client-management/troubleshoot-tcpip-port-exhaust)
1. 以管理员权限运行*powershell*或者*cmd*
2. `netsh int ipv4 show dynamicport tcp` 查看可用起始端口及实际可用数量
3. `netsh int ipv4 set dynamicport tcp start=1025 num=64511` 设置起始1025，由此向上64511
