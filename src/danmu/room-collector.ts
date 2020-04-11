import * as chalk from 'chalk';
import { Database } from '../db/index';
import { Bilibili } from '../bilibili/index';
import { cprint } from '../fmt/index';
import {
    RoomCollectorStrategy,
    LoadBalancing, } from '../global/index';


export class RoomCollector {

    private _db:            Database;

    public constructor() {
        this._db = new Database();
    }

    public getFixedRooms(): Promise<Set<number>> {
        const dbTask = this._db.getRooms();
        const sailsTask = (async(): Promise<number[]> => {
            try {
                return await Bilibili.getAllSailboatRooms();
            }
            catch (error) {
                cprint(`(Collector) [SailboatRank] - ${error.message}`, chalk.red);
            }
            return [];
        })();
        const genkiTask = (async(): Promise<number[]> => {
            try {
                return await Bilibili.getAllGenkiRooms();
            }
            catch (error) {
                cprint(`(Collector) [GenkiRank] - ${error.message}`, chalk.red);
            }
            return [];
        })();
        const tasks = [ dbTask, sailsTask, genkiTask ];
        return Promise.all(tasks).then((results: Array<number[]>): Set<number> => {
            return new Set(this.filterRooms(([] as number[]).concat(...results)));
        });
    }

    public getDynamicRooms(numDynamicRooms: number = 0): Promise<Set<number> > {
        if (numDynamicRooms <= 0) {
            numDynamicRooms = Infinity;
        }

        return (async(): Promise<Set<number> > => {
            try {
                const sets = await Promise.all([
                    RoomCollector.getDynamicRoomsFromAreas(),    // noexcept
                    RoomCollector.getDynamicRoomsFromAll(),      // noexcept
                ]);

                const result: Set<number> = sets[0];
                sets[1].forEach((roomid: number): void => {
                    result.add(roomid);
                });
                return result;
            }
            catch (error) {
                cprint(`(Collector) - ${error.message}`, chalk.red);
            }
            return new Set();
        })();
    }

    // noexcept
    private static getDynamicRoomsFromAreas(): Promise<Set<number> > {
        return (async(): Promise<Set<number> > => {
            const Adder = ((s: Set<number>) => {
                return ((roomInfo: any): void => {
                    s.add(roomInfo['roomid']);
                });
            });
            const areas = [ 1, 2, 3, 4, 5, 6 ];
            const areasRooms: Set<number> = new Set();
            const addToSet = Adder(areasRooms);
            const areasTasks = areas.map((areaid: number): Promise<any> => Bilibili.getRoomsInArea(areaid));
            try {
                const areasRoomInfo = await Promise.all(areasTasks);
                for (const roomInfoList of areasRoomInfo) {
                    for (const roomInfo of roomInfoList) {
                        addToSet(roomInfo);
                    }
                }
                return areasRooms;
            }
            catch (error) {
                cprint(`(Collector) - ${error.message}`, chalk.red);
            }
            return areasRooms;
        })();
    }

    // noexcept
    private static getDynamicRoomsFromAll(): Promise<Set<number> > {
        return (async(): Promise<Set<number> > => {
            const Adder = ((s: Set<number>) => {
                return ((roomInfo: any): void => {
                    s.add(roomInfo['roomid']);
                });
            });
            const allRooms: Set<number> = new Set();
            const addToSet = Adder(allRooms);
            const allRoomsTask: Promise<any> = Bilibili.getRoomsInArea(0);
            try {
                const allRoomInfo = await allRoomsTask;
                for (const roomInfo of allRoomInfo) {
                    addToSet(roomInfo);
                }
            }
            catch (error) {
                cprint(`(Collector) - ${error.message}`, chalk.red);
            }
            return allRooms;
        })();
    }

    public getRaffleRoomsInArea(areaid: number, numRooms: number): Promise<number[]> {
        let pageSize: number = (numRooms < 1 || numRooms > 99) ? 99 : numRooms;
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

    public constructor(loadBalancing?: LoadBalancing) {
        super();

        this._loadBalancing = loadBalancing || {
            totalServers:   1,
            serverIndex:    0,
        } as LoadBalancing;
    }

    protected filterRooms(rooms: number[]): number[] {
        return rooms.filter((roomid: number): boolean => roomid % this._loadBalancing.totalServers === this._loadBalancing.serverIndex);
    }

}
