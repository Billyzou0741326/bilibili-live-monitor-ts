"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WebSocket = require("ws");
var colors = require("colors/safe");
var index_1 = require("../task/index");
var index_2 = require("../fmt/index");
var WsServer = /** @class */ (function () {
    function WsServer(addr) {
        var _this = this;
        this._host = addr.host || '127.0.0.1';
        this._port = addr.port;
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
                        index_2.cprint("Client disconnected at " + addr, colors.blue);
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
    }
    Object.defineProperty(WsServer.prototype, "host", {
        get: function () {
            return this._host;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(WsServer.prototype, "port", {
        get: function () {
            return this._port;
        },
        enumerable: true,
        configurable: true
    });
    WsServer.prototype.reset = function () {
        this._ws = null;
        this._errored = false;
        this._healthTask.stop();
        this._clients.forEach(function (clientStatus) {
            clientStatus.client.close();
            clientStatus.client.terminate();
        });
        this._clients = [];
    };
    WsServer.prototype.stop = function () {
        this.reset();
    };
    WsServer.prototype.start = function () {
        try {
            if (this._ws === null) {
                this.listen(this.createServer());
            }
        }
        catch (error) {
            index_2.cprint("Failed to setup WS server: " + error.message, colors.red);
        }
    };
    WsServer.prototype.createServer = function () {
        var ws = new WebSocket.Server({
            'host': this.host,
            'port': this.port,
            'perMessageDeflate': false,
            'maxPayload': 4 * 1024,
        });
        index_2.cprint("WS server listening on " + this.host + ":" + this.port, colors.green);
        return ws;
    };
    WsServer.prototype.listen = function (ws) {
        var _this = this;
        this._ws = ws;
        ws.on('connection', function (socket, req) {
            var remoteAddr = (req.socket.remoteAddress + ":" + req.socket.remotePort);
            var clientStatus = {
                client: socket,
                isAlive: true,
                addr: remoteAddr,
            };
            _this._clients.push(clientStatus);
            index_2.cprint("Client \u8FDE\u63A5\u5EFA\u7ACB\u4E8E @" + remoteAddr, colors.magenta);
            (socket
                .on('pong', function () {
                clientStatus.isAlive = true;
            })
                .on('error', function (error) {
                index_2.cprint("(WS client) - " + error.message, colors.red);
                socket.close();
            })
                .on('message', function (in_message) { })
                .on('close', function () {
                clientStatus.isAlive = false;
            }));
            _this._healthTask.start();
        });
        ws.on('error', function (error) {
            ws.close(function () {
                if (error.code === 'EADDRINUSE') {
                    index_2.cprint("\u672A\u80FD\u5EFA\u7ACBws\u670D\u52A1 - \u7AEF\u53E3" + _this.port + "\u5DF2\u88AB\u5360\u7528", colors.red);
                    index_2.cprint('建议修改``settings.json``中的port值', colors.red);
                    _this._errored = true;
                }
                else {
                    index_2.cprint("(WS) - " + error.message, colors.red);
                }
            });
        });
        ws.on('close', function () { });
    };
    WsServer.prototype.broadcast = function (payload) {
        this._clients.forEach(function (clientStatus) {
            var client = clientStatus.client;
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload, {
                    'binary': true,
                });
            }
        });
    };
    WsServer.prototype.parseMessage = function (message) {
        var str = JSON.stringify(message);
        var data = Buffer.from(str);
        return data;
    };
    return WsServer;
}());
exports.WsServer = WsServer;
