import * as colors from 'colors/safe';
import { cprint } from '../fmt/index';
import { EventEmitter } from 'events';
import { Bilibili } from '../bilibili/index';
import { DelayedTask } from '../task/index';
import {
    Gift,
    Guard,
    PK,
    GiftBuilder,
    GuardBuilder,
    PKBuilder, } from '../danmu/index';

export class RoomidHandler extends EventEmitter {

    private _roomids:       Set<number>;
    private _task:          DelayedTask;

    constructor() {
        super();
        this._roomids = new Set();
        this._task = new DelayedTask();

        this._task.withTime(5 * 1000).withCallback((): void => {
            this.query();
        });
        this._task.start();
    }

    stop(): void {
        this._task.stop();
    }

    add(roomid: number): void {
        this._roomids.add(roomid);
        this._task.start();
    }

    query(): void {
        const roomids: number[] = Array.from(this._roomids);
        this._roomids = new Set();

        roomids.forEach((roomid: number): void => {
            Bilibili.appGetLottery(roomid).then((resp: any): void => {
                if (resp['code'] === 0) {
                    this.handleResult(roomid, resp);
                }
                else {
                    throw new Error(`${resp['message']}`);
                }
            }).catch((error: Error) => {
                cprint(`RoomidHandler - ${error.message}`, colors.red);
            });
        });
    }

    handleResult(roomid: number, msg: any): void {

        let guards: any = msg['data']['guard'];
        let gifts: any = msg['data']['gift_list'];
        let pks: any = msg['data']['pk'];

        const nameOfType: {[key: number]: string} = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };

        guards = guards.map((g: any): Guard => {
            const id: number = g['id'];
            const t: string = g['keyword'];
            const guard_level: number = g['privilege_type'];
            const guard_name: string = nameOfType[guard_level];
            const expireAt: number = g['time'] + Math.floor(0.001 * new Date().valueOf());
            return (GuardBuilder.start()
                .withId(id)
                .withRoomid(roomid)
                .withType(t)
                .withName(guard_name)
                .withExpireAt(expireAt)
                .build()
            );
        });
        gifts = gifts.map((g: any): Gift => {
            const id: number = g['raffleId'];
            const t: string = g['type'];
            const name: string = g['title'] || '未知';
            const wait: number = g['time_wait'] > 0 ? g['time_wait'] : 0;
            const expireAt: number = g['time'] + Math.floor(0.001 * new Date().valueOf());
            return (GiftBuilder.start()
                .withId(id)
                .withRoomid(roomid)
                .withType(t)
                .withName(name)
                .withWait(wait)
                .withExpireAt(expireAt)
                .build()
            );
        });
        pks = pks.map((g: any): PK => {
            const id: number = g['id'];
            const t: string = 'pk';
            const name: string = '大乱斗';
            const expireAt: number = g['time'] + Math.floor(0.001 * new Date().valueOf());
            return (PKBuilder.start()
                .withId(id)
                .withRoomid(roomid)
                .withType(t)
                .withName(name)
                .withExpireAt(expireAt)
                .build()
            );
        });

        guards.forEach((g: Guard): void => { this.emit('guard', g) });
        pks.forEach((g: PK): void => { this.emit('pk', g) });
        gifts.forEach((g: Gift): void => {
            const t = new DelayedTask();
            t.withTime(g.wait * 1000).withCallback((): void => { this.emit('gift', g) });
            t.start();
        });

    }

}
