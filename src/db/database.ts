import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import { promises as fsPromises } from 'fs';
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
    private _listenerTask:  DelayedTask | null;
    private _paused:        boolean;

    public constructor(filename: string, task?: DelayedTask) {
        this._filename = path.resolve(__dirname, filename);
        this._fsWatcher = null;
        this._listenerTask = null;
        this._paused = false;
    }

    public withTask(task: DelayedTask | null): this {
        this._listenerTask = task;
        return this;
    }

    public start(): void {
        if (this._fsWatcher === null) {
            this._fsWatcher = fs.watch(this._filename)
                .on('change', (): void => {
                    if (!this._paused) {
                        this._listenerTask && this._listenerTask.start();
                    }
                })
                .on('error', (error: Error): void => {
                    cprint(`(FileWatcher) - ${error.message}`, chalk.red);
                    this._fsWatcher && this._fsWatcher.close();
                })
                .on('close', (): void => {
                    this._listenerTask && this._listenerTask.stop();
                    this._fsWatcher = null;
                });
        }
    }

    public stop(): void {
        if (this._fsWatcher !== null) {
            this._fsWatcher.close();
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
        let name: string = 'record.json';                       // name defaults to 'record.json'
        let expiry: number = 1000 * 60 * 60 * 24 * 3;           // expiry defaults to 3 days

        if (typeof options !== 'undefined') {
            name = options.name || name;                        // custom configuration
            if (options.expiry && Number.isInteger(options.expiry)) {
                expiry = 1000 * 60 * 60 * 24 * options.expiry;  // expiry is in days
            }
        }

        this._filename = path.resolve(__dirname, name);
        this._roomData = {};
        this._expiry = expiry; 
        this._saveTask = new DelayedTask();
        this._saveTask.withTime(2 * 60 * 1000).withCallback((): void => {
            this.update();
        });
        this._watcher = new FileWatcher(this._filename, new DelayedTask().withTime(100).withCallback((): void => {
            this.load();
        }));
        this.setup();
    }

    public start(): void {
        this._watcher.start();
    }

    public stop(): void {
        this._saveTask.stop();
        this._watcher.stop();
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
        return (async(): Promise<void> => {
            try {
                this.save();
            }
            catch (error) {
                cprint(`(Database) - ${error.message}`, chalk.red);
            }
        })();
    }

    private save(): Promise<void> {
        const data: string = JSON.stringify(this.filter(this._roomData), null, 4);
        this._watcher.pause();
        return (async(): Promise<void> => {
            try {
                await fsPromises.writeFile(this._filename, data);
                this._watcher.resume();
            }
            catch (error) {
                this._watcher.resume();
                throw error;
            }
        })();
    }

    private readFile(): Promise<string> {
        return fsPromises.readFile(this._filename, { encoding: 'utf8' });
    }

    private load(): Promise<RoomData> {
        return (async(): Promise<RoomData> => {

            let result = {} as RoomData;
            const data: string = await this.readFile();

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
        })();
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
        return (async(): Promise<number[]> => {
            let result: number[] = [];

            try {
                const roomData: RoomData = await this.load();
                const filtered: RoomData = this.filter(roomData);
                result = Object.keys(filtered).map((d: string): number => +d);
            }
            catch (error) {
                cprint(`(Database) - ${error.message}`, chalk.red);
            }

            return result;
        })();
    }
}
