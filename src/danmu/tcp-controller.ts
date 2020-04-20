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


const tcp_addr = new AppConfig().danmuAddr;

export abstract class AbstractRoomController extends EventEmitter {

    protected _connections:     Map<number, DanmuTCP>;
    protected _taskQueue:       RateLimiter;

    protected constructor() {
        super();
        this._connections = new Map();
        this._taskQueue = new RateLimiter(10, 1000);
    }

    public get connections(): Map<number, DanmuTCP> {
        return this._connections;
    }

    public start(): void {
    }

    public stop(): void {
        this._connections.forEach((listener: DanmuTCP): void => listener.destroy());
    }

}

abstract class GuardController extends AbstractRoomController {

    protected constructor() {
        super();
    }

    public add(rooms: number | number[]): Promise<void>[] {
        const roomids: number[] = ([] as number[]).concat(rooms);
        const filtered = roomids.filter((roomid: number): boolean => !this.roomExists(roomid));
        const tasks: Promise<void>[] = filtered.map((roomid: number): Promise<void> => {
            return this.setupRoom(roomid);
        });
        return tasks;
    }

    protected abstract createListener(addr: TCPAddress, info: RoomInfo, token: string): DanmuTCP;

    protected roomExists(roomid: number): boolean {
        return this._connections.has(roomid);
    }

    protected onClose(roomid: number, listener: DanmuTCP): void {
        listener.destroy();
        this._connections.delete(roomid);
    }

    protected setupRoom(roomid: number): Promise<void> {
        if (this.roomExists(roomid)) {
            return Promise.resolve();
        }

        const roomInfo: any = {
            roomid: roomid,
        };
        return (async(): Promise<void> => {
            try {
                const token = await Bilibili.getLiveDanmuToken(roomid);
                const listener = this.createListener(tcp_addr, roomInfo, token);
                this._connections.set(roomid, listener);
                this._taskQueue.add((): void => { listener.start() });
                listener.
                    on('close', (): void => { this.onClose(roomid, listener) }).
                    on('add_to_db', (): void => { this.emit('add_to_db', roomid) }).
                    on('error', (): void => { this._taskQueue.add((): void => { listener.start() }) });
                for (const category in RaffleCategory) {
                    listener.on(category, (g: Raffle): void => { this.emit(category, g) });
                }
            } catch (error) {
                cprint(`(Listener) - ${error.message}`, chalk.red);
            }
        })();
    }
}

export class FixedGuardController extends GuardController {

    public constructor() {
        super();
    }

    protected createListener(addr: TCPAddress, info: RoomInfo, token: string = ''): DanmuTCP {
        return new FixedGuardMonitor(addr, info, token);
    }
}

export class DynamicGuardController extends GuardController {

    public constructor() {
        super();
    }

    protected createListener(addr: TCPAddress, info: RoomInfo, token: string = ''): DanmuTCP {
        return new DynamicGuardMonitor(addr, info, token);
    }

    protected onClose(roomid: number, listener: DanmuTCP): void {
        super.onClose(roomid, listener);
        this.checkAddToFixed(roomid, listener as DynamicGuardMonitor);
    }

    protected checkAddToFixed(roomid: number, listener: DynamicGuardMonitor): void {
        if (listener.toFixed) {
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
        super.start();
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
                            this.setupRoomInArea(roomid, areaid);
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

    private setupRoomInArea(roomid: number, areaid: number): void {
        if (this._connections.has(areaid)) {
            return;
        }

        const listener = new RaffleMonitor(tcp_addr, { roomid: roomid, areaid: areaid });

        cprint(`Setting up monitor @room ${roomid.toString().padEnd(13)} in ${this._nameOfArea[areaid]}区`, chalk.green);

        this._taskQueue.add((): void => { listener.start() });
        this._connections.set(areaid, listener);
        listener.
            on('close', (): void => {
                listener.destroy();
                this._connections.delete(areaid);

                const reason = `@room ${roomid} in ${this._nameOfArea[areaid]}区 is closed.`;
                cprint(reason, chalk.yellowBright);
                this.setupArea(areaid);
            }).
            on('error', (): void => { this._taskQueue.add((): void => { listener.start(); }) }).
            on('add_to_db', (): void => { this.emit('add_to_db', roomid) }).
            on('roomid', (roomid: number): void => {
                this._roomidHandler.add(roomid);
                this.emit('to_dynamic', roomid);
            });
        for (const category in RaffleCategory) {
            listener.on(category, (g: Raffle): void => { this.emit(category, g) });
        }
    }
}

