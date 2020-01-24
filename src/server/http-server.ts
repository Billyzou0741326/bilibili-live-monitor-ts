import * as http from 'http';
import * as express from 'express';
import * as colors from 'colors';
import { cprint } from '../fmt/index';
import {
    Gift,
    Guard,
    Anchor, } from '../danmu/index';


interface HttpAddress {
    readonly port:      number;
    readonly host?:     string;
}


interface PathHandler {
    [key: string]:  () => any;
}

class Router {

    protected _router:      express.Router;
    private _pathHandler:   PathHandler;

    constructor() {
        this.bind();
        this._pathHandler = {
            gift:   () => [],
            guard:  () => [],
            anchor: () => [],
        };
        this._router = express.Router({ 'mergeParams': true });
        this._router.use('/', this.setCors);
        this._router.use('/gift', (request: express.Request, response: express.Response): void => {
            response.jsonp(this._pathHandler.gift());
        });
        this._router.use('/guard', (request: express.Request, response: express.Response): void => {
            response.jsonp(this._pathHandler.guard());
        });
        this._router.use('/anchor', (request: express.Request, response: express.Response): void => {
            response.jsonp(this._pathHandler.anchor());
        });
    }

    bind(): void {
        this.setCors = this.setCors.bind(this);
    }

    setCors(request: express.Request, response: express.Response, next: express.NextFunction): void {
        response.append('Access-Control-Allow-Origin', ['*']);
        response.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        response.append('Access-Control-Allow-Headers', 'Content-Type');
        next();
    }

    mountGetter(path: string, getter: (() => Gift[]) | (() => Guard[]) | (() => Anchor[])): Router {
        switch (path) {
            case 'gift':
                this._pathHandler.gift = getter;
                break;
            case 'guard':
                this._pathHandler.guard = getter;
                break;
            case 'anchor':
                this._pathHandler.anchor = getter;
                break;
        }
        return this;
    }
}

export class HttpServer extends Router implements HttpAddress {

    private _app:       express.Application;
    private _server:    http.Server | null;
    private _host:      string;
    private _port:      number;

    constructor(addr: HttpAddress) {
        super();
        this._app = express();
        this._app.set('json spaces', 4);
        this._app.use('/', this._router);
        this._app.use('/', this.pageNotFound);
        this._server = null;
        this._host = addr.host || '0.0.0.0';
        this._port = addr.port;
    }

    get host(): string {
        return this._host;
    }

    get port(): number {
        return this._port;
    }

    get app(): express.Application {
        return this._app;
    }

    bind(): void {
        super.bind();
        this.pageNotFound = this.pageNotFound.bind(this);
    }

    pageNotFound(error: any, request: express.Request, response: express.Response, next: express.NextFunction): void {
        if (error) {
            response.status(400).send('<h1> Errored </h1>');
            return;
        }
        response.status(404).send('<h1> Page Not Found </h1>');
    }

    createServer(): http.Server {
        const server = http.createServer(this.app);
        return server;
    }

    start(): void {
        if (this._server === null) {
            this._server = this.createServer();
            this._server.on('error', (error: any): void => {
                if (error) {
                    if (error.code === 'EADDRINUSE') {
                        cprint(`未能建立http服务 - 端口${this.port}已被占用`, colors.red);
                        cprint('建议修改``settings.json``中的httpServer.port值', colors.red);
                    }
                    else {
                        cprint(`(Http) - ${error.message}`, colors.red);
                    }
                }
            });
            this._server.listen(this.port, this.host);
            cprint(`Http server listening on ${this.host}:${this.port}`, colors.green);
        }
    }

    stop(): void {
        if (this._server !== null) {
            this._server.close();
            this._server = null;
        }
    }

}
