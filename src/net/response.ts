import * as http from 'http';
import * as http2 from 'http2';
import { RequestMethods, HttpVersion } from './index';

export class Response {

    protected _url:             string;
    protected _statusCode:      number;
    protected _statusMessage:   string;
    protected _method:          RequestMethods | string;
    protected _contentType:     string;
    protected _headers:         http.IncomingHttpHeaders;
    protected _cookies:         {[key:string]:string};
    protected _data:            Buffer;
    protected _text:            string;
    protected _version:         HttpVersion;

    public constructor() {
        this._url = '';
        this._statusCode = 0;
        this._statusMessage = '';
        this._method = RequestMethods.GET;
        this._contentType = '';
        this._headers = {};
        this._cookies = {};
        this._data = Buffer.alloc(0);
        this._text = '';
        this._version = HttpVersion.HTTP_VERSION_2;
    }

    public static Builder(): ResponseBuilder {
        return new ResponseBuilder();
    }

    public get url(): string {
        return this._url;
    }

    public get statusCode(): number {
        return this._statusCode;
    }

    public get statusMessage(): string {
        return this._statusMessage;
    }

    public get method(): RequestMethods | string {
        return this._method;
    }

    public get contentType(): string {
        return this._contentType;
    }

    public get headers(): http.IncomingHttpHeaders {
        return this._headers;
    }

    public get data(): Buffer {
        return this._data;
    }

    public get version(): HttpVersion {
        return this._version;
    }

    public get text(): string {
        if (this._text === '') {
            this._text = this.data.toString();
        }
        return this._text;
    }

    public json(): {[key:string]:any} {
        return JSON.parse(this.text);
    }
}

export class ResponseBuilder extends Response {

    public static start() {
        return new ResponseBuilder();
    }

    public constructor() {
        super();
    }

    public withHttpResponse(inMessage: http.IncomingMessage): this {
        (this
            .withHeaders(inMessage.headers || {})
            .withStatusCode(inMessage.statusCode || 0)
            .withStatusMessage(inMessage.statusMessage || '')
            .withContentType((this._headers && this._headers['content-type']) || ''));
        return this;
    }

    public withUrl(url: string): this {
        this._url = url;
        return this;
    }

    public withStatusCode(statusCode: number): this {
        this._statusCode = statusCode;
        return this;
    }

    public withStatusMessage(statusMessage: string): this {
        this._statusMessage = statusMessage;
        return this;
    }

    public withMethod(method: RequestMethods | string): this {
        this._method = method;
        return this;
    }

    public withContentType(contentType: string): this {
        this._contentType = contentType;
        return this;
    }

    public withHeaders(headers: http.IncomingHttpHeaders): this {
        this._headers = headers;
        return this;
    }

    public withData(data: Buffer): this {
        this._text = '';
        this._data = data;
        return this;
    }

    public withHttpVersion(version: HttpVersion): this {
        this._version = version;
        return this;
    }

    public build(): Response {
        return this as Response;
    }
}
