export class HttpError implements Error {

    private _name:      string;
    private _message:   string;
    private _code:      string;
    private _status:    number;
    public stack:       any;

    constructor(msg: string) {
        this._name = 'HttpError';
        this._message = msg;
        this._code = 'ERR_HTTP_CONN';
        this._status = 0;
        this.stack = (new Error()).stack;
    }

    withStatus(status: number): HttpError {
        this._status = status;
        return this;
    }

    get code(): string {
        return this._code;
    }

    get status(): number {
        return this._status;
    }

    get name(): string {
        return this._name;
    }

    get message(): string {
        return this._message;
    }

}
