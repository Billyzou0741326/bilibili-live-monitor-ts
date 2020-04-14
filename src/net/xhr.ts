import * as HttpType from 'http';
import {
    http,
    https, } from 'follow-redirects';
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

    private _rateLimiter:       RateLimiter | null;

    public constructor() {
        this._rateLimiter = null;
    }

    public withRateLimiter(limiter: RateLimiter | null): this {
        this._rateLimiter = limiter;
        return this;
    }

    public request(request: Request): Promise<Response> {
        let xhr: any = null;
        const options = request.toHttpOptions();
        if (request.https === true) {
            xhr = https;
        } 
        else {
            xhr = http;
        }

        const sendRequest = (): Promise<Response> => {

            const promise = new Promise<Response>((resolve, reject) => {
                const req = (xhr.request(options)
                    .on('timeout', () => {
                        req.abort();
                        reject(new HttpError('Http request timed out'));
                    })
                    .on('abort', () => reject(new HttpError('Http request aborted')))
                    .on('error', (error: Error) => reject(new HttpError(`Http request errored - ${error.message}`)))
                    .on('close', () => reject(new HttpError('Http request closed')))
                    .on('response', (response: HttpType.IncomingMessage) => {
                        const code: number = response.statusCode || 0;
                        if (code >= 200 && code < 300) {
                            const dataSequence: Array<Buffer> = [];
                            response
                                .on('aborted', () => reject(new HttpError('Http request aborted')))
                                .on('error', (error: Error) => reject(new HttpError(error.message)))
                                .on('data', (data: Buffer) => dataSequence.push(data))
                                .on('end', () => {
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
        };

        let result: Promise<Response> = new Promise((resolve) => {
            if (this._rateLimiter !== null) {
                const task = (): void => { resolve(sendRequest()) };
                this._rateLimiter.add(task);
            }
            else {
                resolve(sendRequest());
            }
        });

        return result;
    }
}

