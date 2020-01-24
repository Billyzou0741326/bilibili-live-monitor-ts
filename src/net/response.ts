import * as http from 'http';
import { RequestMethods } from './index';

class Response {

    protected _url:             string;
    protected _statusCode:      number;
    protected _statusMessage:   string;
    protected _method:          RequestMethods | string;
    protected _contentType:     string;
    protected _headers:         http.IncomingHttpHeaders;
    protected _cookies:         {[key:string]:string};
    protected _data:            Buffer;
    protected _text:            string;

    constructor() {
        this._url = '';
        this._statusCode = 0;
        this._statusMessage = '';
        this._method = RequestMethods.GET;
        this._contentType = '';
        this._headers = {};
        this._cookies = {};
        this._data = Buffer.alloc(0);
        this._text = '';
    }

    get url(): string {
        return this._url;
    }

    get statusCode(): number {
        return this._statusCode;
    }

    get statusMessage(): string {
        return this._statusMessage;
    }

    get method(): RequestMethods | string {
        return this._method;
    }

    get contentType(): string {
        return this._contentType;
    }

    get headers(): http.IncomingHttpHeaders {
        return this._headers;
    }

    get data(): Buffer {
        return this._data;
    }

    get text(): string {
        if (this._text === '') {
            this._text = this.data.toString();
        }
        return this._text;
    }

    json(): {[key:string]:any} {
        return JSON.parse(this.text);
    }
}

class ResponseBuilder extends Response {

    static start() {
        return new ResponseBuilder();
    }

    constructor() {
        super();
    }

    withHttpResponse(inMessage: http.IncomingMessage): ResponseBuilder {
        (this
            .withHeaders(inMessage.headers || {})
            .withStatusCode(inMessage.statusCode || 0)
            .withStatusMessage(inMessage.statusMessage || '')
            .withContentType((this._headers && this._headers['content-type']) || ''));
        return this;
    }

    withUrl(url: string): ResponseBuilder {
        this._url = url;
        return this;
    }

    withStatusCode(statusCode: number): ResponseBuilder {
        this._statusCode = statusCode;
        return this;
    }

    withStatusMessage(statusMessage: string): ResponseBuilder {
        this._statusMessage = statusMessage;
        return this;
    }

    withMethod(method: RequestMethods | string): ResponseBuilder {
        this._method = method;
        return this;
    }

    withContentType(contentType: string): ResponseBuilder {
        this._contentType = contentType;
        return this;
    }

    withHeaders(headers: http.IncomingHttpHeaders): ResponseBuilder {
        this._headers = headers;
        return this;
    }

    withData(data: Buffer): ResponseBuilder {
        this._text = '';
        this._data = data;
        return this;
    }

    build(): Response {
        return this as Response;
    }
}


export {
    Response,
    ResponseBuilder,
};
