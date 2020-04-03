import * as net from 'net';
import * as chalk from 'chalk';
import { cprint } from '../fmt/index';
import { Raffle } from '../danmu/index';
import { DelayedTask } from '../task/index';
import {
    AppConfig,
    TCPAddress, } from '../global/index';


interface ClientStatus {
    isAlive:            boolean;
    readonly socket:    net.Socket;
    readonly addr:      string;
    readonly reader:    Reader;
}


abstract class AbstractTCPServer {

    private _host:          string;
    private _port:          number;
    private _socket:        net.Server | null;
    private _errored:       boolean;
    private _healthTask:    DelayedTask;
    protected _clients:     ClientStatus[];

    public constructor(addr: TCPAddress) {
        this._host = addr.host || '0.0.0.0';
        this._port = addr.port;
        this._socket = null;
        this._errored = false;
        this._clients = [];

        this._healthTask = new DelayedTask();
        this._healthTask.withTime(35 * 1000).withCallback((): void => {
            if (this._socket !== null) {
                this._clients = this._clients.filter((clientStatus: ClientStatus): boolean => {
                    const socket = clientStatus.socket;
                    const addr = clientStatus.addr;
                    if (!clientStatus.isAlive) {
                        cprint(`Client disconnected at ${addr}`, chalk.blueBright);
                        socket.removeAllListeners();
                        socket.unref().destroy();
                        return false;
                    }
                    clientStatus.isAlive = false;
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

    private reset(): void {
        this._socket = null;
        this._errored = false;
        this._healthTask.stop();
        this._clients.forEach((clientStatus: ClientStatus): void => {
            clientStatus.socket.unref().destroy();
        });
        this._clients = [];
    }

    public start(): void {
        try {
            if (this._socket === null) {
                this._socket = this.createServer();
                this._socket.listen(this.port, this.host);
                cprint(`TCP server listening on ${this.host}:${this.port}`, chalk.green);
            }
        }
        catch (error) {
            cprint(`Failed to setup WS server: ${error.message}`, chalk.red);
        }
    }

    public stop(): void {
        this.reset();
    }

    protected abstract createReader(): Reader;

    protected abstract onData(data: Buffer | string, client: ClientStatus): void;

    protected abstract parseMessage(data: Buffer | string): Buffer;

    public abstract broadcast(data: Raffle): void;

    private createServer(): net.Server {
        const server: net.Server = net.createServer((c: net.Socket): void => {

            let lastRead = new Date().valueOf();
            let clientStatus: ClientStatus | null = null;
            const reader = this.createReader();

            clientStatus = {
                socket:     c,
                isAlive:    true,
                addr:       c.remoteAddress,
                reader:     reader,
            } as ClientStatus;
            this._clients.push(clientStatus);
            cprint(`Client connected at ${clientStatus.addr}`, chalk.blueBright);

            c.on('connect', (): void => {
                cprint('c.on(\'connect\')', chalk.yellow);
            });

            c.on('error', (error: Error): void => {
                cprint(`(TCP client) - ${error.message}`, chalk.red);
                c.end();
                c.destroy();
                c.unref();
            });

            c.on('data', (data: Buffer | string): void => { 
                if (clientStatus !== null) {
                    this.onData(data, clientStatus);
                }
            });

            c.on('end', (): void => {
                c.destroy();
                c.unref();
            });

            this._healthTask.start();
        });

        server.on('error', (error: Error | any) => {
            server.close((): void => {
                if (error.code === 'EADDRINUSE') {
                    cprint(`未能建立tcp服务 - 端口${this.port}已被占用`, chalk.red);
                    cprint('建议修改``settings.json``中的port值', chalk.red);
                    this._errored = true;
                } else {
                    cprint(`(TCP Server) - ${error.message}`, chalk.red);
                }
            });
        });

        return server;
    }

    public get host(): string {
        return this._host;
    }

    public get port(): number {
        return this._port;
    }
}


export class TCPServerBiliHelper extends AbstractTCPServer {

    constructor(addr: TCPAddress) {
        super(addr);
    }

    protected createReader(): Reader {
        return new BiliHelperReader();
    }

    protected parseMessage(data: Buffer | string): Buffer {
        if (typeof data === 'string') {
            data = Buffer.from(data);
        }
        const headerLen: number = 4;
        const totalLen: number = data.length;

        const header: Buffer = Buffer.alloc(headerLen);
        header.writeUInt32BE(totalLen, 0);

        const buffer: Buffer = Buffer.concat([ header, data ]);

        return buffer;
    }

    protected onData(data: Buffer | string, client: ClientStatus): void{
        const socket = client.socket;
        let msg: Buffer | null = null;

        if (socket.destroyed) return;

        client.reader.onData(data);

        try {

            msg = client.reader.getMessage();

            while (msg !== null) {

                let payload: Buffer | null = null;

                if (msg.length > 0) {
                    const d = JSON.parse(msg.toString());
                    if (d['type'] === 'ask') {
                        payload = this.parseMessage(JSON.stringify({
                            code: 0,
                            type: 'entered',
                            data: {},
                        }));
                    }
                }
                else {
                    payload = this.parseMessage(JSON.stringify({
                        code: 0,
                        type: 'heartbeat',
                        data: {
                            heartbeat:  true,
                            now:        Math.floor(0.001 * new Date().valueOf()),
                        },
                    }));
                    client.isAlive = true;
                }

                payload && socket.write(payload);

                msg = client.reader.getMessage();
            }
        }
        catch (error) {
            cprint(`(TCP client) - ${error.message}`, chalk.red);
            const msg = this.parseMessage(JSON.stringify({
                code: -1,
                type: 'error',
                data: {
                    msg:    error.message,
                },
            }));
            socket.write(msg);
            socket.end();
            socket.destroy();
            socket.unref();
        }
    }

    public broadcast(data: Raffle): void {
        if (this._clients.length === 0) {
            return;
        }

        const wrapper: any = {
            code: 0,
            type: 'raffle',
            data: {},
        };
        const intermediateData: any = {
            room_id:        data.roomid,
            raffle_id:      data.id,
            raffle_type:    '',
            raffle_title:   '',
            source:         'bilibili-live-monitor',
        };

        switch (data.category) {
            case 'gift':
                intermediateData.raffle_type = 'smalltv';
                intermediateData.raffle_title = data.name;
                break;
            case 'storm':
                intermediateData.raffle_type = 'smalltv';
                intermediateData.raffle_title = '节奏风暴';
                break;
            case 'anchor':
                intermediateData.raffle_type = 'anchor';
                intermediateData.raffle_title = '天选时刻';
                break;
            case 'guard':
                intermediateData.raffle_type = 'guard';
                intermediateData.raffle_title = data.name;
                break;
            case 'pk':
                intermediateData.raffle_type = 'pk';
                intermediateData.raffle_title = data.name;
                break;
            default:
                return;
        }
        wrapper.data = intermediateData;

        const msg: Buffer = this.parseMessage(JSON.stringify(wrapper));

        for (const c of this._clients) {
            const socket = c.socket;
            if (socket.destroyed === false) {
                socket.write(msg);
            }
        }
    }
}


interface Reader {
    onData:     (data: Buffer | string) => void;
    getMessage: () => Buffer | null;
}

class BiliHelperReader implements Reader {

    private _data:      Buffer;
    private _totalLen:  number;

    public constructor() {
        this._data = Buffer.alloc(0);
        this._totalLen = 0;
    }

    public onData(data: Buffer | string): void {
        if (typeof data === 'string') {
            data = Buffer.from(data, 'utf8');
        }
        this._data = Buffer.concat([ this._data, data ]);
    }

    public getMessage(): Buffer | null {
        let result: Buffer | null = null;
        if (this._totalLen <= 0 && this._data.length >= 4) {
            this._totalLen = this._data.readUInt32BE(0) + 4;
        }
        if (this._totalLen > 0 && this._data.length >= this._totalLen) {
            result = this._data.slice(4, this._totalLen);
            this._data = this._data.slice(this._totalLen, this._data.length);
            const len = this._data.length;
            if (len === 0) {
                this._totalLen = 0;
                this._data = Buffer.alloc(0);
            }
            else if (len >= 4) {
                this._totalLen = this._data.readUInt32BE(0) + 4;
            }
            else {
                this._totalLen = -1;
            }
        }
        return result;
    }

}

