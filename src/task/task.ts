interface Startable {
    start(): void;
}

interface Stoppable {
    stop(): void;
}

class AbstractTask implements Startable, Stoppable {

    private _time:          number;
    protected _args:        any;
    protected _callback:    (...args: any) => any;

    constructor() {
        this._time = 0;
        this._callback = () => {};
    }

    start(): void {
    }

    stop(): void {
    }

    get running(): boolean {
        return false;
    }

    get time(): number {
        return this._time;
    }

    withCallback(callback: (...args: any) => any, ...args: any): AbstractTask {
        this._callback = callback;
        this._args = args;
        return this;
    }

    withTime(ms: number): AbstractTask {
        ms = ms > 0 ? ms : 0;
        this._time = ms;
        return this;
    }
}

export class RecurrentTask extends AbstractTask {

    private _stopper:   any;

    constructor() {
        super();
        this._stopper = null;
    }

    get running(): boolean {
        return this._stopper !== null;
    }

    start(): void {
        if (this._stopper === null) {
            this._stopper = setInterval(this._callback, this.time, ...this._args);
        }
    }

    stop(): void {
        if (this._stopper !== null) {
            clearInterval(this._stopper);
            this._stopper = null;
        }
    }
}

export class DelayedTask extends AbstractTask {

    private _stopper:   any;

    constructor() {
        super();
        this._stopper = null;
    }

    get running(): boolean {
        return this._stopper !== null;
    }

    start(): void {
        if (this._stopper === null) {
            this._stopper = setTimeout((): void => {
                this._stopper = null;
                this._callback(...this._args);
            }, this.time);
        }
    }

    stop(): void {
        if (this._stopper !== null) {
            clearTimeout(this._stopper);
            this._stopper = null;
        }
    }
}
