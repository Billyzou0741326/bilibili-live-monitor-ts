export class BilibiliError extends Error {

    private _code:      string;
    private _status:    number;

    constructor(...args: any) {
        super(...args);
        this._code = 'ERR_BILIBILI';
        this._status = 0;
    }

    withStatus(s: number): BilibiliError {
        this._status = s;
        return this;
    }

    get code(): string {
        return this._code;
    }

    get status(): number {
        return this._status;
    }
}
