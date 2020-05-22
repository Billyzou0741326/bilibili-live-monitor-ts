import * as HttpType from 'http';
import * as http2 from 'http2';
import * as chalk from 'chalk';
import * as os from 'os';
import {
    http,
    https, } from 'follow-redirects';
import {
    Request,
    Response,
    HttpError,
    ResponseBuilder, } from './index';
import {
    DelayedTask,
    RateLimiter, } from '../task/index';
import { cprint } from '../fmt/index';



export interface Sender {
    request(request: Request): Promise<Response>;
}

export class Xhr implements Sender {

    private _rateLimiter:       RateLimiter | null;
    private _http2Client:       Map<string,http2.ClientHttp2Session>;

    public constructor() {
        this._rateLimiter = null;
        this._http2Client = new Map();
    }

    public withRateLimiter(limiter: RateLimiter | null): this {
        this._rateLimiter = limiter;
        return this;
    }

    public request(request: Request): Promise<Response> {
        let sendRequestPre: null | (() => Promise<Response>) = null;

        if (request.version == Request.HTTP_VERSION_1) {
            sendRequestPre = this.prepareRequestHttp1(request);
        } else if (request.version == Request.HTTP_VERSION_2) {
            sendRequestPre = this.prepareRequestHttp2(request);
        }
        if (null === sendRequestPre) {
            return Promise.reject(new HttpError(`Invalid http version`));
        }

        const sendRequest: () => Promise<Response> = sendRequestPre;
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

    private createSessionHttp2(hostPort: string, useHttps: boolean): http2.ClientHttp2Session {
        const protocol = useHttps ? 'https:' : 'http:';
        const sessionOptions: http2.ClientSessionOptions = {
            'protocol': protocol,
        };
        const conn: http2.ClientHttp2Session = http2.connect(`${protocol}//${hostPort}`, sessionOptions);
        conn.setMaxListeners(50);
        conn.on('error', (error: NodeJS.ErrnoException) => {
            // console.log(`${new Date()} http2 session closed`);
            if (error.errno === os.constants.errno.EMFILE) {
                cprint(`(http2) ${error.message} (Recommend: Increase nofile limit)`);
            }
            else if (error.errno === os.constants.errno.ECONNREFUSED) {
                cprint(`(http2) ${error.message} (Remote refuses to connect)`);
            }
        });
        conn.on('close', () => {
            // console.log(`${new Date()} http2 session closed`);
            conn.unref();
        });

        return conn;
    }

    private prepareRequestHttp2(request: Request): (() => Promise<Response>) {
        const sendRequest = (): Promise<Response> => {

            const promise = new Promise<Response>((resolve, reject) => {

                let xhr: any = null;
                const options = request.toHttpOptions();
                const hostPort = `${request.host}:${request.port}`;

                xhr = this._http2Client.get(hostPort);
                if (typeof xhr === 'undefined' || xhr.closed || xhr.destroyed) {
                    xhr = this.createSessionHttp2(hostPort, request.https);
                    this._http2Client.set(hostPort, xhr);
                }

                let respHeaders: http2.IncomingHttpHeaders = {};
                const dataSequence: Array<Buffer> = [];
                const req: http2.ClientHttp2Stream = (xhr.request(options)
                    .on('timeout', () => {
                        req.close(http2.constants.NGHTTP2_SETTINGS_TIMEOUT);
                        reject(new HttpError('Http request timed out'));
                    })
                    .on('aborted', () => reject(new HttpError('Http request aborted')))
                    .on('error', (error: Error) => reject(new HttpError(`Http request errored - ${error.message}`)))
                    .on('close', () => reject(new HttpError('Http request closed')))
                    .on('response', (headers: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader, flags: number) => {
                        const code: number = headers[':status'] || -1;
                        if (code !== -1 && (200 < code || code >= 300)) {
                            req.close(http2.constants.NGHTTP2_NO_ERROR);
                            reject((new HttpError(`Http status ${code}`)).withStatus(code));
                        }
                        respHeaders = headers;
                    })
                    .on('data', (data: Buffer) => dataSequence.push(data))
                    .on('end', () => {
                        let url = `${request.host}${request.path}`;
                        let method = request.method;
                        const data = Buffer.concat(dataSequence);
                        const res = (ResponseBuilder.start()
                            .withUrl(url)
                            .withMethod(method)
                            .withData(data)
                            .withHeaders(respHeaders)
                            .withHttpVersion(Request.HTTP_VERSION_2)
                            .build()
                        );
                        resolve(res);
                    })
                );
                req.setTimeout(request.timeout);
                if (request.data) {
                    req.write(request.data);
                }
                req.end();
            });

            return promise;
        };

        return sendRequest;
    }

    private prepareRequestHttp1(request: Request): (() => Promise<Response>) {
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
                                        .withHttpVersion(Request.HTTP_VERSION_1)
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

        return sendRequest;
    }
}

