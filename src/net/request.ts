import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as querystring from 'querystring';

let httpAgent: any = null;
let httpsAgent: any = null;

initializeAgents();

export enum RequestMethods {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    HEAD = 'HEAD',
    DELETE = 'DELETE',
}

export enum HttpVersion {
    HTTP_VERSION_1 = 1,
    HTTP_VERSION_2 = 2,
}

export interface RequestOptions {
    readonly host:      string;
    readonly path?:     string;
    readonly port?:     number;
    readonly method?:   string;
    readonly headers?:  {[key: string]: any};
    readonly agent?:    http.Agent | https.Agent;
    readonly timeout?:  number;
    [propName: string]: any;
}

export class Request {

    protected _host:        string;
    protected _path:        string;
    protected _port:        number;
    protected _https:       boolean;
    protected _method:      RequestMethods;
    protected _params:      object | string;
    protected _data:        any;
    protected _headers:     object;
    protected _cookies:     object | string;
    protected _contentType: string;
    protected _agent:       http.Agent;
    protected _timeout:     number;
    protected _version:     HttpVersion;

    public constructor() {
        this._host = '';
        this._path = '';
        this._port = 443;
        this._https = true;
        this._method = RequestMethods.GET;
        this._params = {};
        this._data = undefined;
        this._headers = {};
        this._cookies = {};
        this._contentType = '';
        this._agent = httpsAgent;
        this._timeout = 8000;
        this._version = HttpVersion.HTTP_VERSION_1;
    }

    public toHttpOptions(): RequestOptions {
        let path:       string = this.path;
        let paramstr:   string = '';
        let cookiestr:  string = '';
        let headers:    {[key: string]: string} = {};
        let timeout:    number = 8000;
        if (typeof this._params !== 'string') {
            paramstr = formatParams(this._params);
        }
        else {
            paramstr = this._params;
        }
        paramstr && (path = `${path}?${paramstr}`);
        if (typeof this._cookies !== 'string') {
            cookiestr = formatCookies(this._cookies);
            cookiestr && (headers['Cookie'] = cookiestr);
        }
        if (this._contentType) {
            headers['Content-Type'] = this._contentType;
        }
        if (this._timeout && this._timeout > 0) {
            timeout = this._timeout;
        }
        Object.assign(headers, this.headers);
        this._headers = headers;

        const options: any = {
            host:       this.host,
            path:       path,
            port:       this.port,
            method:     this.method,
            headers:    this.headers,
            agent:      this.agent,
            timeout:    timeout,
        };
        if (this.version === Request.HTTP_VERSION_2) {
            delete options.headers['Connection'];
            options.headers[http2.constants.HTTP2_HEADER_PATH] = path;
            options.headers[http2.constants.HTTP2_HEADER_METHOD] = this.method;
            options.headers[http2.constants.HTTP2_HEADER_SCHEME] = this.https ? 'https' : 'http';
            return options.headers;
        }
        return options;
    }

    public static Builder(): RequestBuilder {
        return new RequestBuilder();
    }

    public static get GET(): RequestMethods {
        return RequestMethods.GET;
    }

    public static get PUT(): RequestMethods {
        return RequestMethods.PUT;
    }

    public static get POST(): RequestMethods {
        return RequestMethods.POST;
    }

    public static get HEAD(): RequestMethods {
        return RequestMethods.HEAD;
    }

    public static get DELETE(): RequestMethods {
        return RequestMethods.DELETE;
    }

    public static get HTTP_VERSION_1(): HttpVersion {
        return HttpVersion.HTTP_VERSION_1;
    }

    public static get HTTP_VERSION_2(): HttpVersion {
        return HttpVersion.HTTP_VERSION_2;
    }

    public get host(): string {
        return this._host;
    }

    public get path(): string {
        return this._path;
    }

    public get port(): number {
        return this._port;
    }

    public get https(): boolean {
        return this._https;
    }

    public get method(): RequestMethods {
        return this._method;
    }

    public get params(): object | string {
        return this._params;
    }

    public get data(): any {
        return this._data;
    }

    public get headers(): object {
        return this._headers;
    }

    public get agent(): http.Agent {
        return this._agent;
    }

    public get contentType(): string {
        return this._contentType;
    }

    public get timeout(): number {
        return this._timeout;
    }

    public get version(): HttpVersion {
        return this._version;
    }

}

export class RequestBuilder extends Request {

    public static start() {
        return new RequestBuilder();
    }

    public constructor() {
        super();
    }

    public withHost(host: string): this {
        this._host = host;
        return this;
    }

    public withPath(path: string): this {
        this._path = path;
        return this;
    }

    public withPort(port: number): this {
        this._port = port;
        return this;
    }

    /** ``version``: HTTP_VERSION_1 or HTTP_VERSION_2 */
    public withHttpVersion(version: HttpVersion): this {
        this._version = version;
        return this;
    }

    public withHttps(): this {
        this._https = true;
        if ([ 80, 443 ].includes(this._port)) {
            this._port = 443;
        }
        this.withAgent(httpsAgent);
        return this;
    }

    public noHttps(): this {
        this._https = false;
        if ([ 80, 443 ].includes(this._port)) {
            this._port = 80;
        }
        this.withAgent(httpAgent);
        return this;
    }

    public withMethod(method: RequestMethods): this {
        this._method = method;
        return this;
    }

    public withParams(params: object | string): this {
        this._params = params;
        return this;
    }

    public withData(data: any): this {
        this._data = data;
        return this;
    }

    public withHeaders(headers: object): this {
        if (headers) {
            this._headers = headers;
        }
        return this;
    }

    public withCookies(cookies: object | string): this {
        this._cookies = cookies;
        return this;
    }

    public withContentType(contentType: string): this {
        this._contentType = contentType;
        return this;
    }

    public withAgent(agent: http.Agent): this {
        this._agent = agent;
        return this;
    }

    public withTimeout(timeout: number): this {
        this._timeout = timeout;
        return this;
    }

    public build(): Request {
        return this as Request;
    }

}

function initializeAgents(): object {
    if (httpAgent === null) {
        httpAgent = new http.Agent({
            keepAlive: true,
            maxFreeSockets: 1024,
        });
    }
    if (httpsAgent === null) {
        httpsAgent = new https.Agent({
            keepAlive: true,
            maxFreeSockets: 64,
        });
    }
    return { httpAgent, httpsAgent };
}

function formatParams(params: {[key:string]:any}): string {
    const formattedParams = querystring.stringify(params, '&', '=');
    return formattedParams;
}

function formatCookies(cookies: {[key:string]:any}): string {
    const options = {
        'encodeURIComponent': querystring.unescape,
    };
    const formattedCookies = querystring.stringify(cookies, '; ', '=', options);
    return formattedCookies;
}
