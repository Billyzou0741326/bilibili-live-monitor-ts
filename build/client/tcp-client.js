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
var events_1 = require("events");
var index_1 = require("../fmt/index");
var index_2 = require("../task/index");
var index_3 = require("../danmu/index");
var TCPConn = /** @class */ (function (_super) {
    __extends(TCPConn, _super);
    function TCPConn() {
        var _this = _super.call(this) || this;
        _this.socket_ = new net.Socket();
        _this.bind_();
        return _this;
    }
    TCPConn.prototype.bind_ = function () {
        this.onData = this.onData.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onConnect = this.onConnect.bind(this);
    };
    TCPConn.prototype.connect = function (addr) {
        if (this.socket_.destroyed) {
            this.socket_ = new net.Socket();
        }
        this.socket_.connect({
            host: addr.host || '0.0.0.0',
            port: addr.port || 0,
        });
        this.socket_.
            on('connect', this.onConnect).
            on('close', this.onClose).
            on('error', this.onError).
            on('data', this.onData);
    };
    TCPConn.prototype.onData = function (d) {
        if (typeof d === 'string') {
            d = Buffer.from(d);
        }
        return d;
    };
    TCPConn.prototype.onClose = function (hadError) {
    };
    TCPConn.prototype.onConnect = function () {
    };
    TCPConn.prototype.onError = function (e) {
        return e;
    };
    return TCPConn;
}(events_1.EventEmitter));
exports.TCPConn = TCPConn;
var TCPClientLK = /** @class */ (function (_super) {
    __extends(TCPClientLK, _super);
    function TCPClientLK() {
        var _this = _super.call(this) || this;
        _this.reader_ = new TCPReader();
        _this.heartbeat_ = Buffer.from([0, 0, 0, 0]);
        _this.heartbeat_task_ = new index_2.DelayedTask().
            withTime(30 * 1000).
            withCallback(function () {
            if (_this.socket_.destroyed)
                return;
            _this.socket_.write(_this.heartbeat_);
            _this.heartbeat_task_.start();
        });
        return _this;
    }
    TCPClientLK.prototype.onConnect = function () {
        this.sendHandshake();
    };
    TCPClientLK.prototype.sendHandshake = function () {
        if (this.socket_.destroyed)
            return;
        var data = JSON.stringify({});
        var header = Buffer.alloc(4);
        header.writeUInt32BE(data.length, 0);
        this.socket_.write(Buffer.concat([header, Buffer.from(data)]));
    };
    TCPClientLK.prototype.onClose = function (hadError) {
        this.heartbeat_task_.stop();
        this.socket_.unref().destroy();
    };
    TCPClientLK.prototype.onData = function (data) {
        var d = _super.prototype.onData.call(this, data);
        this.reader_.onData(d);
        var messages = this.reader_.getMessages();
        for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
            var msg = messages_1[_i];
            try {
                var data_1 = JSON.parse(msg.slice(4).toString());
                switch (data_1['type']) {
                    case 'raffle':
                        this.emitRaffle(data_1['data']);
                        break;
                    case 'error':
                    case 'heartbeat':
                    case 'sleep':
                    case 'update':
                    case 'exit':
                        break;
                    case 'entered':
                        this.socket_.write(this.heartbeat_);
                        this.heartbeat_task_.start();
                        break;
                }
            }
            catch (error) {
                index_1.cprint("(LK Reader) - " + error.message, chalk.red);
            }
        }
        return d;
    };
    TCPClientLK.prototype.emitRaffle = function (data) {
        switch (data['raffle_type']) {
            case 'storm':
                {
                    var g = new index_3.Storm().
                        withRoomid(data['room_id']).
                        withId(data['raffle_id']).
                        withType(data['raffle_type']).
                        withName(data['raffle_title']).
                        withExpireAt(Math.floor(0.001 * (new Date().valueOf())) + 20);
                    this.emit(data['raffle_type'], g);
                }
                break;
            case 'guard':
                {
                    var g = new index_3.Guard().
                        withRoomid(data['room_id']).
                        withId(data['raffle_id']).
                        withType(data['raffle_type']).
                        withName(data['raffle_title']).
                        withExpireAt(Math.floor(0.001 * (new Date().valueOf())) + 120 * 60);
                    this.emit(data['raffle_type'], g);
                }
                break;
            case 'pk':
                {
                    var g = new index_3.PK().
                        withRoomid(data['room_id']).
                        withId(data['raffle_id']).
                        withType(data['raffle_type']).
                        withName(data['raffle_title']).
                        withExpireAt(Math.floor(0.001 * (new Date().valueOf())) + 60);
                    this.emit(data['raffle_type'], g);
                }
                break;
            case 'anchor':
            case 'raffle':
            case 'small_tv': {
                this.emit('roomid', data['room_id']);
                break;
            }
        }
    };
    return TCPClientLK;
}(TCPConn));
exports.TCPClientLK = TCPClientLK;
var TCPReader = /** @class */ (function () {
    function TCPReader() {
        this.buf_ = Buffer.alloc(0);
        this.next_size_ = 0;
    }
    TCPReader.prototype.onData = function (d) {
        this.buf_ = Buffer.concat([this.buf_, d]);
    };
    TCPReader.prototype.getMessages = function () {
        var result = [];
        while (this.next_size_ <= 0 && this.buf_.length >= 4) {
            this.next_size_ = this.buf_.readUInt32BE(0);
            if (this.next_size_ <= 0) {
                this.buf_ = this.buf_.slice(4);
            }
        }
        while (this.next_size_ > 0 && this.buf_.length >= this.next_size_) {
            result.push(this.buf_.slice(0, 4 + this.next_size_));
            this.buf_ = this.buf_.slice(4 + this.next_size_, this.buf_.length);
            if (this.buf_.length >= 4) {
                this.next_size_ = this.buf_.readUInt32BE(0);
            }
            else if (this.buf_.length === 0) {
                this.next_size_ = 0;
            }
        }
        return result;
    };
    return TCPReader;
}());
