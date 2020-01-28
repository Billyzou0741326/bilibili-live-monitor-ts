import * as WebSocket from 'ws';
import * as chalk from 'chalk';
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


abstract class AbstractWsServer {

    private _host:          string;
    private _port:          number;
    private _ws:            WebSocket.Server | null;
    private _errored:       boolean;
    private _healthTask:    DelayedTask;
    protected _clients:     ClientStatus[];

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
                        cprint(`Client disconnected at ${addr}`, chalk.blueBright);
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
            cprint(`Failed to setup WS server: ${error.message}`, chalk.red);
        }
    }

    createServer(): WebSocket.Server {
        const ws = new WebSocket.Server({
            'host': this.host,
            'port': this.port,
            'perMessageDeflate': false,
            'maxPayload': 4 * 1024,
        });
        cprint(`WS server listening on ${this.host}:${this.port}`, chalk.green);
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

            cprint(`Client connected at ${remoteAddr}`, chalk.blueBright);


            (socket
                .on('pong', (): void => {
                    clientStatus.isAlive = true;
                })
                .on('error', (error: Error) => {
                    cprint(`(WS client) - ${error.message}`, chalk.red);
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
                    cprint(`未能建立ws服务 - 端口${this.port}已被占用`, chalk.red);
                    cprint('建议修改``settings.json``中的port值', chalk.red);
                    this._errored = true;
                } else {
                    cprint(`(WS) - ${error.message}`, chalk.red);
                }
            });
        });

        ws.on('close', (): void => {});
    }

    abstract broadcast(msg: any): any;

    abstract parseMessage(data: any): any;

}

export class WsServer extends AbstractWsServer {

    constructor(addr: WsAddress) {
        super(addr);
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

export class WsServerBilive extends AbstractWsServer {

    constructor(addr: WsAddress) {
        super(addr);
    }

    broadcast(payload: string): void {
        this._clients.forEach((clientStatus: any): void => {
            const client: any = clientStatus.client;
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    }

    parseMessage(data: any): string {
        const toKey: any = {
            'id':       'id',
            'roomid':   'roomID',
            'name':     'title',
            'type':     'type',
        };

        const translated: any = {};
        Object.keys(toKey).forEach((key: string): void => {
            translated[toKey[key]] = data[key];
        });

        switch (data['category']) {
            case 'gift':
                translated['cmd'] = 'raffle';
                break;
            case 'guard':
                translated['cmd'] = 'lottery';
                break;
            case 'storm':
                translated['cmd'] = 'beatStorm';
                break;
            case 'pk':
                translated['cmd'] = 'pklottery';
                break;
        }

        const str: string = JSON.stringify(translated);
        return str;
    }

}
