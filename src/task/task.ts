interface Startable {
    start(): void;
}

interface Stoppable {
    stop(): void;
}

abstract class AbstractTask implements Startable, Stoppable {

    private _time:          number;
    protected _args:        any;
    protected _callback:    (...args: any) => any;

    protected constructor() {
        this._time = 0;
        this._callback = () => {};
    }

    public abstract start(): void;

    public abstract stop(): void;

    public abstract get running(): boolean;

    public get time(): number {
        return this._time;
    }

    public withCallback(callback: (...args: any) => any, ...args: any): this {
        this._callback = callback;
        this._args = args;
        return this;
    }

    public withTime(ms: number): this {
        ms = ms > 0 ? ms : 0;
        this._time = ms;
        return this;
    }
}

export class RecurrentTask extends AbstractTask {

    private _stopper:   any;

    public constructor() {
        super();
        this._stopper = null;
    }

    public get running(): boolean {
        return this._stopper !== null;
    }

    public start(): void {
        if (this._stopper === null) {
            this._stopper = setInterval(this._callback, this.time, ...this._args);
        }
    }

    public stop(): void {
        if (this._stopper !== null) {
            clearInterval(this._stopper);
            this._stopper = null;
        }
    }
}

export class DelayedTask extends AbstractTask {

    private _stopper:   any;

    public constructor() {
        super();
        this._stopper = null;
    }

    public get running(): boolean {
        return this._stopper !== null;
    }

    public start(): void {
        if (this._stopper === null) {
            this._stopper = setTimeout((): void => {
                this._stopper = null;
                this._callback(...this._args);
            }, this.time);
        }
    }

    public stop(): void {
        if (this._stopper !== null) {
            clearTimeout(this._stopper);
            this._stopper = null;
        }
    }
}
