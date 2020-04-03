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
var net = require("net");
var chalk = require("chalk");
var index_1 = require("../fmt/index");
var index_2 = require("../task/index");
var AbstractTCPServer = /** @class */ (function () {
    function AbstractTCPServer(addr) {
        var _this = this;
        this._host = addr.host || '0.0.0.0';
        this._port = addr.port;
        this._socket = null;
        this._errored = false;
        this._clients = [];
        this._healthTask = new index_2.DelayedTask();
        this._healthTask.withTime(35 * 1000).withCallback(function () {
            if (_this._socket !== null) {
                _this._clients = _this._clients.filter(function (clientStatus) {
                    var socket = clientStatus.socket;
                    var addr = clientStatus.addr;
                    if (!clientStatus.isAlive) {
                        index_1.cprint("Client disconnected at " + addr, chalk.blueBright);
                        socket.removeAllListeners();
                        socket.unref().destroy();
                        return false;
                    }
                    clientStatus.isAlive = false;
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
    AbstractTCPServer.prototype.reset = function () {
        this._socket = null;
        this._errored = false;
        this._healthTask.stop();
        this._clients.forEach(function (clientStatus) {
            clientStatus.socket.unref().destroy();
        });
        this._clients = [];
    };
    AbstractTCPServer.prototype.start = function () {
        try {
            if (this._socket === null) {
                this._socket = this.createServer();
                this._socket.listen(this.port, this.host);
                index_1.cprint("TCP server listening on " + this.host + ":" + this.port, chalk.green);
            }
        }
        catch (error) {
            index_1.cprint("Failed to setup WS server: " + error.message, chalk.red);
        }
    };
    AbstractTCPServer.prototype.stop = function () {
        this.reset();
    };
    AbstractTCPServer.prototype.createServer = function () {
        var _this = this;
        var server = net.createServer(function (c) {
            var lastRead = new Date().valueOf();
            var clientStatus = null;
            var reader = _this.createReader();
            clientStatus = {
                socket: c,
                isAlive: true,
                addr: c.remoteAddress,
                reader: reader,
            };
            _this._clients.push(clientStatus);
            index_1.cprint("Client connected at " + clientStatus.addr, chalk.blueBright);
            c.on('connect', function () {
                index_1.cprint('c.on(\'connect\')', chalk.yellow);
            });
            c.on('error', function (error) {
                index_1.cprint("(TCP client) - " + error.message, chalk.red);
                c.end();
                c.destroy();
                c.unref();
            });
            c.on('data', function (data) {
                if (clientStatus !== null) {
                    _this.onData(data, clientStatus);
                }
            });
            c.on('end', function () {
                c.destroy();
                c.unref();
            });
            _this._healthTask.start();
        });
        server.on('error', function (error) {
            server.close(function () {
                if (error.code === 'EADDRINUSE') {
                    index_1.cprint("\u672A\u80FD\u5EFA\u7ACBtcp\u670D\u52A1 - \u7AEF\u53E3" + _this.port + "\u5DF2\u88AB\u5360\u7528", chalk.red);
                    index_1.cprint('建议修改``settings.json``中的port值', chalk.red);
                    _this._errored = true;
                }
                else {
                    index_1.cprint("(TCP Server) - " + error.message, chalk.red);
                }
            });
        });
        return server;
    };
    Object.defineProperty(AbstractTCPServer.prototype, "host", {
        get: function () {
            return this._host;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractTCPServer.prototype, "port", {
        get: function () {
            return this._port;
        },
        enumerable: true,
        configurable: true
    });
    return AbstractTCPServer;
}());
var TCPServerBiliHelper = /** @class */ (function (_super) {
    __extends(TCPServerBiliHelper, _super);
    function TCPServerBiliHelper(addr) {
        return _super.call(this, addr) || this;
    }
    TCPServerBiliHelper.prototype.createReader = function () {
        return new BiliHelperReader();
    };
    TCPServerBiliHelper.prototype.parseMessage = function (data) {
        if (typeof data === 'string') {
            data = Buffer.from(data);
        }
        var headerLen = 4;
        var totalLen = data.length;
        var header = Buffer.alloc(headerLen);
        header.writeUInt32BE(totalLen, 0);
        var buffer = Buffer.concat([header, data]);
        return buffer;
    };
    TCPServerBiliHelper.prototype.onData = function (data, client) {
        var socket = client.socket;
        var msg = null;
        if (socket.destroyed)
            return;
        client.reader.onData(data);
        try {
            msg = client.reader.getMessage();
            while (msg !== null) {
                var payload = null;
                if (msg.length > 0) {
                    var d = JSON.parse(msg.toString());
                    if (d['type'] === 'ask') {
                        payload = this.parseMessage(JSON.stringify({
                            code: 0,
                            type: 'entered',
                            data: {},
                        }));
                    }
                }
                else {
                    payload = this.parseMessage(JSON.stringify({
                        code: 0,
                        type: 'heartbeat',
                        data: {
                            heartbeat: true,
                            now: Math.floor(0.001 * new Date().valueOf()),
                        },
                    }));
                    client.isAlive = true;
                }
                payload && socket.write(payload);
                msg = client.reader.getMessage();
            }
        }
        catch (error) {
            index_1.cprint("(TCP client) - " + error.message, chalk.red);
            var msg_1 = this.parseMessage(JSON.stringify({
                code: -1,
                type: 'error',
                data: {
                    msg: error.message,
                },
            }));
            socket.write(msg_1);
            socket.end();
            socket.destroy();
            socket.unref();
        }
    };
    TCPServerBiliHelper.prototype.broadcast = function (data) {
        if (this._clients.length === 0) {
            return;
        }
        var wrapper = {
            code: 0,
            type: 'raffle',
            data: {},
        };
        var intermediateData = {
            room_id: data.roomid,
            raffle_id: data.id,
            raffle_type: '',
            raffle_title: '',
            source: 'bilibili-live-monitor',
        };
        switch (data.category) {
            case 'gift':
                intermediateData.raffle_type = 'smalltv';
                intermediateData.raffle_title = data.name;
                break;
            case 'storm':
                intermediateData.raffle_type = 'smalltv';
                intermediateData.raffle_title = '节奏风暴';
                break;
            case 'anchor':
                intermediateData.raffle_type = 'anchor';
                intermediateData.raffle_title = '天选时刻';
                break;
            case 'guard':
                intermediateData.raffle_type = 'guard';
                intermediateData.raffle_title = data.name;
                break;
            case 'pk':
                intermediateData.raffle_type = 'pk';
                intermediateData.raffle_title = data.name;
                break;
            default:
                return;
        }
        wrapper.data = intermediateData;
        var msg = this.parseMessage(JSON.stringify(wrapper));
        for (var _i = 0, _a = this._clients; _i < _a.length; _i++) {
            var c = _a[_i];
            var socket = c.socket;
            if (socket.destroyed === false) {
                socket.write(msg);
            }
        }
    };
    return TCPServerBiliHelper;
}(AbstractTCPServer));
exports.TCPServerBiliHelper = TCPServerBiliHelper;
var BiliHelperReader = /** @class */ (function () {
    function BiliHelperReader() {
        this._data = Buffer.alloc(0);
        this._totalLen = 0;
    }
    BiliHelperReader.prototype.onData = function (data) {
        if (typeof data === 'string') {
            data = Buffer.from(data, 'utf8');
        }
        this._data = Buffer.concat([this._data, data]);
    };
    BiliHelperReader.prototype.getMessage = function () {
        var result = null;
        if (this._totalLen <= 0 && this._data.length >= 4) {
            this._totalLen = this._data.readUInt32BE(0) + 4;
        }
        if (this._totalLen > 0 && this._data.length >= this._totalLen) {
            result = this._data.slice(4, this._totalLen);
            this._data = this._data.slice(this._totalLen, this._data.length);
            var len = this._data.length;
            if (len === 0) {
                this._totalLen = 0;
                this._data = Buffer.alloc(0);
            }
            else if (len >= 4) {
                this._totalLen = this._data.readUInt32BE(0) + 4;
            }
            else {
                this._totalLen = -1;
            }
        }
        return result;
    };
    return BiliHelperReader;
}());
