# 运行前

## Requirements
 - 运行环境[node.js](https://nodejs.org/en/download/)

## Config file 设置 (src/settings.json)
> 修改settings后务必[重新编译](#自行编译-optional-windowslinux)

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

## 自行编译 (Optional) (Windows/Linux)
1. 执行`npm install -g typescript`
2. 命令行切换到package.json所在的目录
3. 执行`tsc`

## Linux
> 用root权限打开`/etc/security/limits.conf`加上这两行 (这个是放宽连接数限制的)
```
* hard nofile 65536
* soft nofile 65536
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
