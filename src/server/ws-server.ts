import * as WebSocket from 'ws';
import * as colors from 'colors/safe';
import * as http from 'http';
import { DelayedTask } from '../task/index';
import { cprint } from '../fmt/index';



interface WsAddress {
    readonly port:      number;
    readonly host?:     string;
}

interface ClientStatus {
    isAlive:            boolean;
    readonly client:    WebSocket;
    readonly addr:      string;
}

export class WsServer {

    private _host:          string;
    private _port:          number;
    private _ws:            WebSocket.Server | null;
    private _errored:       boolean;
    private _healthTask:    DelayedTask;
    private _clients:       ClientStatus[];

    constructor(addr: WsAddress) {
        this._host = addr.host || '127.0.0.1';
        this._port = addr.port;
        this._ws = null;
        this._errored = false;
        this._clients = [];
        this._healthTask = new DelayedTask();
        this._healthTask.withTime(20 * 1000).withCallback((): void => {
            if (this._ws !== null) {
                this._clients = this._clients.filter((clientStatus: ClientStatus): boolean => {
                    const client = clientStatus.client;
                    const addr = clientStatus.addr;
                    if (!clientStatus.isAlive) {
                        cprint(`Client disconnected at ${addr}`, colors.blue);
                        client.removeAllListeners();
                        client.terminate();
                        return false;
                    }
                    clientStatus.isAlive = false;
                    client.ping((): void => {});
                    return true;
                });
                if (this._clients.length > 0) {
                    this._healthTask.start();
                }
            }
            else {
                this._healthTask.stop();
            }
        });
    }

    get host(): string {
        return this._host;
    }

    get port(): number {
        return this._port;
    }

    reset(): void {
        this._ws = null;
        this._errored = false;
        this._healthTask.stop();
        this._clients.forEach((clientStatus: ClientStatus): void => {
            clientStatus.client.close();
            clientStatus.client.terminate();
        });
        this._clients = [];
    }

    stop(): void {
        this.reset();
    }

    start(): void {
        try {
            if (this._ws === null) {
                this.listen(this.createServer());
            }
        }
        catch (error) {
            cprint(`Failed to setup WS server: ${error.message}`, colors.red);
        }
    }

    createServer(): WebSocket.Server {
        const ws = new WebSocket.Server({
            'host': this.host,
            'port': this.port,
            'perMessageDeflate': false,
            'maxPayload': 4 * 1024,
        });
        cprint(`WS server listening on ${this.host}:${this.port}`, colors.green);
        return ws;
    }

    listen(ws: WebSocket.Server): void {
        this._ws = ws;

        ws.on('connection', (socket: WebSocket, req: http.IncomingMessage): void => {

            const remoteAddr: string = (
                `${req.socket.remoteAddress}:${req.socket.remotePort}`
            );
            const clientStatus: ClientStatus = {
                client: socket,
                isAlive: true,
                addr: remoteAddr,
            };
            this._clients.push(clientStatus);

            cprint(`Client 连接建立于 @${remoteAddr}`, colors.magenta);


            (socket
                .on('pong', (): void => {
                    clientStatus.isAlive = true;
                })
                .on('error', (error: Error) => {
                    cprint(`(WS client) - ${error.message}`, colors.red);
                    socket.close();
                })
                .on('message', (in_message: string | Buffer | ArrayBuffer | Buffer[]): void => {})
                .on('close', (): void => {
                    clientStatus.isAlive = false;
                })
            );

            this._healthTask.start();

        });

        ws.on('error', (error: Error | any) => {
            ws.close((): void => {
                if (error.code === 'EADDRINUSE') {
                    cprint(`未能建立ws服务 - 端口${this.port}已被占用`, colors.red);
                    cprint('建议修改``settings.json``中的port值', colors.red);
                    this._errored = true;
                } else {
                    cprint(`(WS) - ${error.message}`, colors.red);
                }
            });
        });

        ws.on('close', (): void => {});
    }

    broadcast(payload: Buffer): void {
        this._clients.forEach((clientStatus: ClientStatus): void => {
            const client = clientStatus.client;
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload, {
                    'binary': true,
                });
            }
        });
    }

    parseMessage(message: any): Buffer {
        const str = JSON.stringify(message);
        const data = Buffer.from(str);
        return data;
    }

}
