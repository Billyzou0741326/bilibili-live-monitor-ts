import { DelayedTask } from '../task/index';
import {
    Raffle,
    RaffleCategory } from './index';

export class History {

    private _active:            Map<string, Map<number, Raffle>>;
    private _tasks:             DelayedTask[];
    private _CLEAR_ON_EXCEEDS:  number;

    public constructor() {
        this._active = new Map<string, Map<number, Raffle>>();
        for (const category in RaffleCategory) {
            this._active.set(category, new Map<number, Raffle>());
        }
        this._tasks = [];
        this._CLEAR_ON_EXCEEDS = 200;
    }

    public stop(): void {
        for (const t of this._tasks) {
            t.stop();
        }
        for (const category in RaffleCategory) {
            this._active.set(category, new Map<number, Raffle>());
        }
        this._tasks = [];
    }

    public retrieveGetter(target: string): (() => Raffle[]) {
        // Potential memory leak: Some other resources may hold reference to the Map
        const gifts: Map<number, Raffle> = this._active.get(target) || new Map();
        return () => { return Array.from(gifts.values()); };
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
        const category = this._active.get(g.category);
        return typeof category !== 'undefined' && category.has(g.id);
    }

}
