export class HttpError extends Error {

    private _code: string;
    private _status: number;

    constructor(...args: any) {
        super(...args);
        this._code = 'ERR_HTTP_CONN';
        this._status = 0;
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

}
