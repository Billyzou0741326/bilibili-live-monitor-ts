import * as WebSocket from 'ws';
import * as chalk from 'chalk';
import * as http from 'http';
import * as net from 'net';
import * as crypto from 'crypto';
import { DelayedTask } from '../task/index';
import { cprint } from '../fmt/index';
import { Raffle } from '../danmu/index';
import {
    AppConfig,
    TCPAddress, } from '../global/index';


interface ClientStatus {
    isAlive:            boolean;
    readonly client:    WebSocket;
    readonly addr:      string;
}


abstract class AbstractWsServer {

    private _appConfig:     AppConfig;
    private _host:          string;
    private _port:          number;
    private _server:        http.Server | null;
    private _ws:            WebSocket.Server | null;
    private _errored:       boolean;
    private _healthTask:    DelayedTask;
    protected _clients:     ClientStatus[];

    protected constructor(addr: TCPAddress) {
        this._host = addr.host || '127.0.0.1';
        this._port = addr.port;
        this._server = null;
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
        this._appConfig = new AppConfig();
        this._appConfig.init();
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
            clientStatus.client.close();
            clientStatus.client.terminate();
        });
        this._clients = [];
    }

    public stop(): void {
        this.reset();
    }

    public start(): void {
        try {
            if (this._ws === null) {
                this.createServer();
                this.listen();
            }
        }
        catch (error) {
            cprint(`Failed to setup WS server: ${error.message}`, chalk.red);
        }
    }

    private createServer(): void {
        this._ws = new WebSocket.Server({
            noServer: true,
            perMessageDeflate: false,
            maxPayload: 4 * 1024
        });

        this._server = http.createServer()
            .listen(this.port, this.host)
            .on('upgrade', (request: http.IncomingMessage, socket: net.Socket, head: Buffer): void => {
                // If no users are defined, allow any connection
                let authenticated: boolean = this._appConfig.users.length === 0;
                if (!authenticated) {
                    try {
                        if (request.headers.hasOwnProperty('authorization')) {
                            const authorization: string[] = Buffer.from(request.headers.authorization!.split(/\s+/).pop()!, 'base64').toString().split(':');
                            const username: string = authorization[0];
                            const password: string = crypto.createHash('sha512').update(authorization[1]).digest('base64');

                            authenticated = this._appConfig.users.find(user => user.id === username && user.password === password) !== undefined;
                        }
                    } catch (error) {
                        cprint(`Client ${socket.remoteAddress}:${socket.remotePort} authentication failure - ${error.message}`, chalk.red);
                        return;
                    }
                }

                if (authenticated) {
                    this._ws!.handleUpgrade(request, socket, head, (ws: WebSocket): void => {
                        this._ws!.emit('connection', ws, request);
                    });
                } else {
                    cprint(`Client ${socket.remoteAddress}:${socket.remotePort} authentication rejected`, chalk.yellow);
                    socket.write('HTTP/1.1 401 Unauthorized\r\n' +
                                 'Date: ' + new Date().toUTCString() + '\r\n' +
                                 'WWW-Authenticate: Basic\r\n' +
                                 '\r\n');
                    socket.destroy();
                }
            });

        cprint(`WS server listening on ${this.host}:${this.port}`, chalk.green);
    }

    private listen(): void {

        this._ws!
            .on('connection', (socket: WebSocket, req: http.IncomingMessage): void => {

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

            })
            .on('error', (error: Error | any) => {
                this._ws!.close((): void => {
                    if (error.code === 'EADDRINUSE') {
                        cprint(`未能建立ws服务 - 端口${this.port}已被占用`, chalk.red);
                        cprint('建议修改``settings.json``中的port值', chalk.red);
                        this._errored = true;
                    } else {
                        cprint(`(WS) - ${error.message}`, chalk.red);
                    }
                });
            })
            .on('close', (): void => {});
    }

    public abstract broadcast(data: Raffle): void;

}

export class WsServer extends AbstractWsServer {

    public constructor(addr: TCPAddress) {
        super(addr);
    }

    public broadcast(data: Raffle): void {
        const json = data.toJson();
        if (json.length > 0) {
            this._clients.forEach((clientStatus: ClientStatus): void => {
                const client = clientStatus.client;
                if (client.readyState === WebSocket.OPEN) {
                    client.send(json, {
                        'binary': true,
                    });
                }
            });
        }
    }

}

export class WsServerBilive extends AbstractWsServer {

    public constructor(addr: TCPAddress) {
        super(addr);
    }

    public broadcast(data: Raffle): void {
        const payload: string = this.parseMessage(data);
        this._clients.forEach((clientStatus: any): void => {
            const client: any = clientStatus.client;
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
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
