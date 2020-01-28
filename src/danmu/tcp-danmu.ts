import * as net from 'net';
import * as chalk from 'chalk';
import { EventEmitter } from 'events';
import { cprint } from '../fmt/index';
import { Bilibili } from '../bilibili/index';
import { AppConfig } from '../global/index';
import {
    RecurrentTask,
    DelayedTask, } from '../task/index';
import {
    PK,
    Gift,
    Guard,
    Storm,
    Anchor,
    PKBuilder,
    GiftBuilder,
    GuardBuilder,
    StormBuilder,
    AnchorBuilder, } from './index';



interface TCPAddress {
    readonly host?:     string;
    readonly port:      number;
}

interface RoomInfo {
    readonly roomid:    number;
    readonly areaid?:   number;
}

interface Startable {
    start(): void;
}

interface Stoppable {
    stop(): void;
}

export class AbstractDanmuTCP extends EventEmitter implements Startable, Stoppable {

    private _host:          string;
    private _port:          number;
    private _roomid:        number;
    private _areaid:        number;
    private _running:       boolean;
    private _closedByUs:    boolean;
    private _socket:        net.Socket | null;
    private _remoteAddr:    string;
    private _healthTask:    RecurrentTask;
    private _heartbeatTask: RecurrentTask;
    private _lastRead:      Date;
    private _reader:        DanmuTCPReader;
    private _heartbeat:     Buffer;
    private _handshake:     Buffer;

    constructor(addr: TCPAddress, info: RoomInfo) {
        super();
        this.bind();
        this._host = addr.host || 'localhost';
        this._port = addr.port;
        this._roomid = info.roomid;
        this._areaid = info.areaid || 0;
        this._running = false;
        this._closedByUs = false;
        this._socket = null;
        this._remoteAddr = '';
        this._lastRead = new Date();
        this._healthTask = new RecurrentTask();
        this._heartbeatTask = new RecurrentTask();
        this._reader = new DanmuTCPReader();
        this._heartbeat = this.prepareData(2);
        this._handshake = this.prepareData(7, JSON.stringify({
            roomid: this.roomid,
            platform: 'web',
            clientver: '1.8.12',
        }));

        const sendHeartBeat: () => void = (): void => {
            this._socket && this._socket.write(this._heartbeat);
        };
        const closeAfterInactivity: () => void = (): void => {
            if (this._running) {
                if (new Date().valueOf() - this._lastRead.valueOf() > 35000) {
                    this.close(false);
                }
            }
        };

        this._heartbeatTask.withTime(30 * 1000).withCallback(sendHeartBeat);
        this._healthTask.withTime(10 * 1000).withCallback(closeAfterInactivity);
    }

    bind(): void {
        this.onConnect = this.onConnect.bind(this);
        this.onData = this.onData.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
    }

    get running(): boolean {
        return this._running;
    }

    get roomid(): number {
        return this._roomid;
    }

    get areaid(): number {
        return this._areaid;
    }

    start(): void {
        if (this._running === false) {
            this._running = true;
            this._closedByUs = false;
            this.connect();
        }
    }

    stop(): void {
        if (this._running === true) {
            this.close();
            this._running = false;
        }
    }

    destroy(): void {
        this.removeAllListeners();
        this.stop();
    }

    connect(): void {
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

    reset(): void {
        this._heartbeatTask.stop();
        this._healthTask.stop();
        if (this._socket !== null) {
            this._socket.unref().destroy();
            this._socket = null;
        }
        this._reader = new DanmuTCPReader();
        this._running = false;
    }

    onConnect(): void {
        this._healthTask.start();
        this._remoteAddr = (this._socket && this._socket.remoteAddress) || '';
        this._socket && this._socket.write(this._handshake);
    }

    close(closedByUs: boolean = true): void {
        this._closedByUs = closedByUs;
        if (this._socket !== null) {
            this._socket.unref().destroy();
            this._socket = null;
        }
    }

    onClose(hadError: boolean): void {
        this.reset();
        if (this._closedByUs === false) {
            this.start();
        }
        else {
            this.emit('close');
        }
    }

    onData(data: Buffer | string): void {
        this._lastRead = new Date();
        this._reader.onData(data);

        let msg: Buffer | null = this._reader.getMessage();
        try {
            while (msg !== null) {
                this.onMessage(msg as Buffer);
                msg = this._reader.getMessage();
            }
        }
        catch (error) {
            // Close, reset
            this.close(false);
        }
    }

    onMessage(data: Buffer): void {
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

    processMsg(msg: any): void {
    }

    onEnd(): void {
    }

    onError(error: Error): void {
        if (config.tcp_error) {
            const roomid = `${this.roomid}`;
            cprint(`(TCP) @${roomid.padEnd(13)} ${this._remoteAddr} - ${error.message}`, chalk.red);
        }
    }

    /**
     * @param   {Integer}   popularity  - # watching stream
     */
    onPopularity(popularity: number): number {
        return popularity;
    }

    prepareData(cmd: number, msg: string = ''): Buffer {
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
}

export class DanmuTCP extends AbstractDanmuTCP {

    private targets:            number;
    protected _peak_popularity: number;

    constructor(addr: TCPAddress, info: RoomInfo, targets: number = 0b11111111) {
        super(addr, info);
        this.targets = targets;
        this._peak_popularity = 0;
    }

    processMsg(msg: any): void {
        if (msg['scene_key']) {
            msg = msg['msg'];
        }

        const cmd: string = msg['cmd'];
        switch (cmd) {
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

    /**
     * @param   {Object}    msg
     * @param   {String}    msg.cmd
     * @param   {Object}    msg.data
     * @param   {Integer}   msg.data.raffleId
     * @param   {Integer}   msg.data.time
     * @param   {Integer}   msg.data.time_wait
     * @param   {String}    msg.data.type
     * @param   {String}    msg.data.title
     * @returns {Gift}      gift info
     */
    onRaffle(msg: any): Gift | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        let gift: Gift | null = null;
        if (dataOk) {
            const t: string = data['type'];
            const id: number = data['raffleId'];
            const name: string = data['title'] || '未知';
            const wait: number = data['time_wait'] > 0 ? data['time_wait'] : 0;
            const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
            gift = (GiftBuilder.start()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name)
                .withWait(wait)
                .withExpireAt(expireAt)
                .build());
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
     * @returns {Gift}      gift info
     */
    onTV(msg: any): Gift | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        let gift: Gift | null = null;
        if (dataOk) {
            const t: string = data['type'];
            const id: number = data['raffleId'];
            const name: string = data['title'] || '未知';
            const wait: number = data['time_wait'] > 0 ? data['time_wait'] : 0;
            const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
            gift = (GiftBuilder.start()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name)
                .withWait(wait)
                .withExpireAt(expireAt)
                .build());
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
     * @returns {Guard}     guard info
     */
    onGuard(msg: any): Guard | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        const nameOfType: any = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };

        let guard: Guard | null = null;
        if (dataOk) {
            const lottery: any = data['lottery'] || {};
            const lotteryOk: boolean = typeof lottery !== 'undefined';

            const t: string = data['type'];
            const id: number = data['id'];
            const name: string = nameOfType[data['privilege_type']];
            const expireAt: number = (lottery['time'] || 0) + Math.floor(0.001 * new Date().valueOf());
            guard = (GuardBuilder.start()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name)
                .withExpireAt(expireAt)
                .build());
        }

        return guard;
    }

    /**
     * @returns     {Object}    .id .roomid .type .name
     */
    onSpecialGift(msg: any): Storm | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        if (!dataOk) return null;

        const info: any = data['39'];
        const infoOk: boolean = typeof info !== 'undefined';
        if (!infoOk) return null;

        let details: Storm | null = null;
        if (info['action'] === 'start') {
            const id: string = info['id'];
            const expireAt: number = info['time'] + Math.floor(0.001 * new Date().valueOf());
            details = (StormBuilder.start()
                .withId(id)
                .withRoomid(this.roomid)
                .withType('storm')
                .withName('节奏风暴')
                .withExpireAt(expireAt)
                .build()
            );
        }

        return details;
    }

    onPkLottery(msg: any): PK | null {
        // TODO:
        return null;
    }

    /**
     * @returns     {Object}    .name .roomid .price .num
     */
    onAnchorLottery(msg: any): Anchor | null {
        const data: any = msg['data'];
        const dataOk: boolean = typeof data !== 'undefined';

        let details: Anchor | null = null;
        if (dataOk) {
            const id: number = data['id'];
            const roomid: number = data['room_id'];
            const name: string = data['award_name'];
            const award_num: number = data['award_num'];
            const gift_name: string = data['gift_name'];
            const gift_num: string = data['gift_num'];
            const gift_price: string = data['gift_price'];
            const require_text: string = data['require_text'];
            const danmu: string = data['danmu'];
            const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
            details = (AnchorBuilder.start()
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
                .withExpireAt(expireAt)
                .build());
        }

        return details;
    }

    onNoticeMsg(msg: any) {
    }

    onPreparing(msg: any) {
    }

    onLive(msg: any) {
    }

    onRoomChange(msg: any) {
    }

    onPopularity(popularity: number): number {
        let result: number = super.onPopularity(popularity);
        this._peak_popularity = Math.max(this._peak_popularity, popularity);
        this._peak_popularity = this._peak_popularity || 0;
        return result;
    }
}

export class FixedGuardMonitor extends DanmuTCP {

    private _delayedTasks:  DelayedTask[];

    constructor(addr: TCPAddress, info: RoomInfo) {
        const targets: number = (
            DanmuTarget.GIFT
            | DanmuTarget.GUARD
            | DanmuTarget.STORM
            | DanmuTarget.ANCHOR
        );
        super(addr, info, targets);
        this._delayedTasks = ([] as DelayedTask[]);
    }

    destroy(): void {
        super.destroy();
        this._delayedTasks.forEach((task: DelayedTask): void => task.stop());
        this._delayedTasks = ([] as DelayedTask[]);
    }

    onAnchorLottery(msg: any): Anchor | null {
        const data: Anchor | null = super.onAnchorLottery(msg);
        if (data !== null) {
            this.emit('anchor', data);
        }
        return data;
    }

    onTV(msg: any): Gift | null {
        const data: Gift | null = super.onTV(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            const t = new DelayedTask();
            t.withTime(data.wait * 1000).withCallback((): void => { this.emit('gift', data) });
            t.start();
        }
        return data;
    }

    onRaffle(msg: any): Gift | null {
        const data: Gift | null = super.onRaffle(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            const t = new DelayedTask();
            t.withTime(data.wait * 1000).withCallback((): void => { this.emit('gift', data) });
            t.start();
        }
        return data;
    }

    onPkLottery(msg: any): PK | null {
        const data: PK | null = super.onPkLottery(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('pk', data);
        }
        return data;
    }

    onGuard(msg: any): Guard | null {
        const data: Guard | null = super.onGuard(msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('guard', data);
        }
        return data;
    }

    onSpecialGift(msg: any): Storm | null {
        const data: Storm | null = super.onSpecialGift(msg);
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

    constructor(addr: TCPAddress, info: RoomInfo) {
        super(addr, info);
        this._offTimes = 0;
        this._newAnchorCount = 0;
        this._newGuardCount = 0;
        this._newStormCount = 0;
        this._newGiftCount = 0;
        this._toFixed = false;
        this._canClose = false;
    }

    get toFixed(): boolean {
        return (
            this._toFixed
            || this._newAnchorCount > 0
            || this._newGuardCount > 0
            || this._newStormCount > 0
            || this._newGiftCount > 1
        );
    }

    onAnchorLottery(msg: any): Anchor | null {
        const data: Anchor | null = super.onAnchorLottery(msg);
        if (data !== null) {
            ++this._newAnchorCount;
        }
        return data;
    }

    onRaffle(msg: any): any {
        const data: Gift | null = super.onRaffle(msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    }

    onTV(msg: any): any {
        const data: Gift | null = super.onTV(msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    }

    onGuard(msg: any): any {
        const data: Guard | any = super.onGuard(msg);
        if (data !== null) {
            ++this._newGuardCount;
        }
        return data;
    }

    onPkLottery(msg: any): any {
        const data: PK | any = super.onPkLottery(msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    }

    onSpecialGift(msg: any): any {
        const data: Storm | any = super.onSpecialGift(msg);
        if (data !== null) {
            ++this._newStormCount;
        }
        return data;
    }

    onPreparing(msg: any): void {
        this._canClose = true;
    }

    onLive(msg: any): void {
        this._canClose = false;
    }

    onPopularity(popularity: number): number {
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

    constructor(addr: TCPAddress, info: RoomInfo) {
        const targets: number = DanmuTarget.NOTICE
        super(addr, info, targets);
    }

    onNoticeMsg(msg: any): void {
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

    onPreparing(msg: any): void {
        if (this.areaid !== 0) {
            this.close(true);
        }
    }

    onRoomChange(msg: any): void {
        const changedInfo: any = msg['data'];
        const newAreaid: number = (changedInfo && changedInfo['parent_area_id']) || 0;
        if (this.areaid !== 0 && newAreaid !== this.areaid) {
            this.close(true);
        }
    }

    onPopularity(popularity: number): number {
        let result: number = super.onPopularity(popularity);
        if (popularity <= 1) {
            Bilibili.isLive(this.roomid).then((streaming: boolean): void => {
                if (streaming === false) {
                    this.close(true);
                }
            }).catch((error: Error) => {
                cprint(`${Bilibili.isLive.name} - ${error.message}`, chalk.red);
            });
        }
        return result;
    }
}


class DanmuTCPReader {

    private _data:          Buffer;
    private _totalLen:      number;

    constructor() {
        this._data = Buffer.alloc(0);
        this._totalLen = 0;
    }

    onData(data: Buffer | string): void {
        if (typeof data === 'string') {
            data = Buffer.from(data, 'utf8');
        }
        this._data = Buffer.concat([ this._data, data ]);
    }

    getMessage(): Buffer | null {
        let result: Buffer | null = null;
        if (this._totalLen <= 0 && this._data.length > 4) {
            this._totalLen = this._data.readUInt32BE(0);
        }
        if (this._totalLen > 0 && this._data.length >= this._totalLen) {
            result = this._data.slice(0, this._totalLen);
            this._data = this._data.slice(this._totalLen, this._data.length);
            const len = this._data.length;
            if (len === 0) {
                this._totalLen = 0;
                this._data = Buffer.alloc(0);
            }
            else if (len >= 4) {
                this._totalLen = this._data.readUInt32BE(0);
            }
            else {
                this._totalLen = -1;
            }
        }
        return result;
    }

}

const config = new AppConfig();
config.readArgs();

