import * as chalk from 'chalk';
import { EventEmitter } from 'events';
import { Queue } from '../container/index';
import { cprint } from '../fmt/index';
import { Bilibili } from '../bilibili/index';
import {
    AppConfig,
    TCPAddress, } from '../global/index';
import { RateLimiter } from '../task/index';
import {
    RaffleCategory,
    Raffle,
    RoomCollector,
    RoomidHandler,
    RoomInfo,
    DanmuTCP,
    RaffleMonitor,
    FixedGuardMonitor,
    DynamicGuardMonitor, } from './index';


class DownRate {}

const tcpaddr: any = new AppConfig().danmuAddr;

export abstract class AbstractRoomController extends EventEmitter {

    protected _connections:     Map<number, DanmuTCP>;
    protected _recentlyClosed:  number[];
    protected _taskQueue:       RateLimiter;

    protected constructor() {
        super();
        this._connections = new Map();
        this._recentlyClosed = [] as number[];
        this._taskQueue = new RateLimiter(50, 1000);
    }

    public get connections(): Map<number, DanmuTCP> {
        return this._connections;
    }

    public add(rooms: number | number[]): void {
        const roomids: number[] = ([] as number[]).concat(rooms);
        const closed: Set<number> = new Set<number>(this._recentlyClosed);

        const filtered = roomids.filter((roomid: number): boolean => {
            return !this._connections.has(roomid) && !closed.has(roomid);
        });
        for (const roomid of filtered) {
            this.setupRoom(roomid);
        }
        this.clearClosed();
    }

    public stop(): void {
        this._connections.forEach((listener: DanmuTCP): void => listener.destroy());
    }

    protected abstract setupRoom(roomid: number, areaid?: number): void;

    protected clearClosed(): void {
        const len = this._recentlyClosed.length;
        if (len > 50) {
            this._recentlyClosed.splice(0, len - 25);
        }
    }

}

abstract class GuardController extends AbstractRoomController {

    protected constructor() {
        super();
    }

    protected abstract createListener(addr: TCPAddress, info: RoomInfo): DanmuTCP;

    protected abstract roomExists(roomid: number): boolean;

    protected onClose(roomid: number, listener: DanmuTCP): void {
        listener.destroy();
        this._connections.delete(roomid);
        this._recentlyClosed.push(roomid);
    }

    protected setupRoom(roomid: number, areaid?: number): void {
        if (this.roomExists(roomid)) {
            return;
        }

        const roomInfo: any = {
            roomid: roomid,
        };
        const listener = this.createListener(tcpaddr, roomInfo);
        this._connections.set(roomid, listener);
        this._taskQueue.add((): void => { listener.start() });
        listener
            .on('close', (): void => { this.onClose(roomid, listener) })
            .on('add_to_db', (): void => { this.emit('add_to_db', roomid) });
        for (const category in RaffleCategory) {
            listener.on(category, (g: Raffle): void => { this.emit(category, g) });
        }
    }
}

export class FixedGuardController extends GuardController {

    public constructor() {
        super();
    }

    protected createListener(addr: TCPAddress, info: RoomInfo): DanmuTCP {
        return new FixedGuardMonitor(addr, info);
    }

    protected roomExists(roomid: number): boolean {
        return this._connections.has(roomid);
    }
}

export class DynamicGuardController extends GuardController {

    public constructor() {
        super();
    }

    protected createListener(addr: TCPAddress, info: RoomInfo): DanmuTCP {
        return new DynamicGuardMonitor(addr, info);
    }

    protected roomExists(roomid: number): boolean {
        return this._recentlyClosed.includes(roomid) || this._connections.has(roomid);
    }

    protected onClose(roomid: number, listener: DanmuTCP): void {
        super.onClose(roomid, listener);
        this.checkAddToFixed(roomid, listener as DynamicGuardMonitor);
    }

    protected checkAddToFixed(roomid: number, listener: DynamicGuardMonitor): void {
        if (listener.toFixed) {
            cprint(`Adding ${roomid} to fixed`, chalk.green);
            this.emit('to_fixed', roomid);
        }
    }
}

export class RaffleController extends AbstractRoomController {

    private _nameOfArea:    {[key: number]: string};
    private _areas:         number[];
    private _roomidHandler: RoomidHandler;
    private _roomCollector: RoomCollector;

    public constructor(roomCollector?: RoomCollector) {
        super();
        this._roomidHandler = new RoomidHandler();
        this._roomCollector = roomCollector || new RoomCollector();
        this._areas = [ 1, 2, 3, 4, 5, 6 ];
        this._nameOfArea = {
            1: '娱乐',
            2: '网游',
            3: '手游',
            4: '绘画',
            5: '电台',
            6: '单机',
        };
        for (const category in RaffleCategory) {
            this._roomidHandler.on(category, (g: Raffle): void => { this.emit(category, g) });
        }
    }

    public start(): void {
        for (const areaid of this._areas) {
            this.setupArea(areaid);
        }
    }

    public stop(): void {
        super.stop();
        this._roomidHandler.stop();
    }

    private setupArea(areaid: number, numRoomsQueried: number = 10): void {
        this._roomCollector.getRaffleRoomsInArea(areaid, numRoomsQueried).then(
            (rooms: number[]): void => this.setupMonitorInArea(areaid, rooms, numRoomsQueried));
    }

    private setupMonitorInArea(areaid: number, rooms: number[], numRoomsQueried: number = 10): void {

        const task = async () => {

            if (!this._connections.has(areaid)) {
                let done = false;
                const max = rooms.length;

                for (let i = 0; !done && i < max; ++i) {
                    try {
                        const roomid = rooms[i];
                        if (await Bilibili.isLive(roomid)) {

                            done = true;
                            this.setupRoom(roomid, areaid);
                        }
                    }
                    catch (error) {
                        cprint(`Bilibili.isLive - ${error.message}`, chalk.red);
                    }
                }

                if (!done) {
                    if (numRoomsQueried < 1000) {
                        this.setupArea(areaid, numRoomsQueried + 10);
                    } else {
                        cprint(`RaffleController - Can't find a room to set up monitor in ${this._nameOfArea[areaid]}区`, chalk.red);
                    }
                }
            }
        };

        task();
    }

    protected setupRoom(roomid: number, areaid?: number): void {
        if (this._recentlyClosed.includes(roomid) || typeof areaid === 'undefined') {
            return;
        }

        const listener = new RaffleMonitor(tcpaddr, { roomid: roomid, areaid: areaid });

        cprint(`Setting up monitor @room ${roomid.toString().padEnd(13)} in ${this._nameOfArea[areaid]}区`, chalk.green);

        this._taskQueue.add((): void => { listener.start() });
        this._connections.set(areaid, listener);
        listener
            .on('close', (): void => {
                listener.destroy();
                this._connections.delete(areaid);

                const reason = `@room ${roomid} in ${this._nameOfArea[areaid]}区 is closed.`;
                cprint(reason, chalk.yellowBright);
                this.setupArea(areaid);
            })
            .on('add_to_db', (): void => { this.emit('add_to_db', roomid) })
            .on('roomid', (roomid: number): void => { this._roomidHandler.add(roomid) });
        for (const category in RaffleCategory) {
            listener.on(category, (g: Raffle): void => { this.emit(category, g) });
        }
    }
}

