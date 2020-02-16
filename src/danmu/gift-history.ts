import { DelayedTask } from '../task/index';
import {
    Raffle,
    RaffleCategories } from './index';

export class History {

    private _active:            Map<string, Map<number, Raffle>>;
    private _tasks:             DelayedTask[];
    private _CLEAR_ON_EXCEEDS:  number;

    public constructor() {
        this._active = new Map<string, Map<number, Raffle>>();
        for (const category of RaffleCategories) {
            this._active.set(category, new Map<number, Raffle>());
        }
        this._tasks = [];
        this._CLEAR_ON_EXCEEDS = 200;
    }

    public stop(): void {
        this._tasks.forEach((t: DelayedTask): void => { t.stop() });
        this._tasks = [];
    }

    public retrieveGetter(target: string): (() => Raffle[]) {
        return () => { return Array.from(this._active.get(target)!.values()); };
    }

    public add(g: Raffle): void {
        const raffles: Map<number, Raffle> = this._active.get(g.category)!;
        raffles.set(g.id, g);

        const removeTask = new DelayedTask()
            .withTime(g.expireAt * 1000 - new Date().valueOf())
            .withCallback((): void => { raffles.delete(g.id) });
        this._tasks.push(removeTask);
        removeTask.start();

        if (this._tasks.length > this._CLEAR_ON_EXCEEDS) {
            this._tasks = this._tasks.filter((t: DelayedTask): boolean => t.running);
        }
    }

    public has(g: Raffle): boolean {
        return this._active.get(g.category)!.has(g.id);
    }

}
