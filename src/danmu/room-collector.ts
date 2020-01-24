import * as colors from 'colors/safe';
import { Database } from '../db/index';
import { Bilibili } from '../bilibili/index';
import { cprint } from '../fmt/index';

export class RoomCollector {

    private _db:    Database;

    constructor() {
        this._db = new Database();
    }

    getFixedRooms(): Promise<number[]> {
        const dbTask = this._db.getRooms();
        const sailsTask = (Bilibili.getAllSailboatRooms()
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Collector) - ${error.message}`, colors.red);
                return Promise.resolve([] as number[]);
            })
        );
        const genkiTask = (Bilibili.getAllGenkiRooms()
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Collector) - ${error.message}`, colors.red);
                return Promise.resolve([] as number[]);
            })
        );
        const tasks = [ dbTask, sailsTask, genkiTask ];
        return Promise.all(tasks).then((results: Array<number[]>): number[] => {
            return Array.from(new Set(([] as number[]).concat(...results)));
        });
    }

    getDynamicRooms(): Promise<number[]> {
        const task = (Bilibili.getRoomsInArea(0)
            .then((resp: any): number[] => {
                return resp.map((entry: any) => entry['roomid']);
            })
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Collector) - ${error.message}`, colors.red);
                return Promise.resolve([] as number[]);
            })
        );
        return task;
    }
}

