import * as chalk from 'chalk';
import { cprint } from '../fmt/index';
import { EventEmitter } from 'events';
import { Bilibili } from '../bilibili/index';
import {
    DelayedTask,
    RateLimiter, } from '../task/index';
import {
    Gift,
    Guard,
    Anchor,
    Storm,
    PK, } from '../danmu/index';

export class RoomidHandler extends EventEmitter {

    private _task:              DelayedTask;
    private _roomids:           Set<number>;
    private _onDoneCallbacks:   (Array<()=>void>);
    private _rateLimiter:       RateLimiter | null;

    public constructor() {
        super();
        this._roomids = new Set();
        this._task = new DelayedTask();
        this._task.withTime(5 * 1000);          // ensures at least a 5 seconds interval between queries
        this._task.withCallback((): void => {
            if (this._roomids.size === 0) {
                return;                         // nothing to do
            }
            this.query();
            this._task.start();
        });
        this._onDoneCallbacks = [];
        this._rateLimiter = null;
    }

    public withRateLimiter(limiter: RateLimiter): this {
        this._rateLimiter = limiter;
        return this;
    }

    public stop(): void {
        this._task.stop();
    }

    /**
     *  Before calling `add`, recommend to `wait` for the current queries to complete
     * 
     */
    public add(roomids: number | number[], onDone?: () => void): void {
        roomids = Array.isArray(roomids) ? roomids : [ roomids ];
        for (const roomid of roomids) {
            this._roomids.add(roomid);
        }

        if (!this._task.running) {
            this._task.start();
        }

        if (onDone) {
            this._onDoneCallbacks.push(onDone);
        }
    }

    /**
     *  Before calling `query`, MUST call `wait` until the current queries complete
     * 
     */
    private query(): void {
        const roomids: Set<number> = this._roomids;
        this._roomids = new Set();

        const callbacks = this._onDoneCallbacks;
        this._onDoneCallbacks = [];

        const promises: Promise<void>[] = [];

        roomids.forEach((roomid: number): void => {
            const queryRoom = (): Promise<void> => {
                return Bilibili.appGetLottery(roomid)
                    .then((resp: any): void => {
                        if (resp['code'] !== 0) {
                            throw new Error(`${resp['message']}`);
                        }
                        this.handleResult(roomid, resp);
                    }).catch((error: Error) => {
                        cprint(`RoomidHandler - ${error.message}`, chalk.red);
                    });
            }

            const t: Promise<void> = new Promise((resolve) => {
                if (this._rateLimiter !== null) {
                    const task = (): void => { resolve(queryRoom()) };
                    this._rateLimiter.add(task);
                }
                else {
                    resolve(queryRoom());
                }
            });
            promises.push(t);
        });

        Promise.all(promises).then(([]): void => {
            for (const cb of callbacks) {
                cb();
            }
        });
    }

    private handleResult(roomid: number, msg: any): void {

        let guards: any = msg['data']['guard'] || [];
        let gifts: any = msg['data']['gift_list'] || [];
        let pks: any = msg['data']['pk'] || [];
        let storm: any = msg['data']['storm'];
        let anchor: any = msg['data']['anchor'];

        const nameOfType: {[key: number]: string} = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };

        guards = guards.map((g: any): Guard => {
            g = Guard.parse(g);
            g && g.withRoomid(roomid);
            return g;
        });
        for (const g of guards) {
            if (g !== null)
                this.emit('guard', g);
        }

        pks = pks.map((g: any): PK => {
            g = PK.parse(g);
            return g;
        });
        for (const g of pks) {
            if (g !== null)
                this.emit('pk', g);
        }

        gifts = gifts.map((g: any): Gift => {
            g = Gift.parse(g);
            g && g.withRoomid(roomid);
            return g;
        });
        for (const g of gifts) {
            if (g !== null) {
                this.emit('gift', g);
            }
        }

        if (anchor !== null) {
            const g = Anchor.parse(anchor);
            if (g !== null) {
                this.emit('anchor', g);
            }
        }

        if (storm !== null) {
            const g = Storm.parse(storm);
            if (g !== null) {
                g.withRoomid(roomid);
                this.emit('storm', g);
            }
        }
    }

    //! Waiting at this level is insufficient. Duplicates are also waited
    private waitEmit(g: Gift | Gift[]) {
        let gifts: Gift[] = Array.isArray(g) ? g : [ g ];

        for (const gift of gifts) {
            if (g !== null) {
                const t = new DelayedTask().withTime(gift.wait * 1000).withCallback(() => { this.emit('gift', gift) });
                t.start();
            }
        }
    }

}
