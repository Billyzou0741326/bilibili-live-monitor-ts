import * as http from 'http';
import * as https from 'https';
import {
    Request,
    Response,
    HttpError,
    ResponseBuilder, } from './index';
import {
    RateLimiter, } from '../task/index';



export interface Sender {
    request(request: Request): Promise<Response>;
}

export class Xhr implements Sender {

    request(request: Request): Promise<Response> {
        let xhr: any = null;
        const options = request.toHttpOptions();
        if (request.https === true) {
            xhr = https;
        } 
        else {
            xhr = http;
        }

        const promise = new Promise<Response>((resolve, reject) => {
            const req = (xhr.request(options)
                .on('timeout', () => req.abort())
                .on('abort', () => reject(new HttpError('Http request aborted')))
                .on('error', () => reject(new HttpError('Http request errored')))
                .on('close', () => reject(new HttpError('Http request closed')))
                .on('response', (response: http.IncomingMessage) => {
                    const code: number = response.statusCode || 0;
                    const dataSequence: Array<Buffer> = [];
                    response.on('aborted', () => reject(new HttpError('Http request aborted')));
                    response.on('error', (error: Error) => reject(new HttpError(error.message)));
                    response.on('data', (data: Buffer) => dataSequence.push(data));

                    if (code === 200) {
                        response.on('end', () => {
                            let url = `${request.host}${request.path}`;
                            let method = request.method;
                            const data = Buffer.concat(dataSequence);
                            const res = (ResponseBuilder.start()
                                .withHttpResponse(response)
                                .withUrl(url)
                                .withMethod(method)
                                .withData(data)
                                .build()
                            );
                            resolve(res);
                        });
                    }
                    else {
                        reject((new HttpError(`Http status ${code}`)).withStatus(code));
                    }
                })
            );
            if (request.data) {
                req.write(request.data);
            }
            req.end();
        });
        return promise;
    }
}

export class RateLimitedXhr extends Xhr {

    private _interval:      number;
    private _limit:         number;
    private _taskQueue:     RateLimiter;

    constructor(count: number, milliseconds?: number) {
        super();
        milliseconds = milliseconds || 0;
        this._interval = 1000;
        this._limit = Infinity;

        if (Number.isInteger(count)) {
            count = count > 0 ? count : 0;
            if (Number.isInteger(milliseconds) === false) {
                milliseconds = this._interval;
            }
            milliseconds = milliseconds > 0 ? milliseconds : 1;
            const rate: number = this._interval / milliseconds;
            this._limit = Math.round(rate * count);
        }

        this._taskQueue = new RateLimiter(count, milliseconds);
    }

    request(request: Request): Promise<Response> {
        let promise: Promise<Response> = new Promise(resolve => {
            const task = (): void => resolve(super.request(request));
            this._taskQueue.add(task);
        });
        return promise;
    }
}
