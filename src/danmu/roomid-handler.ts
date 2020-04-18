import * as chalk from 'chalk';
import { cprint } from '../fmt/index';
import { EventEmitter } from 'events';
import { Bilibili } from '../bilibili/index';
import { DelayedTask } from '../task/index';
import {
    Gift,
    Guard,
    Anchor,
    Storm,
    PK, } from '../danmu/index';

export class RoomidHandler extends EventEmitter {

    private _task:          DelayedTask;
    private _roomids:       Set<number>;
    private _queryTasks:    Promise<void>[];

    public constructor() {
        super();
        this._roomids = new Set();
        let pending = false;
        this._task = new DelayedTask();
        this._task.withTime(5 * 1000);          // ensures at least a 5 seconds interval between queries
        this._task.withCallback((): void => {
            if (pending === true) {
                return;                         // only one should be waiting
            }
            pending = true;
            (async(): Promise<void> => {
                if (this._queryTasks.length > 0) {
                    await this.wait();          // wait for queries to finish
                    this._queryTasks = [];      // all queries finished, reset
                }
                pending = false;
                if (this._roomids.size === 0) {
                    return;                     // nothing to do
                }
                this.query();
                this._task.start();
            })();
        });
        this._queryTasks = [];
    }

    public stop(): void {
        this._task.stop();
    }

    public wait(): Promise<void[]> {
        const waiter = Promise.all(this._queryTasks);
        return waiter;
    }

    /**
     *  Before calling `add`, recommend to `wait` for the current queries to complete
     * 
     */
    public add(roomid: number): boolean {
        this._roomids.add(roomid);

        if (!this._task.running) {
            this._task.start();

            if (this._queryTasks.length === 0) {
                this.query();                   // if no tasks are running, start so that caller has something to wait
            }
        }

        return true;
    }

    /**
     *  Before calling `query`, MUST call `wait` until the current queries complete
     * 
     */
    private query(): void {
        const roomids: number[] = Array.from(this._roomids);
        this._roomids = new Set();

        roomids.forEach((roomid: number): void => {
            const t = Bilibili.appGetLottery(roomid).then((resp: any): void => {
                if (resp['code'] !== 0) {
                    throw new Error(`${resp['message']}`);
                }
                this.handleResult(roomid, resp);
            }).catch((error: Error) => {
                cprint(`RoomidHandler - ${error.message}`, chalk.red);
            });
            this._queryTasks.push(t);
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
