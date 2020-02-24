import * as chalk from 'chalk';
import { Database } from '../db/index';
import { Bilibili } from '../bilibili/index';
import { cprint } from '../fmt/index';
import { LoadBalancing } from '../global/index';

export class RoomCollector {

    private _db:    Database;

    public constructor() {
        this._db = new Database();
    }

    public getFixedRooms(): Promise<Set<number>> {
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
            return new Set(this.filterRooms(([] as number[]).concat(...results)));
        });
    }

    public getDynamicRooms(): Promise<number[]> {
        const task = (Bilibili.getRoomsInArea(0)
            .then((resp: any): number[] => {
                return this.filterRooms(resp.map((entry: any) => entry['roomid']));
            })
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Collector) - ${error.message}`, chalk.red);
                return Promise.resolve([] as number[]);
            })
        );
        return task;
    }

    public getRaffleRoomsInArea(areaid: number, numRooms: number): Promise<number[]> {
        let pageSize: number = numRooms > 50 ? 50 : numRooms;
        return (Bilibili.getRoomsInArea(areaid, pageSize, numRooms)
            .then((roomInfoList: any[]): number[] => {
                return this.filterRooms(roomInfoList.map((roomInfo: any): number => roomInfo.roomid));
            })
            .catch((error: Error) => {
                cprint(`Bilibili.getRoomsInArea - ${error.message}`, chalk.red);
                return Promise.resolve([] as number[]);
            })
        );
    }

    protected filterRooms(rooms: number[]): number[] {
        return rooms;
    }

}

export class SimpleLoadBalancingRoomDistributor extends RoomCollector {
    private _loadBalancing:  LoadBalancing;

    constructor(loadBalancing: LoadBalancing) {
        super();
        this._loadBalancing = loadBalancing;
    }

    protected filterRooms(rooms: number[]): number[] {
        return rooms.filter((roomid: number): boolean => roomid % this._loadBalancing.totalServers === this._loadBalancing.serverIndex);
    }
}
