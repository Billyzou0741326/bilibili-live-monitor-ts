import { DelayedTask } from '../task/index';
import {
    PK,
    Gift,
    Guard,
    Storm,
    Anchor, } from './index';


interface Repository {
    readonly pks:       Map<number, PK>;
    readonly gifts:     Map<number, Gift>;
    readonly guards:    Map<number, Guard>;
    readonly storms:    Map<string, Storm>;
    readonly anchors:   Map<number, Anchor>;
}

export class History {

    private _active:            Repository;
    private _tasks:             DelayedTask[];
    private _CLEAR_ON_EXCEEDS:  number;

    constructor() {
        this._active = {
            pks:        new Map(),
            gifts:      new Map(),
            guards:     new Map(),
            storms:     new Map(),
            anchors:    new Map(),
        };
        this._tasks = [];
        this._CLEAR_ON_EXCEEDS = 200;
    }

    stop(): void {
        this._tasks.forEach((t: DelayedTask): void => { t.stop() });
        this._tasks = [];
    }

    retrieveGetter(target: string): (() => Gift[]) | (() => Guard[]) | (() => PK[]) | (() => Storm[]) {
        let result: any = () => { return []; };
        switch (target) {
            case 'gift':
                result = () => { return Array.from(this._active.gifts.values()); };
                break;
            case 'guard':
                result = () => { return Array.from(this._active.guards.values()); };
                break;
            case 'pk':
                result = () => { return Array.from(this._active.pks.values()); };
                break;
            case 'storm':
                result = () => { return Array.from(this._active.storms.values()); };
                break;
            case 'anchor':
                result = () => { return Array.from(this._active.anchors.values()); };
                break;
        }
        return result;
    }

    add(g: PK | Gift | Guard | Storm): void {
        const t: string = g.category;
        const now: number = new Date().valueOf();
        let removeTask = new DelayedTask();
        removeTask.withTime(g.expireAt * 1000 - now);
        this._tasks.push(removeTask);

        switch (t) {
            case 'gift':
                this._active.gifts.set(g.id as number, g as Gift);
                removeTask.withCallback((): void => { this._active.gifts.delete(g.id as number) });
                removeTask.start();
                break;
            case 'guard':
                this._active.guards.set(g.id as number, g as Guard);
                removeTask.withCallback((): void => { this._active.guards.delete(g.id as number) });
                removeTask.start();
                break;
            case 'storm':
                this._active.storms.set(g.id as string, g as Storm);
                removeTask.withCallback((): void => { this._active.storms.delete(g.id as string) });
                removeTask.start();
                break;
            case 'pk':
                this._active.pks.set(g.id as number, g as PK);
                removeTask.withCallback((): void => { this._active.pks.delete(g.id as number) });
                removeTask.start();
                break;
            case 'anchor':
                this._active.anchors.set(g.id as number, g as Anchor);
                removeTask.withCallback((): void => { this._active.anchors.delete(g.id as number) });
                removeTask.start();
                break;
            case '':
                return;
            default:
                return;
        }

        if (this._tasks.length > this._CLEAR_ON_EXCEEDS) {
            this._tasks = this._tasks.filter((t: DelayedTask): boolean => t.running);
        }
    }

    has(g: PK | Gift | Guard | Storm): boolean {
        let exists: boolean = false;

        switch (g.category) {
            case 'gift':
                let giftId : number = (g as Gift).id;
                exists = this._active.gifts.has(giftId);
                break;
            case 'guard':
                let guardId: number = (g as Guard).id;
                exists = this._active.guards.has(guardId);
                break;
            case 'storm':
                let stormId: string = (g as Storm).id;
                exists = this._active.storms.has(stormId);
                break;
            case 'pk':
                let pkId: number = (g as PK).id;
                exists = this._active.pks.has(pkId);
                break;
            case 'anchor':
                let anchorId: number = (g as Anchor).id;
                exists = this._active.anchors.has(anchorId);
                break;
            case '':
                exists = true;
                break;
            default:
                break;
        }

        return exists;
    }

}
