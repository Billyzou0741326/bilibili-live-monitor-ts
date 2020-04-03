import * as http from 'http';
import * as express from 'express';
import * as chalk from 'chalk';
import { cprint } from '../fmt/index';
import { Raffle } from '../danmu/index';


interface HttpAddress {
    readonly port:      number;
    readonly host?:     string;
}


class Router {

    protected _router:      express.Router;

    protected constructor() {
        this.bind();
        this._router = express.Router({ 'mergeParams': true });
        this._router.use('/', this.setCors);
    }

    protected bind(): void {
        this.setCors = this.setCors.bind(this);
    }

    private setCors(request: express.Request, response: express.Response, next: express.NextFunction): void {
        response.append('Access-Control-Allow-Origin', ['*']);
        response.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        response.append('Access-Control-Allow-Headers', 'Content-Type');
        next();
    }

    public mountGetter(path: string, getter: (() => Raffle[])): Router {
        this._router.use(`/${path}`, (request: express.Request, response: express.Response): void => {
            response.jsonp(getter().map(g => g.toJson()));
        });
        return this;
    }
}

export class HttpServer extends Router implements HttpAddress {

    private _app:       express.Application;
    private _server:    http.Server | null;
    private _host:      string;
    private _port:      number;

    public constructor(addr: HttpAddress) {
        super();
        this._app = express();
        this._app.set('json spaces', 4);
        this._app.use('/', this._router);
        this._app.use('/', this.pageNotFound);
        this._server = null;
        this._host = addr.host || '0.0.0.0';
        this._port = addr.port;
    }

    public get host(): string {
        return this._host;
    }

    public get port(): number {
        return this._port;
    }

    private get app(): express.Application {
        return this._app;
    }

    protected bind(): void {
        super.bind();
        this.pageNotFound = this.pageNotFound.bind(this);
    }

    private pageNotFound(error: any, request: express.Request, response: express.Response, next: express.NextFunction): void {
        if (error) {
            response.status(400).send('<h1> Errored </h1>');
            return;
        }
        response.status(404).send('<h1> Page Not Found </h1>');
    }

    private createServer(): http.Server {
        const server = http.createServer(this.app);
        return server;
    }

    public start(): void {
        if (this._server === null) {
            this._server = this.createServer();
            this._server.on('error', (error: any): void => {
                if (error) {
                    if (error.code === 'EADDRINUSE') {
                        cprint(`未能建立http服务 - 端口${this.port}已被占用`, chalk.red);
                        cprint('建议修改``settings.json``中的httpServer.port值', chalk.red);
                    }
                    else {
                        cprint(`(Http) - ${error.message}`, chalk.red);
                    }
                }
            });
            this._server.listen(this.port, this.host);
            cprint(`Http server listening on ${this.host}:${this.port}`, chalk.green);
        }
    }

    public stop(): void {
        if (this._server !== null) {
            this._server.close();
            this._server = null;
        }
    }

}
