"use strict";
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
var chalk = require("chalk");
var settings = require("../settings.json");
var table_1 = require("table");
var events_1 = require("events");
var index_1 = require("../async/index");
var index_2 = require("../fmt/index");
var index_3 = require("../db/index");
var index_4 = require("../bilibili/index");
var index_5 = require("../global/index");
var index_6 = require("../task/index");
var index_7 = require("../server/index");
var index_8 = require("../danmu/index");
var App = /** @class */ (function () {
    function App() {
        this._appConfig = new index_5.AppConfig();
        this._appConfig.init();
        this._db = new index_3.Database({ expiry: this._appConfig.roomCollectorStrategy.fixedRoomExpiry });
        this._history = new index_8.History();
        this._emitter = new events_1.EventEmitter();
        this._wsServer = new index_7.WsServer(this._appConfig.wsAddr);
        this._biliveServer = new index_7.WsServerBilive(this._appConfig.biliveAddr);
        this._bilihelperServer = new index_7.TCPServerBiliHelper(this._appConfig.bilihelperAddr);
        this._httpServer = new index_7.HttpServer(this._appConfig.httpAddr);
        this._roomCollector = (this._appConfig.loadBalancing.totalServers > 1
            ? new index_8.SimpleLoadBalancingRoomDistributor({ loadBalancing: this._appConfig.loadBalancing })
            : new index_8.RoomCollector({ db: this._db }));
        this._roomidHandler = new index_8.RoomidHandler();
        this._roomCrawler = new index_8.RoomCrawler(this._roomCollector);
        this._fixedController = new index_8.FixedGuardController();
        this._raffleController = new index_8.RaffleController(this._roomCollector);
        this._dynamicController = new index_8.DynamicGuardController();
        this._dynamicRefreshTask = new index_6.DelayedTask();
        this._running = false;
        var dynRefreshInterval = this._appConfig.roomCollectorStrategy.dynamicRoomsQueryInterval * 1000;
        this._dynamicRefreshTask.withTime(dynRefreshInterval).withCallback(function () { });
    }
    App.prototype.setupListeners = function () {
        var _this = this;
        if (!this._running)
            return;
        var handler = function (t) {
            return function (g) {
                if (_this._history.has(g) === false) {
                    _this._emitter.emit(t, g);
                    _this._history.add(g);
                }
            };
        };
        this._roomCrawler.on('done', function () {
            if (_this._running) {
                _this._roomCrawler.query();
            }
        });
        var emitters = [
            this._dynamicController,
            this._fixedController,
            this._raffleController,
            this._roomidHandler,
            this._roomCrawler,
        ];
        for (var _i = 0, emitters_1 = emitters; _i < emitters_1.length; _i++) {
            var emt = emitters_1[_i];
            emt.
                on('add_to_db', function (roomid) { _this._db.add(roomid); }).
                on('to_fixed', function (roomid) {
                index_2.cprint("Adding " + roomid + " to fixed", chalk.green);
                _this._fixedController.add(roomid);
            }).
                on('roomid', function (roomid) {
                _this._roomidHandler.add(roomid);
            });
            /**
            on('to_dynamic', (roomid: number): void => {
                if (!this._fixedController.connections.has(roomid) && !this._dynamicController.connections.has(roomid)) {
                    cprint(`Adding ${roomid} to dynamic`, chalk.green);
                    this._dynamicController.add(roomid);
                }
            });
            // */
            for (var category in index_8.RaffleCategory) {
                emt.on(category, handler(category));
            }
        }
        var processGift = function (g) {
            _this.printGift(g);
            _this._wsServer.broadcast(g);
            _this._biliveServer.broadcast(g);
            _this._bilihelperServer.broadcast(g);
        };
        for (var category in index_8.RaffleCategory) {
            if (category === index_8.RaffleCategory.gift) {
                this._emitter.on(category, function (g) {
                    if (g.wait <= 0) {
                        processGift(g);
                        return;
                    }
                    else {
                        var t = new index_6.DelayedTask();
                        t.withTime(g.wait * 1000);
                        t.withCallback(function () {
                            processGift(g);
                        });
                        t.start();
                    }
                });
            }
            else {
                this._emitter.on(category, function (g) {
                    processGift(g);
                });
            }
        }
    };
    App.prototype.setupHttp = function () {
        for (var category in index_8.RaffleCategory) {
            this._httpServer.mountGetter(category, this._history.retrieveGetter(category));
        }
    };
    App.prototype.start = function () {
        var _this = this;
        if (this._running === false) {
            this._running = true;
            this.setupListeners();
            this.setupHttp();
            this.startServers();
            this._db.start();
            this._raffleController.start();
            if (settings['clients']['bilibili-http']['enable'] === true) {
                this._roomCrawler.query();
            }
            if (settings['clients']['bilibili-tcp']['enable'] === true) {
                this._fixedController.start();
                this._dynamicController.start();
                var fixedTask_1 = this._roomCollector.getFixedRooms();
                var dynamicStrm_1 = index_4.Bilibili.getRoomV2Stream();
                (function () { return __awaiter(_this, void 0, void 0, function () {
                    var token, fixedRooms, tasks, _loop_1, this_1;
                    var _this = this;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, index_4.Bilibili.getLiveDanmuToken()];
                            case 1:
                                token = _a.sent();
                                this._fixedController.setToken(token);
                                this._dynamicController.setToken(token);
                                return [4 /*yield*/, fixedTask_1];
                            case 2:
                                fixedRooms = _a.sent();
                                this._fixedController.add(Array.from(fixedRooms));
                                tasks = [];
                                tasks.push((new Promise(function (resolve, reject) {
                                    dynamicStrm_1.
                                        on('roomids', function (r) {
                                        tasks.push.apply(tasks, _this._dynamicController.add(r.filter(function (roomid) {
                                            return !fixedRooms.has(roomid);
                                        })));
                                    }).
                                        on('error', function (error) { }).
                                        on('done', function () { resolve(); });
                                })));
                                return [4 /*yield*/, Promise.all(__spreadArrays(tasks, [index_1.sleep(10 * 1000)]))];
                            case 3:
                                _a.sent();
                                _loop_1 = function () {
                                    var establishedFix_1, establishedDyn, tasks_1, dynamicStrm_2, wait, error_1;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                _a.trys.push([0, 2, , 3]);
                                                establishedFix_1 = this_1._fixedController.connections;
                                                establishedDyn = this_1._dynamicController.connections;
                                                index_2.cprint("Monitoring (\u9759\u6001) " + establishedFix_1.size + " + (\u52A8\u6001) " + establishedDyn.size, chalk.green);
                                                tasks_1 = [];
                                                dynamicStrm_2 = index_4.Bilibili.getRoomV2Stream();
                                                tasks_1.push((new Promise(function (resolve, reject) {
                                                    dynamicStrm_2.
                                                        on('roomids', function (r) {
                                                        tasks_1.push.apply(tasks_1, _this._dynamicController.add(r.filter(function (roomid) {
                                                            return !establishedFix_1.has(roomid);
                                                        })));
                                                    }).
                                                        on('error', function (error) { }).
                                                        on('done', function () { resolve(); });
                                                })));
                                                wait = this_1._appConfig.roomCollectorStrategy.dynamicRoomsQueryInterval * 1000;
                                                return [4 /*yield*/, Promise.all(__spreadArrays(tasks_1, [index_1.sleep(wait)]))];
                                            case 1:
                                                _a.sent();
                                                this_1._dynamicRefreshTask.start();
                                                return [3 /*break*/, 3];
                                            case 2:
                                                error_1 = _a.sent();
                                                index_2.cprint("(Dynamic) - " + error_1.message, chalk.red);
                                                this_1._dynamicRefreshTask.start();
                                                return [3 /*break*/, 3];
                                            case 3: return [2 /*return*/];
                                        }
                                    });
                                };
                                this_1 = this;
                                _a.label = 4;
                            case 4:
                                if (!this._running) return [3 /*break*/, 6];
                                return [5 /*yield**/, _loop_1()];
                            case 5:
                                _a.sent();
                                return [3 /*break*/, 4];
                            case 6: return [2 /*return*/];
                        }
                    });
                }); })();
            }
        }
    };
    App.prototype.stop = function () {
        if (this._running === true) {
            this._wsServer.stop();
            this._httpServer.stop();
            this._biliveServer.stop();
            this._bilihelperServer.stop();
            this._db.stop();
            this._history.stop();
            this._fixedController.removeAllListeners();
            this._dynamicController.removeAllListeners();
            this._raffleController.removeAllListeners();
            this._fixedController.stop();
            this._dynamicController.stop();
            this._raffleController.stop();
            this._emitter.removeAllListeners();
            this._wsServer.stop();
            this._dynamicRefreshTask.stop();
            this._running = false;
        }
    };
    App.prototype.startServers = function () {
        if (this._appConfig.wsAddr.enable === true) {
            this._wsServer.start();
        }
        if (this._appConfig.biliveAddr.enable === true) {
            this._biliveServer.start();
        }
        if (this._appConfig.bilihelperAddr.enable === true) {
            this._bilihelperServer.start();
        }
        if (this._appConfig.httpAddr.enable === true) {
            this._httpServer.start();
        }
    };
    App.prototype.printGift = function (g) {
        var msg = '';
        var id = "" + g.id;
        var roomid = "" + g.roomid;
        var t = "" + g.type;
        var category = "" + g.category;
        var name = "" + g.name;
        switch (category) {
            case 'gift':
            case 'guard':
            case 'pk':
                msg = id.padEnd(13) + "@" + roomid.padEnd(13) + t.padEnd(13) + name;
                break;
            case 'storm':
                var sid = "" + id.slice(0, 7);
                msg = sid.padEnd(13) + "@" + roomid.padEnd(13) + t.padEnd(13) + name.padEnd(13) + id;
                break;
            case 'anchor':
                var anchor = g;
                var award_num = "" + anchor.award_num;
                var gift_num = "" + anchor.gift_num;
                var gift_name = "" + anchor.gift_name;
                var gift_price = "" + anchor.gift_price;
                var requirement = "" + anchor.requirement;
                var danmu = "" + anchor.danmu;
                var dataTable = [
                    ['奖品名称', name],
                    ['奖品数量', award_num],
                    ['弹幕', danmu],
                    ['限制条件', requirement],
                    ['投喂', gift_num + "\u4E2A" + gift_name + "(" + gift_price + "\u91D1\u74DC\u5B50)"],
                ];
                msg = (id.padEnd(13) + "@" + roomid.padEnd(13) + t.padEnd(13)
                    + ("\n" + table_1.table(dataTable)));
                break;
            default:
                return;
        }
        index_2.cprint(msg, chalk.cyan);
    };
    return App;
}());
exports.App = App;
