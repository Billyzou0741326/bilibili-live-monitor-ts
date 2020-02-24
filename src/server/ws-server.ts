import * as WebSocket from 'ws';
import * as chalk from 'chalk';
import * as http from 'http';
import { DelayedTask } from '../task/index';
import { cprint } from '../fmt/index';
import { Raffle } from '../danmu/index';


interface WsAddress {
    readonly port:      number;
    readonly host?:     string;
}

interface ClientStatus {
    isAlive:            boolean;
    readonly socket:    WebSocket;
    readonly addr:      string;
}


abstract class AbstractWsServer {

    private _host:          string;
    private _port:          number;
    private _ws:            WebSocket.Server | null;
    private _errored:       boolean;
    private _healthTask:    DelayedTask;
    protected _clients:     ClientStatus[];

    protected constructor(addr: WsAddress) {
        this._host = addr.host || '127.0.0.1';
        this._port = addr.port;
        this._ws = null;
        this._errored = false;
        this._clients = [];
        this._healthTask = new DelayedTask();
        this._healthTask.withTime(20 * 1000).withCallback((): void => {
            if (this._ws !== null) {
                this._clients = this._clients.filter((clientStatus: ClientStatus): boolean => {
                    const socket = clientStatus.socket;
                    const addr = clientStatus.addr;
                    if (!clientStatus.isAlive) {
                        cprint(`Client disconnected at ${addr}`, chalk.blueBright);
                        socket.removeAllListeners();
                        socket.terminate();
                        return false;
                    }
                    clientStatus.isAlive = false;
                    socket.ping((): void => {});
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


    public get host(): string {
        return this._host;
    }

    public get port(): number {
        return this._port;
    }

    private reset(): void {
        this._ws = null;
        this._errored = false;
        this._healthTask.stop();
        this._clients.forEach((clientStatus: ClientStatus): void => {
            clientStatus.socket.close();
            clientStatus.socket.terminate();
        });
        this._clients = [];
    }

    public stop(): void {
        this.reset();
    }

    public start(): void {
        try {
            if (this._ws === null) {
                this.listen(this.createServer());
            }
        }
        catch (error) {
            cprint(`Failed to setup WS server: ${error.message}`, chalk.red);
        }
    }

    private createServer(): WebSocket.Server {
        const ws = new WebSocket.Server({
            'host': this.host,
            'port': this.port,
            'perMessageDeflate': false,
            'maxPayload': 4 * 1024,
        });
        cprint(`WS server listening on ${this.host}:${this.port}`, chalk.green);
        return ws;
    }

    private listen(ws: WebSocket.Server): void {
        this._ws = ws;

        ws.on('connection', (socket: WebSocket, req: http.IncomingMessage): void => {

            const remoteAddr: string = (
                `${req.socket.remoteAddress}:${req.socket.remotePort}`
            );
            const clientStatus: ClientStatus = {
                socket: socket,
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

    public abstract broadcast(data: Raffle): void;

}

export class WsServer extends AbstractWsServer {

    public constructor(addr: WsAddress) {
        super(addr);
    }

    public broadcast(data: Raffle): void {
        const json = data.toJson();
        if (json.length > 0) {
            this._clients.forEach((clientStatus: ClientStatus): void => {
                const socket = clientStatus.socket;
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(json, {
                        'binary': true,
                    });
                }
            });
        }
    }

}

export class WsServerBilive extends AbstractWsServer {

    public constructor(addr: WsAddress) {
        super(addr);
    }

    public broadcast(data: Raffle): void {
        const payload: string = this.parseMessage(data);
        this._clients.forEach((clientStatus: any): void => {
            const socket: any = clientStatus.socket;
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(payload);
            }
        });
    }

    private parseMessage(data: any): string {
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
