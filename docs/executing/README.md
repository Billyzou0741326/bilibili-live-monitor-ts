# Getting Started

## Execution (运行方式)

### 普通运行
 1. 命令行切换到package.json所在的目录
 2. `npm install`                       (执行一次就好)
 3. `npm start`                         (正常运行)

### pm2运行
> 详情前往[pm2官网](https://pm2.io/docs/plus/overview/)
 1. 命令行切换到package.json所在的目录
 2. `npm install`                       (执行一次就好)
 3. `npm install -g pm2`                (执行一次就好)
 4. `pm2 start ecosystem.config.js`

### Docker
docker run --publish 8999:8999 --publish 9001:9001 <image-name>


### API
| API           | Url                           |
|---------------|-------------------------------|
| 大航海        | http://{ip}:9001/guard        |
| 小电视        | http://{ip}:9001/gift         |
| 大乱斗        | http://{ip}:9001/pk           |
| 天选          | http://{ip}:9001/anchor       |
