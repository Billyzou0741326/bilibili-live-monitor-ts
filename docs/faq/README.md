# FAQ

## Linux运行出现EMFILE Error怎么处理？
EMFILE报错说明系统开启的file descriptor超出限制了，一般Linux默认的nofile上限是1024，这显然是不够的。

1. 以root权限打开`/etc/security/limits.conf`加上这几行：  
    ```
    * hard nofile 65536
    * soft nofile 65536
    * hard nproc 1024
    * soft nproc 1024
    ```
2. 重新登录命令行

## Windows运行出现大量http request aborted怎么处理？
Windows系统也有端口限制，默认仅使用49152向上的端口建立连接，因此实际可用的只有16000个左右

1. 以管理员权限运行*powershell*或者*cmd*
2. `netsh int ipv4 show dynamicport tcp` 查看可用起始端口及实际可用数量
3. `netsh int ipv4 set dynamicport tcp start=1025 num=64511` 设置起始1025，由此向上64511
