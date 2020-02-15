import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import { DelayedTask } from '../task/index';
import { cprint } from '../fmt/index';


interface RoomEntry {
    updated_at:     number;
}

interface RoomData {
    [key: number]:  RoomEntry;
}

export class Database {

    private _filename:  string;
    private _roomData:  RoomData;
    private _saveTask:  DelayedTask;

    constructor(name?: string) {
        if (typeof name === 'undefined') {
            name = 'record.json';
        }
        this._filename = path.resolve(__dirname, name);
        this._roomData = {};
        this._saveTask = new DelayedTask();
        this._saveTask.withTime(2 * 60 * 1000).withCallback((): void => {
            (this.load()
                .then((): void => { this.save() })
                .catch((error: Error): void => {
                    cprint(`(Database) - ${error.message}`, chalk.red);
                }));
        });
        this.setup();
    }

    stop(): void {
        this._saveTask.stop();
    }

    setup(): void {
        if (fs.existsSync(this._filename) === false) {
            const data: string = JSON.stringify({}, null, 4);
            fs.writeFileSync(this._filename, data);
        }
    }

    add(roomid: number): void {
        this._roomData[roomid] = {
            'updated_at': new Date().valueOf(),
        };
        this._saveTask.start();
    }

    update(): void {
        (this.load()
            .catch((error: Error): Promise<RoomData> => Promise.resolve({} as RoomData))
            .then((roomData: RoomData): void => this.save())
        );
    }

    save(): void {
        const data: string = JSON.stringify(this.filter(this._roomData), null, 4);
        fs.writeFile(this._filename, data, (error: any): void => {
            if (error) {
                cprint(`(Database) - ${error.message}`, chalk.red);
            }
        });
    }

    readFile(): Promise<string> {
        return new Promise((resolve, reject): void => {
            fs.readFile(this._filename, 'utf8', (error: any, data: string | Buffer): void => {
                if (error) {
                    reject(error);
                }
                else if (data instanceof Buffer) {
                    data = data.toString();
                }
                resolve(data as string);
            });
        });
    }

    load(): Promise<RoomData> {
        return this.readFile().then((data: string) => {
            let result: RoomData = {};
            try {
                result = JSON.parse(data);
                Object.keys(result).forEach((roomid: string): void => {
                    const rid: number = +roomid;
                    if (!this._roomData[rid]) {
                        this._roomData[rid] = result[rid];
                    }
                });
            }
            catch (error) {
                cprint(`(Database) - ${error.message}`, chalk.red);
            }
            return result;
        });
    }

    filter(data: RoomData): RoomData {
        const threshold: number = new Date().valueOf() - 1000 * 60 * 60 * 24 * 30;
        const result: any = Object.assign(new Object(), data);
        Object.entries(result).forEach((entry: any): void => {
            if (entry[1].updated_at < threshold) {
                delete result[entry[0]];
            }
        });
        return result as RoomData;
    }

    getRooms(): Promise<number[]> {
        return (this.load()
            .then((data: RoomData): RoomData => this.filter(data))
            .then((data: RoomData): number[] => Object.keys(data).map((d: string): number => +d))
            .catch((error: Error): Promise<number[]> => {
                cprint(`(Database) - ${error.message}`, chalk.red);
                return Promise.resolve([]);
            })
        );
    }
}
