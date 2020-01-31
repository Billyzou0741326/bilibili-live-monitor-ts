import * as chalk from 'chalk';
import { EventEmitter } from 'events';
import { Queue } from '../container/index';
import { cprint } from '../fmt/index';
import { Bilibili } from '../bilibili/index';
import { AppConfig } from '../global/index';
import { RateLimiter } from '../task/index';
import {
    PK,
    Gift,
    Guard,
    Storm,
    Anchor,
    RoomidHandler,
    DanmuTCP,
    RaffleMonitor,
    FixedGuardMonitor,
    DynamicGuardMonitor, } from './index';


class DownRate {}

const tcpaddr: any = new AppConfig().danmuAddr;

export class AbstractRoomController extends EventEmitter {

    protected _connections:     Map<number, DanmuTCP>;
    protected _recentlyClosed:  number[];
    protected _taskQueue:       RateLimiter;

    constructor() {
        super();
        this._connections = new Map();
        this._recentlyClosed = [] as number[];
        this._taskQueue = new RateLimiter(50, 1000);
    }

    get connected(): number[] {
        return Array.from(this._connections.keys());
    }

    add(rooms: number | number[]): void {
        const roomids: number[] = ([] as number[]).concat(rooms);
        const established: number[] = this.connected;
        const closed: number[] = this._recentlyClosed;

        const filtered: number[] = roomids.filter((roomid: number): boolean => {
            return (
                !established.includes(roomid)
                && !closed.includes(roomid)
            );
        });

        new Set(filtered).forEach((roomid: number): void => { this.setupRoom(roomid) });
        this.clearClosed();
    }

    stop(): void {
        this._connections.forEach((listener: DanmuTCP): void => listener.destroy());
    }

    setupRoom(roomid: number, areaid?: number): void {
    }

    clearClosed(): void {
        const len = this._recentlyClosed.length;
        if (len > 50) {
            this._recentlyClosed.splice(0, len - 25);
        }
    }

}

class GuardController extends AbstractRoomController {

    protected _cls:     any;

    constructor() {
        super();
        this._cls = FixedGuardMonitor;
    }

    setupRoom(roomid: number, areaid?: number): void {
        if (this._cls === DynamicGuardMonitor) {
            if (this._recentlyClosed.includes(roomid) || this.connected.includes(roomid)) {
                return;
            }
        }
        else if (this._cls === FixedGuardController) {
            if (this.connected.includes(roomid)) {
                return;
            }
        }

        const roomInfo: any = {
            roomid: roomid,
        };
        const listener = new this._cls(tcpaddr, roomInfo);
        this._connections.set(roomid, listener);
        this._taskQueue.add((): void => { listener.start() });
        (listener
            .on('close', (): void => {
                this._connections.delete(roomid);
                this._recentlyClosed.push(roomid);
                if ((listener as DynamicGuardMonitor).toFixed === true) {
                    cprint(`Adding ${roomid} to fixed`, chalk.green);
                    this.emit('to_fixed', roomid);
                }
            })
            .on('add_to_db', (): void => { this.emit('add_to_db', roomid) })
            .on('pk', (g: PK): void => { this.emit('pk', g) })
            .on('gift', (g: Gift): void => { this.emit('gift', g) })
            .on('guard', (g: Guard): void => { this.emit('guard', g) })
            .on('storm', (g: Storm): void => { this.emit('storm', g) })
            .on('anchor', (g: Anchor): void => { this.emit('anchor', g) }));
        super.setupRoom(roomid);
    }
}

export class FixedGuardController extends GuardController {

    constructor() {
        super();
        this._cls = FixedGuardMonitor;
    }

}

export class DynamicGuardController extends GuardController {

    constructor() {
        super();
        this._cls = DynamicGuardMonitor;
    }

}

export class RaffleController extends AbstractRoomController {

    private _nameOfArea:    {[key: number]: string};
    private _areas:         number[];
    private _roomidHandler: RoomidHandler;

    constructor() {
        super();
        this._roomidHandler = new RoomidHandler();
        this._areas = [ 1, 2, 3, 4, 5, 6 ];
        this._nameOfArea = {
            1: '娱乐',
            2: '网游',
            3: '手游',
            4: '绘画',
            5: '电台',
            6: '单机',
        };
        (this._roomidHandler
            .on('guard', (g: Guard): void => { this.emit('guard', g) })
            .on('gift',  (g: Gift):  void => { this.emit('gift', g) })
            .on('pk',    (g: PK):    void => { this.emit('pk', g) })
            .on('storm', (g: Storm): void => { this.emit('storm', g) }));
    }

    start(): void {
        this._areas.forEach((areaid: number) => {
            this.getRoomsInArea(areaid).then(
                (rooms: number[]): void => this.setupMonitorInArea(areaid, rooms));
        });
    }

    stop(): void {
        super.stop();
        this._roomidHandler.stop();
    }

    getRoomsInArea(areaid: number): Promise<number[]> {
        return (Bilibili.getRoomsInArea(areaid, 10, 10)
            .then((roomInfoList: any[]): number[] => {
                return roomInfoList.map((roomInfo: any): number => roomInfo['roomid']);
            })
            .catch((error: Error) => {
                cprint(`Bilibili.getRoomsInArea - ${error.message}`, chalk.red);
                return Promise.resolve([] as number[]);
            })
        );
    }

    setupMonitorInArea(areaid: number, rooms: number[]): void {

        const task = async () => {

            let done = false;
            const max = rooms.length;

            for (let i = 0; !done && i < max; ++i) {
                try {
                    const roomid = rooms[i];
                    const streaming: boolean = await Bilibili.isLive(roomid);
                    if (streaming && !this._connections.has(areaid)) {

                        done = true;
                        this.setupRoom(roomid, areaid);
                    }
                }
                catch (error) {
                    cprint(`Bilibili.isLive - ${error.message}`, chalk.red);
                }
            }
        };

        task();
    }

    setupRoom(roomid: number, areaid?: number): void {
        if (this._recentlyClosed.includes(roomid)
            || typeof areaid === 'undefined') {
            return;
        }

        const roomInfo: any = {
            roomid: roomid,
            areaid: areaid,
        };
        const listener = new RaffleMonitor(tcpaddr, roomInfo);

        const msg = (`Setting up monitor @room `
                    + `${roomid.toString().padEnd(13)}`
                    + `in ${this._nameOfArea[areaid]}区`);
        cprint(msg, chalk.green);

        this._taskQueue.add((): void => { listener.start() });
        this._connections.set(areaid, listener);
        (listener
            .on('close', (): void => {
                const reason = `@room ${roomid} in ${this._nameOfArea[areaid]}区 is closed.`;
                cprint(reason, chalk.yellowBright);
                this._connections.delete(areaid);
                this.getRoomsInArea(areaid).then(
                    (rooms: number[]): void => this.setupMonitorInArea(areaid, rooms));
            })
            .on('add_to_db', (): void => { this.emit('add_to_db', roomid) })
            .on('pk', (g: PK): void => { this.emit('pk', g) })
            .on('gift', (g: Gift): void => { this.emit('gift', g) })
            .on('guard', (g: Guard): void => { this.emit('guard', g) })
            .on('storm', (g: Storm): void => { this.emit('storm', g) })
            .on('roomid', (roomid: number): void => { this._roomidHandler.add(roomid) }));
        super.setupRoom(roomid);
    }
}

