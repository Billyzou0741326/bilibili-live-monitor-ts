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
exports.RaffleController = exports.DynamicGuardController = exports.FixedGuardController = exports.AbstractRoomController = void 0;
var chalk = require("chalk");
var events_1 = require("events");
var index_1 = require("../fmt/index");
var index_2 = require("../bilibili/index");
var index_3 = require("../global/index");
var index_4 = require("../task/index");
var index_5 = require("./index");
var tcp_addr = new index_3.AppConfig().danmuAddr;
var AbstractRoomController = /** @class */ (function (_super) {
    __extends(AbstractRoomController, _super);
    function AbstractRoomController() {
        var _this = _super.call(this) || this;
        _this._connections = new Map();
        _this._taskQueue = new index_4.RateLimiter(50, 1000);
        _this._token = '';
        return _this;
    }
    Object.defineProperty(AbstractRoomController.prototype, "connections", {
        get: function () {
            return this._connections;
        },
        enumerable: false,
        configurable: true
    });
    AbstractRoomController.prototype.setToken = function (token) {
        this._token = token;
        return this;
    };
    AbstractRoomController.prototype.start = function () {
    };
    AbstractRoomController.prototype.stop = function () {
        this._connections.forEach(function (listener) { return listener.destroy(); });
    };
    return AbstractRoomController;
}(events_1.EventEmitter));
exports.AbstractRoomController = AbstractRoomController;
var GuardController = /** @class */ (function (_super) {
    __extends(GuardController, _super);
    function GuardController() {
        return _super.call(this) || this;
    }
    GuardController.prototype.add = function (rooms) {
        var _this = this;
        var roomids = [].concat(rooms);
        var filtered = roomids.filter(function (roomid) { return !_this.roomExists(roomid); });
        var tasks = filtered.map(function (roomid) {
            return _this.setupRoom(roomid);
        });
        return tasks;
    };
    GuardController.prototype.roomExists = function (roomid) {
        return this._connections.has(roomid);
    };
    GuardController.prototype.onClose = function (roomid, listener) {
        listener.destroy();
        this._connections.delete(roomid);
    };
    GuardController.prototype.setupRoom = function (roomid) {
        var _this = this;
        if (this.roomExists(roomid)) {
            return Promise.resolve();
        }
        var roomInfo = {
            roomid: roomid,
        };
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, listener_1, _loop_1, category, error_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        if (!(this._token === '')) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, index_2.Bilibili.getLiveDanmuToken()];
                    case 1:
                        _a._token = _b.sent();
                        _b.label = 2;
                    case 2:
                        listener_1 = this.createListener(tcp_addr, roomInfo, this._token);
                        this._connections.set(roomid, listener_1);
                        this._taskQueue.add(function () { listener_1.start(); });
                        listener_1.
                            on('close', function () { _this.onClose(roomid, listener_1); }).
                            on('add_to_db', function () { _this.emit('add_to_db', roomid); }).
                            on('error', function () { _this._taskQueue.add(function () { listener_1.start(); }); });
                        _loop_1 = function (category) {
                            listener_1.on(category, function (g) { _this.emit(category, g); });
                        };
                        for (category in index_5.RaffleCategory) {
                            _loop_1(category);
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _b.sent();
                        index_1.cprint("(Listener) - " + error_1.message, chalk.red);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        }); })();
    };
    return GuardController;
}(AbstractRoomController));
var FixedGuardController = /** @class */ (function (_super) {
    __extends(FixedGuardController, _super);
    function FixedGuardController() {
        return _super.call(this) || this;
    }
    FixedGuardController.prototype.createListener = function (addr, info, token) {
        if (token === void 0) { token = ''; }
        return new index_5.FixedGuardMonitor(addr, info, token);
    };
    return FixedGuardController;
}(GuardController));
exports.FixedGuardController = FixedGuardController;
var DynamicGuardController = /** @class */ (function (_super) {
    __extends(DynamicGuardController, _super);
    function DynamicGuardController() {
        return _super.call(this) || this;
    }
    DynamicGuardController.prototype.createListener = function (addr, info, token) {
        if (token === void 0) { token = ''; }
        return new index_5.DynamicGuardMonitor(addr, info, token);
    };
    DynamicGuardController.prototype.onClose = function (roomid, listener) {
        _super.prototype.onClose.call(this, roomid, listener);
        this.checkAddToFixed(roomid, listener);
    };
    DynamicGuardController.prototype.checkAddToFixed = function (roomid, listener) {
        if (listener.toFixed) {
            this.emit('to_fixed', roomid);
        }
    };
    return DynamicGuardController;
}(GuardController));
exports.DynamicGuardController = DynamicGuardController;
var RaffleController = /** @class */ (function (_super) {
    __extends(RaffleController, _super);
    function RaffleController(roomCollector) {
        var _this = _super.call(this) || this;
        _this._roomidHandler = new index_5.RoomidHandler();
        _this._roomCollector = roomCollector || new index_5.RoomCollector();
        _this._areas = [1, 2, 3, 4, 5, 6];
        _this._nameOfArea = {
            1: '娱乐',
            2: '网游',
            3: '手游',
            4: '绘画',
            5: '电台',
            6: '单机',
        };
        var _loop_2 = function (category) {
            this_1._roomidHandler.on(category, function (g) { _this.emit(category, g); });
        };
        var this_1 = this;
        for (var category in index_5.RaffleCategory) {
            _loop_2(category);
        }
        return _this;
    }
    RaffleController.prototype.start = function () {
        _super.prototype.start.call(this);
        for (var _i = 0, _a = this._areas; _i < _a.length; _i++) {
            var areaid = _a[_i];
            this.setupArea(areaid);
        }
    };
    RaffleController.prototype.stop = function () {
        _super.prototype.stop.call(this);
        this._roomidHandler.stop();
    };
    RaffleController.prototype.setupArea = function (areaid, numRoomsQueried) {
        var _this = this;
        if (numRoomsQueried === void 0) { numRoomsQueried = 10; }
        this._roomCollector.getRaffleRoomsInArea(areaid, numRoomsQueried).then(function (rooms) { return _this.setupMonitorInArea(areaid, rooms, numRoomsQueried); });
    };
    RaffleController.prototype.setupMonitorInArea = function (areaid, rooms, numRoomsQueried) {
        var _this = this;
        if (numRoomsQueried === void 0) { numRoomsQueried = 10; }
        var task = function () { return __awaiter(_this, void 0, void 0, function () {
            var done, max, i, roomid, _a, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this._connections.has(areaid)) return [3 /*break*/, 10];
                        done = false;
                        max = rooms.length;
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(!done && i < max)) return [3 /*break*/, 9];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 7, , 8]);
                        roomid = rooms[i];
                        return [4 /*yield*/, index_2.Bilibili.isLive(roomid)];
                    case 3:
                        if (!_b.sent()) return [3 /*break*/, 6];
                        if (!(this._token === '')) return [3 /*break*/, 5];
                        _a = this;
                        return [4 /*yield*/, index_2.Bilibili.getLiveDanmuToken()];
                    case 4:
                        _a._token = _b.sent();
                        _b.label = 5;
                    case 5:
                        done = true;
                        this.setupRoomInArea(roomid, areaid, this._token);
                        _b.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_2 = _b.sent();
                        index_1.cprint("Bilibili.isLive - " + error_2.message, chalk.red);
                        return [3 /*break*/, 8];
                    case 8:
                        ++i;
                        return [3 /*break*/, 1];
                    case 9:
                        if (!done) {
                            if (numRoomsQueried < 1000) {
                                this.setupArea(areaid, numRoomsQueried + 10);
                            }
                            else {
                                index_1.cprint("RaffleController - Can't find a room to set up monitor in " + this._nameOfArea[areaid] + "\u533A", chalk.red);
                            }
                        }
                        _b.label = 10;
                    case 10: return [2 /*return*/];
                }
            });
        }); };
        task();
    };
    RaffleController.prototype.setupRoomInArea = function (roomid, areaid, token) {
        var _this = this;
        if (token === void 0) { token = ''; }
        if (this._connections.has(areaid)) {
            return;
        }
        var listener = new index_5.RaffleMonitor(tcp_addr, { roomid: roomid, areaid: areaid }, token);
        index_1.cprint("Setting up monitor @room " + roomid.toString().padEnd(13) + " in " + this._nameOfArea[areaid] + "\u533A", chalk.green);
        this._taskQueue.add(function () { listener.start(); });
        this._connections.set(areaid, listener);
        listener.
            on('close', function () {
            listener.destroy();
            _this._connections.delete(areaid);
            var reason = "@room " + roomid + " in " + _this._nameOfArea[areaid] + "\u533A is closed.";
            index_1.cprint(reason, chalk.yellowBright);
            _this.setupArea(areaid);
        }).
            on('error', function () { listener.start(); }).
            on('add_to_db', function () { _this.emit('add_to_db', roomid); }).
            on('roomid', function (roomid) {
            _this._roomidHandler.add(roomid);
            _this.emit('to_dynamic', roomid);
        });
        var _loop_3 = function (category) {
            listener.on(category, function (g) { _this.emit(category, g); });
        };
        for (var category in index_5.RaffleCategory) {
            _loop_3(category);
        }
    };
    return RaffleController;
}(AbstractRoomController));
exports.RaffleController = RaffleController;
