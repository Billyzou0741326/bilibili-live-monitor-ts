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
var WebSocket = require("ws");
var chalk = require("chalk");
var http = require("http");
var crypto = require("crypto");
var index_1 = require("../task/index");
var index_2 = require("../fmt/index");
var index_3 = require("../global/index");
var AbstractWsServer = /** @class */ (function () {
    function AbstractWsServer(addr) {
        var _this = this;
        this._host = addr.host || '127.0.0.1';
        this._port = addr.port;
        this._server = null;
        this._ws = null;
        this._errored = false;
        this._clients = [];
        this._healthTask = new index_1.DelayedTask();
        this._healthTask.withTime(20 * 1000).withCallback(function () {
            if (_this._ws !== null) {
                _this._clients = _this._clients.filter(function (clientStatus) {
                    var client = clientStatus.client;
                    var addr = clientStatus.addr;
                    if (!clientStatus.isAlive) {
                        index_2.cprint("Client disconnected at " + addr, chalk.blueBright);
                        client.removeAllListeners();
                        client.terminate();
                        return false;
                    }
                    clientStatus.isAlive = false;
                    client.ping(function () { });
                    return true;
                });
                if (_this._clients.length > 0) {
                    _this._healthTask.start();
                }
            }
            else {
                _this._healthTask.stop();
            }
        });
        this._appConfig = new index_3.AppConfig();
        this._appConfig.init();
    }
    Object.defineProperty(AbstractWsServer.prototype, "host", {
        get: function () {
            return this._host;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractWsServer.prototype, "port", {
        get: function () {
            return this._port;
        },
        enumerable: true,
        configurable: true
    });
    AbstractWsServer.prototype.reset = function () {
        this._ws = null;
        this._errored = false;
        this._healthTask.stop();
        this._clients.forEach(function (clientStatus) {
            clientStatus.client.close();
            clientStatus.client.terminate();
        });
        this._clients = [];
    };
    AbstractWsServer.prototype.stop = function () {
        this.reset();
    };
    AbstractWsServer.prototype.start = function () {
        try {
            if (this._ws === null) {
                this.createServer();
                this.listen();
            }
        }
        catch (error) {
            index_2.cprint("Failed to setup WS server: " + error.message, chalk.red);
        }
    };
    AbstractWsServer.prototype.createServer = function () {
        var _this = this;
        this._ws = new WebSocket.Server({
            noServer: true,
            perMessageDeflate: false,
            maxPayload: 4 * 1024
        });
        this._server = http.createServer()
            .listen(this.port, this.host)
            .on('upgrade', function (request, socket, head) {
            // If no users are defined, allow any connection
            var authenticated = _this._appConfig.users.length === 0;
            if (!authenticated) {
                try {
                    if (request.headers.hasOwnProperty('authorization')) {
                        var authorization = Buffer.from(request.headers.authorization.split(/\s+/).pop(), 'base64').toString().split(':');
                        var username_1 = authorization[0];
                        var password_1 = crypto.createHash('sha512').update(authorization[1]).digest('base64');
                        authenticated = _this._appConfig.users.find(function (user) { return user.id === username_1 && user.password === password_1; }) !== undefined;
                    }
                }
                catch (error) {
                    index_2.cprint("Client " + socket.remoteAddress + ":" + socket.remotePort + " authentication failure - " + error.message, chalk.red);
                    return;
                }
            }
            if (authenticated) {
                _this._ws.handleUpgrade(request, socket, head, function (ws) {
                    _this._ws.emit('connection', ws, request);
                });
            }
            else {
                index_2.cprint("Client " + socket.remoteAddress + ":" + socket.remotePort + " authentication rejected", chalk.yellow);
                socket.write('HTTP/1.1 401 Unauthorized\r\n' +
                    'Date: ' + new Date().toUTCString() + '\r\n' +
                    'WWW-Authenticate: Basic\r\n' +
                    '\r\n');
                socket.destroy();
            }
        });
        index_2.cprint("WS server listening on " + this.host + ":" + this.port, chalk.green);
    };
    AbstractWsServer.prototype.listen = function () {
        var _this = this;
        this._ws
            .on('connection', function (socket, req) {
            var remoteAddr = (req.socket.remoteAddress + ":" + req.socket.remotePort);
            var clientStatus = {
                client: socket,
                isAlive: true,
                addr: remoteAddr,
            };
            _this._clients.push(clientStatus);
            index_2.cprint("Client connected at " + remoteAddr, chalk.blueBright);
            (socket
                .on('pong', function () {
                clientStatus.isAlive = true;
            })
                .on('error', function (error) {
                index_2.cprint("(WS client) - " + error.message, chalk.red);
                socket.close();
            })
                .on('message', function (in_message) { })
                .on('close', function () {
                clientStatus.isAlive = false;
            }));
            _this._healthTask.start();
        })
            .on('error', function (error) {
            _this._ws.close(function () {
                if (error.code === 'EADDRINUSE') {
                    index_2.cprint("\u672A\u80FD\u5EFA\u7ACBws\u670D\u52A1 - \u7AEF\u53E3" + _this.port + "\u5DF2\u88AB\u5360\u7528", chalk.red);
                    index_2.cprint('建议修改``settings.json``中的port值', chalk.red);
                    _this._errored = true;
                }
                else {
                    index_2.cprint("(WS) - " + error.message, chalk.red);
                }
            });
        })
            .on('close', function () { });
    };
    return AbstractWsServer;
}());
var WsServer = /** @class */ (function (_super) {
    __extends(WsServer, _super);
    function WsServer(addr) {
        return _super.call(this, addr) || this;
    }
    WsServer.prototype.broadcast = function (data) {
        var json = data.toJson();
        if (json.length > 0) {
            this._clients.forEach(function (clientStatus) {
                var client = clientStatus.client;
                if (client.readyState === WebSocket.OPEN) {
                    client.send(json, {
                        'binary': true,
                    });
                }
            });
        }
    };
    return WsServer;
}(AbstractWsServer));
exports.WsServer = WsServer;
var WsServerBilive = /** @class */ (function (_super) {
    __extends(WsServerBilive, _super);
    function WsServerBilive(addr) {
        return _super.call(this, addr) || this;
    }
    WsServerBilive.prototype.broadcast = function (data) {
        var payload = this.parseMessage(data);
        this._clients.forEach(function (clientStatus) {
            var client = clientStatus.client;
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    };
    WsServerBilive.prototype.parseMessage = function (data) {
        var toKey = {
            'id': 'id',
            'roomid': 'roomID',
            'name': 'title',
            'type': 'type',
        };
        var translated = {};
        Object.keys(toKey).forEach(function (key) {
            translated[toKey[key]] = data[key];
        });
        switch (data['category']) {
            case 'gift':
                translated['cmd'] = 'raffle';
                break;
            case 'guard':
                translated['cmd'] = 'lottery';
                break;
            case 'storm':
                translated['cmd'] = 'beatStorm';
                break;
            case 'pk':
                translated['cmd'] = 'pklottery';
                break;
        }
        var str = JSON.stringify(translated);
        return str;
    };
    return WsServerBilive;
}(AbstractWsServer));
exports.WsServerBilive = WsServerBilive;
