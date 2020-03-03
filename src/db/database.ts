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

export class FileWatcher {

    private _filename:      string;
    private _fsWatcher:     fs.FSWatcher | null;
    private _listenerTask:  DelayedTask;
    private _paused:        boolean;

    public constructor(filename: string, listener: () => void, delay?: number) {
        this._filename = filename;
        this._fsWatcher = null;
        this._listenerTask = new DelayedTask().withTime(delay ? delay : 10).withCallback((): void => listener() );
        this._paused = false;
    }

    public start(): void {
        this._fsWatcher = fs.watch(this._filename)
            .on('change', (): void => {
                if (!this._paused) {
                    this._listenerTask.start();
                }
            });
    }

    public stop(): void {
        if (this._fsWatcher !== null) {
            this._fsWatcher!.close();
        }
    }

    public pause(): void {
        this._paused = true;
    }

    public resume(): void {
        this._paused = false;
    }
}

export class Database {

    private _filename:  string;
    private _roomData:  RoomData;
    private _expiry:    number;
    private _saveTask:  DelayedTask;
    private _watcher:   FileWatcher;

    public constructor(options?: { expiry?: number, name?: string }) {
        let name: string = 'record.json';                   // name defaults to 'record.json'
        let expiry: number = 1000 * 60 * 60 * 24 * 3;            // expiry defaults to 3 days

        if (typeof options !== 'undefined') {
            name = options.name || name;                    // custom configuration
            if (options.expiry && Number.isInteger(options.expiry)) {
                expiry = 1000 * 60 * 60 * 24 * options.expiry;   // expiry is in days
            }
        }

        this._filename = path.resolve(__dirname, name);
        this._roomData = {};
        this._expiry = expiry; 
        this._saveTask = new DelayedTask();
        this._saveTask.withTime(2 * 60 * 1000).withCallback((): void => {
            this.update();
        });
        this._watcher = new FileWatcher(this._filename, (): void => {
            this.load();
        });
        this.setup();
    }

    public start(): void {
        this._watcher.start();
        this.getRooms();
    }

    public stop(): Promise<void> {
        this._saveTask.stop();
        this._watcher.stop();
        return this.update();
    }

    private setup(): void {
        if (fs.existsSync(this._filename) === false) {
            const data: string = JSON.stringify({}, null, 4);
            fs.writeFileSync(this._filename, data);
        }
    }

    public add(roomid: number): void {
        this._roomData[roomid] = {
            'updated_at': new Date().valueOf(),
        };
        this._saveTask.start();
    }

    private update(): Promise<void> {
        return this.save().catch((error: Error): void => {
            cprint(`(Database) - ${error.message}`, chalk.red);
        });
    }

    private save(): Promise<void> {
        const data: string = JSON.stringify(this.filter(this._roomData), null, 4);
        this._watcher.pause();
        return new Promise((resolve, reject) => {
            fs.writeFile(this._filename, data, (error: any): void => {
                this._watcher.resume();
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            })
        });
    }

    private readFile(): Promise<string> {
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

    private load(): Promise<RoomData> {
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

    private filter(data: RoomData): RoomData {
        const threshold: number = new Date().valueOf() - this._expiry;
        const result: any = Object.assign(new Object(), data);
        Object.entries(result).forEach((entry: any): void => {
            if (entry[1].updated_at < threshold) {
                delete result[entry[0]];
            }
        });
        return result as RoomData;
    }

    public getRooms(): Promise<number[]> {
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
