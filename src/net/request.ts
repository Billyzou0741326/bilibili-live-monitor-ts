import * as http from 'http';
import * as https from 'https';
import * as querystring from 'querystring';

let httpAgent: any = null;
let httpsAgent: any = null;

initializeAgents();

enum RequestMethods {
    GET = 'GET',
    PUT = 'PUT',
    POST = 'POST',
    HEAD = 'HEAD',
    DELETE = 'DELETE',
}

interface RequestOptions {
    readonly host:      string;
    readonly path?:     string;
    readonly port?:     number;
    readonly method?:   string;
    readonly headers?:  {[key: string]: any};
    readonly agent?:    http.Agent | https.Agent;
    readonly timeout?:  number;
    [propName: string]: any;
}

class Request {

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

    constructor() {
        this._host = '';
        this._path = '';
        this._port = 80;
        this._https = false;
        this._method = RequestMethods.GET;
        this._params = {};
        this._data = undefined;
        this._headers = {};
        this._cookies = {};
        this._contentType = '';
        this._agent = httpAgent;
        this._timeout = 4000;
    }

    toHttpOptions(): RequestOptions {
        let path:       string = this.path;
        let paramstr:   string = '';
        let cookiestr:  string = '';
        let headers:    {[key: string]: string} = {};
        let timeout:    number = 4000;
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
        return {
            host:       this.host,
            path:       path,
            port:       this.port,
            method:     this.method,
            headers:    this.headers,
            agent:      this.agent,
            timeout:    timeout,
        };
    }

    static Builder(): RequestBuilder {
        return new RequestBuilder();
    }

    static get GET(): RequestMethods {
        return RequestMethods.GET;
    }

    static get PUT(): RequestMethods {
        return RequestMethods.PUT;
    }

    static get POST(): RequestMethods {
        return RequestMethods.POST;
    }

    static get HEAD(): RequestMethods {
        return RequestMethods.HEAD;
    }

    static get DELETE(): RequestMethods {
        return RequestMethods.DELETE;
    }

    get host(): string {
        return this._host;
    }

    get path(): string {
        return this._path;
    }

    get port(): number {
        return this._port;
    }

    get https(): boolean {
        return this._https;
    }

    get method(): RequestMethods {
        return this._method;
    }

    get params(): object | string {
        return this._params;
    }

    get data(): any {
        return this._data;
    }

    get headers(): object {
        return this._headers;
    }

    get agent(): http.Agent {
        return this._agent;
    }

    get contentType(): string {
        return this._contentType;
    }

    get timeout(): number {
        return this._timeout;
    }

}

class RequestBuilder extends Request {

    static start() {
        return new RequestBuilder();
    }

    constructor() {
        super();
    }

    withHost(host: string): RequestBuilder {
        this._host = host;
        return this;
    }

    withPath(path: string): RequestBuilder {
        this._path = path;
        return this;
    }

    withPort(port: number): RequestBuilder {
        this._port = port;
        return this;
    }

    withHttps(): RequestBuilder {
        this._https = true;
        if ([ 80, 443 ].includes(this._port)) {
            this._port = 443;
        }
        this.withAgent(httpsAgent);
        return this;
    }

    withMethod(method: RequestMethods): RequestBuilder {
        this._method = method;
        return this;
    }

    withParams(params: object | string): RequestBuilder {
        this._params = params;
        return this;
    }

    withData(data: any): RequestBuilder {
        this._data = data;
        return this;
    }

    withHeaders(headers: object): RequestBuilder {
        this._headers = headers;
        return this;
    }

    withCookies(cookies: object | string): RequestBuilder {
        this._cookies = cookies;
        return this;
    }

    withContentType(contentType: string): RequestBuilder {
        this._contentType = contentType;
        return this;
    }

    withAgent(agent: http.Agent): RequestBuilder {
        this._agent = agent;
        return this;
    }

    withTimeout(timeout: number): RequestBuilder {
        this._timeout = timeout;
        return this;
    }

    build(): Request {
        return this as Request;
    }

}

function initializeAgents(): object {
    if (httpAgent === null) {
        httpAgent = new http.Agent({
            keepAlive: true,
            maxFreeSockets: 128,
        });
    }
    if (httpsAgent === null) {
        httpsAgent = new https.Agent({
            keepAlive: true,
            maxFreeSockets: 32,
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

export {
    Request,
    RequestOptions,
    RequestMethods,
    RequestBuilder,
};
