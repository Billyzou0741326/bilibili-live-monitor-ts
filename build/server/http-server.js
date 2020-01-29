"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var express = require("express");
var chalk = require("chalk");
var index_1 = require("../fmt/index");
var Router = /** @class */ (function () {
    function Router() {
        var _this = this;
        this.bind();
        this._pathHandler = {
            gift: function () { return []; },
            guard: function () { return []; },
            anchor: function () { return []; },
        };
        this._router = express.Router({ 'mergeParams': true });
        this._router.use('/', this.setCors);
        this._router.use('/gift', function (request, response) {
            response.jsonp(_this._pathHandler.gift());
        });
        this._router.use('/guard', function (request, response) {
            response.jsonp(_this._pathHandler.guard());
        });
        this._router.use('/anchor', function (request, response) {
            response.jsonp(_this._pathHandler.anchor());
        });
    }
    Router.prototype.bind = function () {
        this.setCors = this.setCors.bind(this);
    };
    Router.prototype.setCors = function (request, response, next) {
        response.append('Access-Control-Allow-Origin', ['*']);
        response.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        response.append('Access-Control-Allow-Headers', 'Content-Type');
        next();
    };
    Router.prototype.mountGetter = function (path, getter) {
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
    };
    return Router;
}());
var HttpServer = /** @class */ (function (_super) {
    __extends(HttpServer, _super);
    function HttpServer(addr) {
        var _this = _super.call(this) || this;
        _this._app = express();
        _this._app.set('json spaces', 4);
        _this._app.use('/', _this._router);
        _this._app.use('/', _this.pageNotFound);
        _this._server = null;
        _this._host = addr.host || '0.0.0.0';
        _this._port = addr.port;
        return _this;
    }
    Object.defineProperty(HttpServer.prototype, "host", {
        get: function () {
            return this._host;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpServer.prototype, "port", {
        get: function () {
            return this._port;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpServer.prototype, "app", {
        get: function () {
            return this._app;
        },
        enumerable: true,
        configurable: true
    });
    HttpServer.prototype.bind = function () {
        _super.prototype.bind.call(this);
        this.pageNotFound = this.pageNotFound.bind(this);
    };
    HttpServer.prototype.pageNotFound = function (error, request, response, next) {
        if (error) {
            response.status(400).send('<h1> Errored </h1>');
            return;
        }
        response.status(404).send('<h1> Page Not Found </h1>');
    };
    HttpServer.prototype.createServer = function () {
        var server = http.createServer(this.app);
        return server;
    };
    HttpServer.prototype.start = function () {
        var _this = this;
        if (this._server === null) {
            this._server = this.createServer();
            this._server.on('error', function (error) {
                if (error) {
                    if (error.code === 'EADDRINUSE') {
                        index_1.cprint("\u672A\u80FD\u5EFA\u7ACBhttp\u670D\u52A1 - \u7AEF\u53E3" + _this.port + "\u5DF2\u88AB\u5360\u7528", chalk.red);
                        index_1.cprint('建议修改``settings.json``中的httpServer.port值', chalk.red);
                    }
                    else {
                        index_1.cprint("(Http) - " + error.message, chalk.red);
                    }
                }
            });
            this._server.listen(this.port, this.host);
            index_1.cprint("Http server listening on " + this.host + ":" + this.port, chalk.green);
        }
    };
    HttpServer.prototype.stop = function () {
        if (this._server !== null) {
            this._server.close();
            this._server = null;
        }
    };
    return HttpServer;
}(Router));
exports.HttpServer = HttpServer;
