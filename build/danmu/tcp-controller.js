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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
var events_1 = require("events");
var index_1 = require("../fmt/index");
var index_2 = require("../bilibili/index");
var index_3 = require("../global/index");
var index_4 = require("../task/index");
var index_5 = require("./index");
var DownRate = /** @class */ (function () {
    function DownRate() {
    }
    return DownRate;
}());
var tcpaddr = new index_3.AppConfig().danmuAddr;
var AbstractRoomController = /** @class */ (function (_super) {
    __extends(AbstractRoomController, _super);
    function AbstractRoomController() {
        var _this = _super.call(this) || this;
        _this._connections = new Map();
        _this._recentlyClosed = [];
        _this._taskQueue = new index_4.RateLimiter(50, 1000);
        return _this;
    }
    Object.defineProperty(AbstractRoomController.prototype, "connected", {
        get: function () {
            return Array.from(this._connections.keys());
        },
        enumerable: true,
        configurable: true
    });
    AbstractRoomController.prototype.add = function (rooms) {
        var _this = this;
        var roomids = [].concat(rooms);
        var established = this.connected;
        var closed = this._recentlyClosed;
        var filtered = roomids.filter(function (roomid) {
            return (!established.includes(roomid)
                && !closed.includes(roomid));
        });
        new Set(filtered).forEach(function (roomid) { _this.setupRoom(roomid); });
        this.clearClosed();
    };
    AbstractRoomController.prototype.stop = function () {
        this._connections.forEach(function (listener) { return listener.destroy(); });
    };
    AbstractRoomController.prototype.setupRoom = function (roomid, areaid) {
    };
    AbstractRoomController.prototype.clearClosed = function () {
        var len = this._recentlyClosed.length;
        if (len > 50) {
            this._recentlyClosed.splice(0, len - 25);
        }
    };
    return AbstractRoomController;
}(events_1.EventEmitter));
exports.AbstractRoomController = AbstractRoomController;
var GuardController = /** @class */ (function (_super) {
    __extends(GuardController, _super);
    function GuardController() {
        var _this = _super.call(this) || this;
        _this._cls = index_5.FixedGuardMonitor;
        return _this;
    }
    GuardController.prototype.setupRoom = function (roomid, areaid) {
        var _this = this;
        if (this._cls === index_5.DynamicGuardMonitor) {
            if (this._recentlyClosed.includes(roomid) || this.connected.includes(roomid)) {
                return;
            }
        }
        else if (this._cls === FixedGuardController) {
            if (this.connected.includes(roomid)) {
                return;
            }
        }
        var roomInfo = {
            roomid: roomid,
        };
        var listener = new this._cls(tcpaddr, roomInfo);
        this._connections.set(roomid, listener);
        this._taskQueue.add(function () { listener.start(); });
        (listener
            .on('close', function () {
            _this._connections.delete(roomid);
            _this._recentlyClosed.push(roomid);
            if (listener.toFixed === true) {
                index_1.cprint("Adding " + roomid + " to fixed", chalk.green);
                _this.emit('to_fixed', roomid);
            }
        })
            .on('add_to_db', function () { _this.emit('add_to_db', roomid); })
            .on('pk', function (g) { _this.emit('pk', g); })
            .on('gift', function (g) { _this.emit('gift', g); })
            .on('guard', function (g) { _this.emit('guard', g); })
            .on('storm', function (g) { _this.emit('storm', g); })
            .on('anchor', function (g) { _this.emit('anchor', g); }));
        _super.prototype.setupRoom.call(this, roomid);
    };
    return GuardController;
}(AbstractRoomController));
var FixedGuardController = /** @class */ (function (_super) {
    __extends(FixedGuardController, _super);
    function FixedGuardController() {
        var _this = _super.call(this) || this;
        _this._cls = index_5.FixedGuardMonitor;
        return _this;
    }
    return FixedGuardController;
}(GuardController));
exports.FixedGuardController = FixedGuardController;
var DynamicGuardController = /** @class */ (function (_super) {
    __extends(DynamicGuardController, _super);
    function DynamicGuardController() {
        var _this = _super.call(this) || this;
        _this._cls = index_5.DynamicGuardMonitor;
        return _this;
    }
    return DynamicGuardController;
}(GuardController));
exports.DynamicGuardController = DynamicGuardController;
var RaffleController = /** @class */ (function (_super) {
    __extends(RaffleController, _super);
    function RaffleController() {
        var _this = _super.call(this) || this;
        _this._roomidHandler = new index_5.RoomidHandler();
        _this._areas = [1, 2, 3, 4, 5, 6];
        _this._nameOfArea = {
            1: '娱乐',
            2: '网游',
            3: '手游',
            4: '绘画',
            5: '电台',
            6: '单机',
        };
        (_this._roomidHandler
            .on('guard', function (g) { _this.emit('guard', g); })
            .on('gift', function (g) { _this.emit('gift', g); })
            .on('pk', function (g) { _this.emit('pk', g); })
            .on('storm', function (g) { _this.emit('storm', g); }));
        return _this;
    }
    RaffleController.prototype.start = function () {
        var _this = this;
        this._areas.forEach(function (areaid) {
            _this.getRoomsInArea(areaid).then(function (rooms) { return _this.setupMonitorInArea(areaid, rooms); });
        });
    };
    RaffleController.prototype.stop = function () {
        _super.prototype.stop.call(this);
        this._roomidHandler.stop();
    };
    RaffleController.prototype.getRoomsInArea = function (areaid) {
        return (index_2.Bilibili.getRoomsInArea(areaid, 10, 10)
            .then(function (roomInfoList) {
            return roomInfoList.map(function (roomInfo) { return roomInfo['roomid']; });
        })
            .catch(function (error) {
            index_1.cprint("Bilibili.getRoomsInArea - " + error.message, chalk.red);
            return Promise.resolve([]);
        }));
    };
    RaffleController.prototype.setupMonitorInArea = function (areaid, rooms) {
        var _this = this;
        var task = function () { return __awaiter(_this, void 0, void 0, function () {
            var done, max, i, roomid, streaming, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        done = false;
                        max = rooms.length;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(!done && i < max)) return [3 /*break*/, 6];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        roomid = rooms[i];
                        return [4 /*yield*/, index_2.Bilibili.isLive(roomid)];
                    case 3:
                        streaming = _a.sent();
                        if (streaming && !this._connections.has(areaid)) {
                            done = true;
                            this.setupRoom(roomid, areaid);
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        index_1.cprint("Bilibili.isLive - " + error_1.message, chalk.red);
                        return [3 /*break*/, 5];
                    case 5:
                        ++i;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        task();
    };
    RaffleController.prototype.setupRoom = function (roomid, areaid) {
        var _this = this;
        if (this._recentlyClosed.includes(roomid)
            || typeof areaid === 'undefined') {
            return;
        }
        var roomInfo = {
            roomid: roomid,
            areaid: areaid,
        };
        var listener = new index_5.RaffleMonitor(tcpaddr, roomInfo);
        var msg = ("Setting up monitor @room "
            + ("" + roomid.toString().padEnd(13))
            + ("in " + this._nameOfArea[areaid] + "\u533A"));
        index_1.cprint(msg, chalk.green);
        this._taskQueue.add(function () { listener.start(); });
        this._connections.set(areaid, listener);
        (listener
            .on('close', function () {
            var reason = "@room " + roomid + " in " + _this._nameOfArea[areaid] + "\u533A is closed.";
            index_1.cprint(reason, chalk.yellowBright);
            _this._connections.delete(areaid);
            _this.getRoomsInArea(areaid).then(function (rooms) { return _this.setupMonitorInArea(areaid, rooms); });
        })
            .on('add_to_db', function () { _this.emit('add_to_db', roomid); })
            .on('pk', function (g) { _this.emit('pk', g); })
            .on('gift', function (g) { _this.emit('gift', g); })
            .on('guard', function (g) { _this.emit('guard', g); })
            .on('storm', function (g) { _this.emit('storm', g); })
            .on('roomid', function (roomid) { _this._roomidHandler.add(roomid); }));
        _super.prototype.setupRoom.call(this, roomid);
    };
    return RaffleController;
}(AbstractRoomController));
exports.RaffleController = RaffleController;
