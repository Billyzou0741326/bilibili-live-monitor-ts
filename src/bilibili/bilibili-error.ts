export class BilibiliError extends Error {

    private _code:      string;
    private _status:    number;

    public constructor(...args: any) {
        super(...args);
        this._code = 'ERR_BILIBILI';
        this._status = 0;

        // Set the prototype explicitly (see https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work).
        Object.setPrototypeOf(this, BilibiliError.prototype);
    }

    public withStatus(s: number): this {
        this._status = s;
        return this;
    }

    public get code(): string {
        return this._code;
    }

    public get status(): number {
        return this._status;
    }
}
