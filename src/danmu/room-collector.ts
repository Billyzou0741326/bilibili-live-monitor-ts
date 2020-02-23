import * as chalk from 'chalk';
import { Database } from '../db/index';
import { Bilibili } from '../bilibili/index';
import { cprint } from '../fmt/index';
import {
    AppConfig,
    LoadBalancing, } from '../global/index';

export class RoomCollector {

    private _db:             Database;
    private _loadBalancing:  LoadBalancing;

    constructor() {
        this._db = new Database();
        this._loadBalancing = new AppConfig().loadBalancing;
    }

    getFixedRooms(): Promise<Set<number>> {
        const dbTask = this._db.getRooms();
        const sailsTask = (Bilibili.getAllSailboatRooms()
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Collector) - ${error.message}`, chalk.red);
                return Promise.resolve([] as number[]);
            })
        );
        const genkiTask = (Bilibili.getAllGenkiRooms()
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Collector) - ${error.message}`, chalk.red);
                return Promise.resolve([] as number[]);
            })
        );
        const tasks = [ dbTask, sailsTask, genkiTask ];
        return Promise.all(tasks).then((results: Array<number[]>): Set<number> => {
            let roomIDs: number[] = ([] as number[]).concat(...results);
            if (this._loadBalancing.totalServers > 1) {
                roomIDs = roomIDs.filter((roomid: number): boolean => roomid % this._loadBalancing.totalServers === this._loadBalancing.serverIndex);
            }
            return new Set(roomIDs);
        });
    }

    getDynamicRooms(): Promise<number[]> {
        const task = (Bilibili.getRoomsInArea(0)
            .then((resp: any): number[] => {
                let roomIDs: number[] = resp.map((entry: any) => entry['roomid']);
                if (this._loadBalancing.totalServers > 1) {
                    roomIDs = roomIDs.filter((roomid: number): boolean => roomid % this._loadBalancing.totalServers === this._loadBalancing.serverIndex);
                }
                return roomIDs;
            })
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Collector) - ${error.message}`, chalk.red);
                return Promise.resolve([] as number[]);
            })
        );
        return task;
    }
}

