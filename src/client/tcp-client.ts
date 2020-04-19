import * as net from 'net';
import * as chalk from 'chalk';
import { EventEmitter } from 'events';
import { TCPAddress } from '../global/index';
import { cprint } from '../fmt/index';
import { DelayedTask } from '../task/index';
import {
    Raffle,
    PK,
    Gift,
    Guard,
    Storm,
    Anchor, } from '../danmu/index';


export class TCPConn extends EventEmitter {

    protected socket_:              net.Socket;

    constructor() {
        super();
        this.socket_ = new net.Socket();
        this.bind_();
    }

    public bind_() {
        this.onData = this.onData.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onConnect = this.onConnect.bind(this);
    }

    public connect(addr: TCPAddress): void {
        if (this.socket_.destroyed) {
            this.socket_ = new net.Socket();
        }
        this.socket_.connect({
            host: addr.host || '0.0.0.0',
            port: addr.port || 0,
        });
        this.socket_.
            on('connect', this.onConnect).
            on('close', this.onClose).
            on('error', this.onError).
            on('data', this.onData);

    }

    protected onData(d: Buffer | string): Buffer {
        if (typeof d === 'string') {
            d = Buffer.from(d);
        }
        return d;
    }

    protected onClose(hadError: boolean): void {
    }

    protected onConnect(): void {
    }

    protected onError(e: Error): Error {
        return e;
    }
}


export class TCPClientLK extends TCPConn {

    private reader_:            TCPReader;
    private heartbeat_:         Buffer;
    private heartbeat_task_:    DelayedTask;

    constructor() {
        super();
        this.reader_ = new TCPReader();
        this.heartbeat_ = Buffer.from([0,0,0,0]);
        this.heartbeat_task_ = new DelayedTask().
            withTime(30 * 1000).
            withCallback((): void => {
                if (this.socket_.destroyed) return;
                this.socket_.write(this.heartbeat_);
                this.heartbeat_task_.start();
            });
    }

    protected onConnect(): void {
        this.sendHandshake();
    }

    protected sendHandshake(): void {
        if (this.socket_.destroyed) return;
        const data = JSON.stringify({
            "code": 0,
            "type": "ask",
            "data": {
                "key": ",*(?PVl]nIbo35sB",
            },
        });
        const header = Buffer.alloc(4);
        header.writeUInt32BE(data.length, 0);
        this.socket_.write(Buffer.concat([ header, Buffer.from(data) ]));
    }

    protected onClose(hadError: boolean): void {
        this.heartbeat_task_.stop();
        this.socket_.unref().destroy();
    }

    protected onData(data: Buffer | string): Buffer {
        const d = super.onData(data);
        this.reader_.onData(d);

        const messages: Buffer[] = this.reader_.getMessages();
        for (const msg of messages) {
            try {
                const data: any = JSON.parse(msg.slice(4).toString());

                switch (data['type']) {
                    case 'raffle':
                        this.emitRaffle(data['data']);
                        break;
                    case 'error':
                    case 'heartbeat':
                    case 'sleep':
                    case 'update':
                    case 'exit':
                        break;
                    case 'entered':
                        this.socket_.write(this.heartbeat_);
                        this.heartbeat_task_.start();
                        break;
                }
            } catch (error) {
                cprint(`(LK Reader) - ${error.message}`, chalk.red);
            }
        }

        return d;
    }

    private emitRaffle(data: any): void {
        switch (data['raffle_type']) {
            case 'storm': {
                const g = new Storm().
                    withRoomid(data['room_id']).
                    withId(data['raffle_id']).
                    withType(data['raffle_type']).
                    withName(data['raffle_title']).
                    withExpireAt(Math.floor(0.001 * (new Date().valueOf())) + 20);
                this.emit(data['raffle_type'], g);
            }
                break;
            case 'guard': {
                const g = new Guard().
                    withRoomid(data['room_id']).
                    withId(data['raffle_id']).
                    withType(data['raffle_type']).
                    withName(data['raffle_title']).
                    withExpireAt(Math.floor(0.001 * (new Date().valueOf())) + 120 * 60);
                this.emit(data['raffle_type'], g);
            }
                break;
            case 'pk': {
                const g = new PK().
                    withRoomid(data['room_id']).
                    withId(data['raffle_id']).
                    withType(data['raffle_type']).
                    withName(data['raffle_title']).
                    withExpireAt(Math.floor(0.001 * (new Date().valueOf())) + 60);
                this.emit(data['raffle_type'], g);
            }
                break;
            case 'anchor':
            case 'raffle':
            case 'small_tv': {
                this.emit('roomid', data['room_id']);
                break;
            }
        }
    }

}


class TCPReader {

    private buf_:           Buffer;
    private next_size_:     number;

    constructor() {
        this.buf_ = Buffer.alloc(0);
        this.next_size_ = 0;
    }

    public onData(d: Buffer): void {
        this.buf_ = Buffer.concat([ this.buf_, d ]);
    }

    public getMessages(): Buffer[] {
        const result: Buffer[] = [];

        while (this.next_size_ <= 0 && this.buf_.length >= 4) {
            this.next_size_ = this.buf_.readUInt32BE(0);
            if (this.next_size_ <= 0) {
                this.buf_ = this.buf_.slice(4);
            }
        }
        while (this.next_size_ > 0 && this.buf_.length >= this.next_size_) {
            result.push(this.buf_.slice(0, 4 + this.next_size_));
            this.buf_ = this.buf_.slice(4 + this.next_size_, this.buf_.length);

            if (this.buf_.length >= 4) {
                this.next_size_ = this.buf_.readUInt32BE(0);
            } else if (this.buf_.length === 0) {
                this.next_size_ = 0;
            }
        }

        return result;
    }
}

