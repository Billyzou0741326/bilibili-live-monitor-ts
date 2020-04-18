import * as chalk from 'chalk';
import { EventEmitter } from 'events';
import { sleep } from '../async/index';
import { cprint } from '../fmt/index';
import { Bilibili } from '../bilibili/index';
import { DelayedTask } from '../task/index';
import {
    RoomCollector,
    RoomidHandler, } from './index';
import {
    Raffle,
    RaffleCategory } from '../danmu/index';

export class RoomCrawler extends EventEmitter {

    private collector_:         RoomCollector;
    private roomidHandler_:     RoomidHandler;

    constructor(collector?: RoomCollector) {
        super();
        this.collector_ = collector || new RoomCollector();
        this.roomidHandler_ = new RoomidHandler();

        for (const cate in RaffleCategory) {
            this.roomidHandler_.on(cate, (g: Raffle) => { this.emit(cate, g) });
        }
    }

    public query(): Promise<void> {
        const fixedRooms = this.collector_.getFixedRooms();
        const dynamicRooms = (async(): Promise<Set<number> > => {
            try {
                let roomInfoList = await Bilibili.getRoomsInArea(0, 99, Infinity, 'online');

                const rooms: number[] = roomInfoList.map((entry: any): number => entry['roomid']);
                return new Set(rooms);
            }
            catch (error) {
                cprint(`(Collector) - ${error.message}`, chalk.red);
            }
            return new Set();
        })();

        return (async(): Promise<void> => {
            const roomSets = await Promise.all([
                dynamicRooms,
                fixedRooms,
            ]);

            for (const roomSet of roomSets) {
                roomSet.forEach((roomid: number): void => {
                    this.roomidHandler_.add(roomid);
                });
            }

            await this.roomidHandler_.wait();
            this.emit('done');
        })();
    }
}
