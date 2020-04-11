import * as net from 'net';
import * as chalk from 'chalk';
import * as zlib from 'zlib';
import { EventEmitter } from 'events';
import { cprint } from '../fmt/index';
import { Bilibili } from '../bilibili/index';
import {
    AppConfig,
    TCPAddress, } from '../global/index';
import {
    RecurrentTask,
    DelayedTask, } from '../task/index';
import {
    Raffle,
    PK,
    Gift,
    Guard,
    Storm,
    Anchor,
    Danmu, } from './index';


export interface RoomInfo {
    readonly roomid:    number;
    readonly areaid?:   number;
}

interface Startable {
    start(): void;
}

interface Stoppable {
    stop(): void;
}

export abstract class AbstractDanmuTCP extends EventEmitter implements Startable, Stoppable {

    private _host:          string;
    private _port:          number;
    private _roomid:        number;
    private _areaid:        number;
    private _running:       boolean;
    private _closedByUs:    boolean;
    private _socket:        net.Socket | null;
    private _healthTask:    RecurrentTask;
    private _heartbeatTask: RecurrentTask;
    private _lastRead:      Date;
    private _reader:        DanmuTCPReader;
    private _heartbeat:     Buffer;
    private _handshake:     Buffer;

    protected constructor(addr: TCPAddress, info: RoomInfo) {
        super();
        this.bind();
        this._host = addr.host || '127.0.0.1';
        this._port = addr.port;
        this._roomid = info.roomid;
        this._areaid = info.areaid || 0;
        this._running = false;
        this._closedByUs = false;
        this._socket = null;
        this._lastRead = new Date();
        this._healthTask = new RecurrentTask();
        this._heartbeatTask = new RecurrentTask();
        this._reader = new DanmuTCPReader();
        this._heartbeat = this.prepareData(2);
        this._handshake = this.prepareData(7, JSON.stringify({
            roomid: this.roomid,
            platform: 'web',
            clientver: '1.10.6',
            protover: 2,
        }));

        const sendHeartBeat: () => void = (): void => {
            this._socket && this._socket.write(this._heartbeat);
        };
        const closeAfterInactivity: () => void = (): void => {
            if (!this._running) {
                return;
            }
            if (new Date().valueOf() - this._lastRead.valueOf() > 35000) {
                this.close(false);
            }
        };

        this._heartbeatTask.withTime(30 * 1000).withCallback(sendHeartBeat);
        this._healthTask.withTime(10 * 1000).withCallback(closeAfterInactivity);
    }

    private bind(): void {
        this.onConnect = this.onConnect.bind(this);
        this.onData = this.onData.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
    }

    public get running(): boolean {
        return this._running;
    }

    public get roomid(): number {
        return this._roomid;
    }

    public get areaid(): number {
        return this._areaid;
    }

    public start(): void {
        if (this._running === false) {
            this._running = true;
            this._closedByUs = false;
            this.connect();
        }
    }

    public stop(): void {
        if (this._running === true) {
            this.close();
            this._running = false;
        }
    }

    public destroy(): void {
        this.removeAllListeners();
        this.stop();
    }

    private connect(): void {
        const options: any = {
            port: this._port,
            host: this._host,
        };
        if (this._socket === null) {
            this._socket = net.createConnection(options);
        }
        if (this._socket !== null) {
            this._socket.setKeepAlive(true);
            this._socket.on('connect', this.onConnect);
            this._socket.on('data', this.onData);
            this._socket.on('end', this.onEnd);
            this._socket.on('error', this.onError);
            this._socket.on('close', this.onClose);
        }
    }

    private reset(): void {
        this._heartbeatTask.stop();
        this._healthTask.stop();
        if (this._socket !== null) {
            this._socket.unref().destroy();
            this._socket = null;
        }
        this._reader = new DanmuTCPReader();
        this._running = false;
    }

    private onConnect(): void {
        this._healthTask.start();
        this._socket && this._socket.write(this._handshake);
    }

    protected close(closedByUs: boolean = true): void {
        this._closedByUs = closedByUs;
        if (this._socket !== null) {
            this._socket.unref().destroy();
            this._socket = null;
        }
    }

    private onClose(hadError: boolean): void {
        this.reset();
        if (this._closedByUs === false) {
            this.start();
        }
        else {
            this.emit('close', this);
        }
    }

    private onData(data: Buffer | string): void {
        this._lastRead = new Date();
        this._reader.onData(data);

        let messages: Buffer[] = this._reader.getMessages();
        try {
            for (const msg of messages) {
                this.onMessage(msg as Buffer);
            }
        }
        catch (error) {
            // Close, reset
            this.close(false);
        }
    }

    private onMessage(data: Buffer): void {
        const totalLen: number = data.readUInt32BE(0);
        const headerLen: number = data.readUInt16BE(4);
        const cmd: number = data.readUInt32BE(8);

        let jsonStr: string = '';
        let msg: any = {};
        switch (cmd) {
            case 3:
                const popularity: number = data.readUInt32BE(headerLen);
                this.onPopularity(popularity);
                break;
            case 5:
                jsonStr = data.toString('utf8', headerLen, totalLen);
                msg = JSON.parse(jsonStr);
                this.processMsg(msg);
                break;
            case 8:
                if (this._heartbeatTask.running === false) {
                    this._socket && this._socket.write(this._heartbeat);
                    this._heartbeatTask.start();
                }
                break;
        }
    }

    protected abstract processMsg(msg: any): void;

    private onEnd(): void {
    }

    private onError(error: Error): void {
        if (config.tcp_error) {
            const roomid = `${this.roomid}`;
            const remoteAddr = (this._socket && this._socket.remoteAddress) || '';
            cprint(`(TCP) @${roomid.padEnd(13)} ${remoteAddr} - ${error.message}`, chalk.red);
        }
    }

    /**
     * @param   {Integer}   popularity  - # watching stream
     */
    protected onPopularity(popularity: number): number {
        return popularity;
    }

    private prepareData(cmd: number, msg: string = ''): Buffer {
        const body: Buffer = Buffer.from(msg, 'utf8');
        const headerLen: number = 16;
        const totalLen: number = headerLen + body.length;

        const header: Buffer = Buffer.alloc(16);
        header.writeUInt32BE(totalLen, 0);
        header.writeUInt16BE(headerLen, 4);
        header.writeUInt16BE(1, 6);
        header.writeUInt32BE(cmd, 8);
        header.writeUInt32BE(1, 12);

        const buffer: Buffer = Buffer.concat([ header, body ]);

        return buffer;
    }

}


enum DanmuTarget {
    GIFT =      0b00000001,
    GUARD =     0b00000010,
    STORM =     0b00000100,
    ANCHOR =    0b00001000,
    NOTICE =    0b00010000,
    DANMU =     0b00100000,
}

export abstract class DanmuTCP extends AbstractDanmuTCP {

    private targets:            number;
    protected _peak_popularity: number;

    protected constructor(addr: TCPAddress, info: RoomInfo, targets: number = 0b11111111) {
        super(addr, info);
        this.targets = targets;
        this._peak_popularity = 0;
    }

    protected processMsg(msg: any): void {
        if (msg['scene_key']) {
            msg = msg['msg'];
        }

        const cmd: string = msg['cmd'];
        switch (cmd) {
            case 'DANMU_MSG':
                if ((this.targets & DanmuTarget.DANMU) === DanmuTarget.DANMU)
                    this.onDanmu(msg);
                break;
            case 'GUARD_LOTTERY_START':
                if ((this.targets & DanmuTarget.GUARD) === DanmuTarget.GUARD)
                    this.onGuard(msg);
                break;
            case 'TV_START':
                if ((this.targets & DanmuTarget.GIFT) === DanmuTarget.GIFT)
                    this.onTV(msg);
                break;
            case 'RAFFLE_START':
                if ((this.targets & DanmuTarget.GIFT) === DanmuTarget.GIFT)
                    this.onRaffle(msg);
                break;
            case 'SPECIAL_GIFT':
                if ((this.targets & DanmuTarget.STORM) === DanmuTarget.STORM)
                    this.onSpecialGift(msg);
                break;
            case 'PK_LOTTERY_START':
                if ((this.targets & DanmuTarget.GIFT) === DanmuTarget.GIFT)
                    this.onPkLottery(msg);
                break;
            case 'ANCHOR_LOT_START':
                if ((this.targets & DanmuTarget.ANCHOR) === DanmuTarget.ANCHOR)
                    this.onAnchorLottery(msg);
                break;
            case 'NOTICE_MSG':
                if ((this.targets & DanmuTarget.NOTICE) === DanmuTarget.NOTICE)
                    this.onNoticeMsg(msg);
                break;
            case 'PREPARING':
                this.onPreparing(msg);
                break;
            case 'ROOM_CHANGE':
                this.onRoomChange(msg);
                break;
            case 'PREPARING':
                this.onPreparing(msg);
                break;
            case 'LIVE':
                this.onLive(msg);
                break;
            default:
                break;
        }
    }

    protected onDanmu(msg: any): Danmu | null {
        const data: any[] = msg['info'];
        const dataOk: boolean = typeof data !== 'undefined';

        let result: Danmu | null = null;
        if (dataOk) {
            const msg: string = data[1];
            const uid: number = data[2][0];
            const sender: string = data[2][1];
            const time: number = data[9]['ts'];

            result = {
                uid:    uid,
                msg:    msg,
                sender: sender,
                time:   time,
            } as Danmu;
        }

        return result;
    }

    /**
     * @param   {Object}    msg
     * @param   {String}    msg.cmd
     * @param   {Object}    msg.data
     * @param   {Integer}   msg.data.raffleId
     * @param   {Integer}   msg.data.time
     * @param   {Integer}   msg.data.time_wait
     * @param   {String}    msg.data.type
     * @param   {String}    msg.data.title
     * @returns {Raffle|null} gift info
     */
    protected onRaffle(msg: any): Raffle | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        let gift: Raffle | null = null;
        if (dataOk) {
            const t: string = data['type'];
            const id: number = data['raffleId'];
            const name: string = data['title'] || '未知';
            const wait: number = data['time_wait'] > 0 ? data['time_wait'] : 0;
            const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
            gift = new Gift()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name)
                .withWait(wait)
                .withExpireAt(expireAt);
        }

        return gift;
    }

    /**
     * @param   {Object}    msg
     * @param   {String}    msg.cmd
     * @param   {Object}    msg.data
     * @param   {Integer}   msg.data.raffleId
     * @param   {Integer}   msg.data.time
     * @param   {Integer}   msg.data.time_wait
     * @param   {String}    msg.data.type
     * @param   {String}    msg.data.title
     * @returns {Raffle|null}
     */
    protected onTV(msg: any): Raffle | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        let gift: Raffle | null = null;
        if (dataOk) {
            const t: string = data['type'];
            const id: number = data['raffleId'];
            const name: string = data['title'] || '未知';
            const wait: number = data['time_wait'] > 0 ? data['time_wait'] : 0;
            const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
            gift = new Gift()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name)
                .withWait(wait)
                .withExpireAt(expireAt);
        }

        return gift;
    }

    /**
     * @param   {Object}    msg
     * @param   {String}    msg.cmd
     * @param   {Object}    msg.data
     * @param   {Integer}   msg.data.id
     * @param   {Integer}   msg.data.privilege_type
     * @param   {String}    msg.data.type
     * @param   {Object}    msg.data.lottery
     * @param   {Integer}   msg.data.lottery.time
     * @returns {Guard|null}
     */
    protected onGuard(msg: any): Raffle | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        const nameOfType: any = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };

        let guard: Raffle | null = null;
        if (dataOk) {
            const lottery: any = data['lottery'] || {};
            const lotteryOk: boolean = typeof lottery !== 'undefined';

            const t: string = data['type'];
            const id: number = data['id'];
            const name: string = nameOfType[data['privilege_type']];
            const expireAt: number = (lottery['time'] || 0) + Math.floor(0.001 * new Date().valueOf());
            guard = new Guard()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name)
                .withExpireAt(expireAt);
        }

        return guard;
    }

    /**
     * @returns     {Raffle|null}
     */
    protected onSpecialGift(msg: any): Raffle | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        if (!dataOk) return null;

        const info: any = data['39'];
        const infoOk: boolean = typeof info !== 'undefined';
        if (!infoOk) return null;

        let details: Raffle | null = null;
        if (info['action'] === 'start') {
            const id: number = info['id'];
            const expireAt: number = info['time'] + Math.floor(0.001 * new Date().valueOf());
            details = new Storm()
                .withId(id)
                .withRoomid(this.roomid)
                .withType('storm')
                .withName('节奏风暴')
                .withExpireAt(expireAt);
        }

        return details;
    }

    /**
     * @returns     {Raffle|null}
     */
    protected onPkLottery(msg: any): Raffle | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        let pk: Raffle | null = null;
        if (dataOk) {
            const id: number = data['id'];
            const roomid: number = data['room_id'];
            const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
            pk = new PK()
                .withId(id)
                .withRoomid(roomid)
                .withType('pk')
                .withName('大乱斗')
                .withExpireAt(expireAt);
        }

        return pk;
    }

    /**
     * @returns     {Raffle|null}
     */
    protected onAnchorLottery(msg: any): Raffle | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        let details: Raffle | null = null;
        if (dataOk) {
            const id: number = data['id'];
            const roomid: number = data['room_id'];
            const name: string = data['award_name'];
            const award_num: number = data['award_num'];
            const gift_name: string = data['gift_name'];
            const gift_num: number = data['gift_num'];
            const gift_price: number = data['gift_price'];
            const require_text: string = data['require_text'];
            const danmu: string = data['danmu'];
            const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
            details = new Anchor()
                .withId(id)
                .withRoomid(roomid)
                .withGiftPrice(gift_price)
                .withGiftName(gift_name)
                .withGiftNum(gift_num)
                .withDanmu(danmu)
                .withRequirement(require_text)
                .withName(name)
                .withAwardNum(award_num)
                .withType('anchor')
                .withExpireAt(expireAt);
        }

        return details;
    }

    protected onNoticeMsg(msg: any) {
    }

    protected onPreparing(msg: any) {
    }

    protected onLive(msg: any) {
    }

    protected onRoomChange(msg: any) {
    }

    protected onPopularity(popularity: number): number {
        let result: number = super.onPopularity(popularity);
        this._peak_popularity = Math.max(this._peak_popularity, popularity);
        this._peak_popularity = this._peak_popularity || 0;
        return result;
    }
}

export class DanmuMonitor extends DanmuTCP {

    public constructor(addr: TCPAddress, info: RoomInfo) {
        super(addr, info, DanmuTarget.DANMU);
    }

    protected onDanmu(msg: any): Danmu | null {
        const data: Danmu | null = super.onDanmu(msg);

        if (data !== null) {
            this.emit('danmu', data);
        }

        return data;
    }
}

export class FixedGuardMonitor extends DanmuTCP {

    private _delayedTasks:  DelayedTask[];

    public constructor(addr: TCPAddress, info: RoomInfo) {
        const targets: number = (
            DanmuTarget.GIFT
            | DanmuTarget.GUARD
            | DanmuTarget.STORM
            | DanmuTarget.ANCHOR
        );
        super(addr, info, targets);
        this._delayedTasks = ([] as DelayedTask[]);
    }

    public destroy(): void {
        super.destroy();
        for (const t of this._delayedTasks) {
            t.stop();
        }
        this._delayedTasks = ([] as DelayedTask[]);
    }

    private clearTasks(): void {
        const tasks = this._delayedTasks;
        this._delayedTasks = tasks.filter((t: DelayedTask): boolean => t.running);
    }

    protected onAnchorLottery(msg: any): Raffle | null {
        const data: Raffle | null = super.onAnchorLottery(msg);
        if (data !== null) {
            this.emit('anchor', data);
        }
        return data;
    }

    protected onTV(msg: any): Raffle | null {
        const data: Raffle | null = super.onTV(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            const t = new DelayedTask();
            t.withTime(data.wait * 1000).withCallback((): void => {
                this.emit('gift', data);
                this.clearTasks();      // free memory
            });
            t.start();
        }
        return data;
    }

    protected onRaffle(msg: any): Raffle | null {
        const data: Raffle | null = super.onRaffle(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            const t = new DelayedTask();
            t.withTime(data.wait * 1000).withCallback((): void => {
                this.emit('gift', data);
                this.clearTasks();      // free memory
            });
            t.start();
        }
        return data;
    }

    protected onPkLottery(msg: any): Raffle | null {
        const data: Raffle | null = super.onPkLottery(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('pk', data);
        }
        return data;
    }

    protected onGuard(msg: any): Raffle | null {
        const data: Raffle | null = super.onGuard(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('guard', data);
        }
        return data;
    }

    protected onSpecialGift(msg: any): Raffle | null {
        const data: Raffle | null = super.onSpecialGift(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('storm', data);
        }
        return data;
    }
}

export class DynamicGuardMonitor extends FixedGuardMonitor {

    private _offTimes:          number;
    private _newAnchorCount:    number;
    private _newGuardCount:     number;
    private _newStormCount:     number;
    private _newGiftCount:      number;
    private _toFixed:           boolean;
    private _canClose:          boolean;

    public constructor(addr: TCPAddress, info: RoomInfo) {
        super(addr, info);
        this._offTimes = 0;
        this._newAnchorCount = 0;
        this._newGuardCount = 0;
        this._newStormCount = 0;
        this._newGiftCount = 0;
        this._toFixed = false;
        this._canClose = false;
    }

    public  get toFixed(): boolean {
        return (
            this._toFixed
            || this._newAnchorCount > 0
            || this._newGuardCount > 0
            || this._newStormCount > 0
            || this._newGiftCount > 1
        );
    }

    protected onAnchorLottery(msg: any): Raffle | null {
        const data: Raffle | null = super.onAnchorLottery(msg);
        if (data !== null) {
            ++this._newAnchorCount;
        }
        return data;
    }

    protected onRaffle(msg: any): Raffle | null {
        const data: Raffle | null = super.onRaffle(msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    }

    protected onTV(msg: any): Raffle | null {
        const data: Raffle | null = super.onTV(msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    }

    protected onGuard(msg: any): Raffle | null {
        const data: Raffle | any = super.onGuard(msg);
        if (data !== null) {
            ++this._newGuardCount;
        }
        return data;
    }

    protected onPkLottery(msg: any): Raffle | null {
        const data: Raffle | any = super.onPkLottery(msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    }

    protected onSpecialGift(msg: any): Raffle | null {
        const data: Raffle | any = super.onSpecialGift(msg);
        if (data !== null) {
            ++this._newStormCount;
        }
        return data;
    }

    protected onPreparing(msg: any): void {
        this._canClose = true;
    }

    protected onLive(msg: any): void {
        this._canClose = false;
    }

    protected onPopularity(popularity: number): number {
        let result: number = super.onPopularity(popularity);

        if (popularity <= 1) {
            ++this._offTimes;

            if (this._offTimes > 50) {
                this._canClose = true;
            }
            if (this._offTimes > 10) {

                if (this._peak_popularity > 50000) {
                    this._toFixed = true;
                }
                if (this._canClose === true) {
                    this.close(true);
                }
            }
        }
        else {
            this._offTimes = 0;
            this._canClose = false;
        }

        return result;
    }
}


export class RaffleMonitor extends DanmuTCP {

    public constructor(addr: TCPAddress, info: RoomInfo) {
        const targets: number = DanmuTarget.NOTICE
        super(addr, info, targets);
    }

    protected onNoticeMsg(msg: any): void {
        const msg_type: number = msg['msg_type'];
        const roomid: number = msg['real_roomid'];

        switch (msg_type) {
            case 2:
                // fall through
            case 4:
                // fall through
            case 6:
                this.emit('roomid', roomid);
                break;
        }
    }

    protected onPreparing(msg: any): void {
        if (this.areaid !== 0) {
            this.close(true);
        }
    }

    protected onRoomChange(msg: any): void {
        const changedInfo: any = msg['data'];
        const newAreaid: number = (changedInfo && changedInfo['parent_area_id']) || 0;
        if (this.areaid !== 0 && newAreaid !== this.areaid) {
            this.close(true);
        }
    }

    protected onPopularity(popularity: number): number {
        let result: number = super.onPopularity(popularity);
        if (popularity <= 1) {
            Bilibili.isLive(this.roomid).then((streaming: boolean): void => {
                if (streaming === false) {
                    this.close(true);
                }
            }).catch((error: Error) => {
                cprint(`Bilibili.isLive - ${error.message}`, chalk.red);
            });
        }
        return result;
    }
}


class DanmuTCPReader {

    private _data:          Buffer;
    private _nextMsgLen:    number;

    public constructor() {
        this._data = Buffer.alloc(0);
        this._nextMsgLen = 0;
    }

    public onData(data: Buffer | string): void {
        if (typeof data === 'string') {
            data = Buffer.from(data, 'utf8');
        }
        this._data = Buffer.concat([ this._data, data ]);
    }

    public getMessages(): Buffer[] {
        let result: Buffer[] = [];

        if (this._nextMsgLen <= 0 && this._data.length >= 4) {
            this._nextMsgLen = this._data.readUInt32BE(0);
        }

        while (this._nextMsgLen > 0 && this._data.length >= this._nextMsgLen) {
            if (this._data.readUInt16BE(6) === 2 && this._data.readUInt32BE(8) === 5) {
                const m = this.getMessagesCompressed(this._data.slice(16, this._nextMsgLen));
                for (const d of m) {
                    result.push(d);
                }
            } else {
                result.push(this._data.slice(0, this._nextMsgLen));
            }
            this._data = this._data.slice(this._nextMsgLen, this._data.length);

            const len = this._data.length;
            if (len === 0) {
                this._nextMsgLen = 0;
                this._data = Buffer.alloc(0);
            }
            else if (len >= 4) {
                this._nextMsgLen = this._data.readUInt32BE(0);
            }
            else {
                this._nextMsgLen = -1;
            }
        }

        return result;
    }

    private getMessagesCompressed(d: Buffer): Buffer[] {
        d = this.unzip(d);

        let len = d.readUInt32BE(0);
        const result: Buffer[] = [];

        while (len > 0 && d.length >= len) {
            result.push(d.slice(0, len));
            d = d.slice(len, d.length);

            const l = d.length;
            if (l === 0) {
                len = 0;
            }
            else if (l >= 4) {
                len = d.readUInt32BE(0);
            }
            else {
                len = -1;
            }
        }

        return result;
    }

    private unzip(d: Buffer): Buffer {
        return zlib.inflateSync(d);
    }

}

const config = new AppConfig();
config.readArgs();
