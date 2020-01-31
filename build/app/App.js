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
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
var table_1 = require("table");
var events_1 = require("events");
var index_1 = require("../fmt/index");
var index_2 = require("../db/index");
var index_3 = require("../global/index");
var index_4 = require("../task/index");
var index_5 = require("../server/index");
var index_6 = require("../danmu/index");
var App = /** @class */ (function () {
    function App() {
        var _this = this;
        this._appConfig = new index_3.AppConfig();
        this._appConfig.init();
        this._db = new index_2.Database();
        this._history = new index_6.History();
        this._emitter = new events_1.EventEmitter();
        this._wsServer = new index_5.WsServer(this._appConfig.wsAddr);
        this._biliveServer = new index_5.WsServerBilive(this._appConfig.biliveAddr);
        this._httpServer = new index_5.HttpServer(this._appConfig.httpAddr);
        this._roomCollector = new index_6.RoomCollector();
        this._fixedController = new index_6.FixedGuardController();
        this._raffleController = new index_6.RaffleController();
        this._dynamicController = new index_6.DynamicGuardController();
        this._dynamicRefreshTask = new index_4.DelayedTask();
        this._running = false;
        this._dynamicRefreshTask.withTime(120 * 1000).withCallback(function () {
            var dynamicTask = _this._roomCollector.getDynamicRooms();
            (function () { return __awaiter(_this, void 0, void 0, function () {
                var roomids, establishedFix_1, establishedDyn, newIds, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, dynamicTask];
                        case 1:
                            roomids = _a.sent();
                            establishedFix_1 = this._fixedController.connected;
                            establishedDyn = this._dynamicController.connected;
                            newIds = roomids.filter(function (roomid) { return establishedFix_1.includes(roomid) === false; });
                            index_1.cprint("Monitoring (\u9759\u6001) " + establishedFix_1.length + " + (\u52A8\u6001) " + establishedDyn.length, chalk.green);
                            this._dynamicController.add(newIds);
                            this._dynamicRefreshTask.start();
                            return [3 /*break*/, 3];
                        case 2:
                            error_1 = _a.sent();
                            index_1.cprint("(Dynamic) - " + error_1.message, chalk.red);
                            this._dynamicRefreshTask.start();
                            return [3 /*break*/, 3];
                        case 3: return [2 /*return*/];
                    }
                });
            }); })();
        });
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
        var controllers = [
            this._dynamicController,
            this._fixedController,
            this._raffleController,
        ];
        controllers.forEach(function (controller) {
            (controller
                .on('guard', handler('guard'))
                .on('gift', handler('gift'))
                .on('pk', handler('pk'))
                .on('storm', handler('storm'))
                .on('anchor', handler('anchor'))
                .on('add_to_db', function (roomid) { _this._db.add(roomid); })
                .on('to_fixed', function (roomid) { _this._fixedController.add(roomid); }));
        });
        (this._emitter
            .on('guard', function (g) {
            _this.printGift(g);
            _this._wsServer.broadcast(_this._wsServer.parseMessage(g));
            _this._biliveServer.broadcast(_this._biliveServer.parseMessage(g));
        })
            .on('gift', function (g) {
            _this.printGift(g);
            var gift = Object.assign(new Object(), g);
            delete gift['wait'];
            _this._wsServer.broadcast(_this._wsServer.parseMessage(gift));
            _this._biliveServer.broadcast(_this._biliveServer.parseMessage(gift));
        })
            .on('pk', function (g) {
            _this.printGift(g);
            _this._wsServer.broadcast(_this._wsServer.parseMessage(g));
            _this._biliveServer.broadcast(_this._biliveServer.parseMessage(g));
        })
            .on('storm', function (g) {
            _this.printGift(g);
            _this._wsServer.broadcast(_this._wsServer.parseMessage(g));
            _this._biliveServer.broadcast(_this._biliveServer.parseMessage(g));
        })
            .on('anchor', function (g) {
            _this.printGift(g);
            // this._wsServer.broadcast(this._wsServer.parseMessage(g));
        }));
    };
    App.prototype.setupServer = function () {
        this._httpServer.mountGetter('gift', this._history.retrieveGetter('gift'));
        this._httpServer.mountGetter('guard', this._history.retrieveGetter('guard'));
        this._httpServer.mountGetter('anchor', this._history.retrieveGetter('anchor'));
    };
    App.prototype.start = function () {
        var _this = this;
        if (this._running === false) {
            this._running = true;
            this.setupListeners();
            this.setupServer();
            this._wsServer.start();
            this._biliveServer.start();
            this._httpServer.start();
            this._raffleController.start();
            var fixedTask_1 = this._roomCollector.getFixedRooms();
            var dynamicTask_1 = this._roomCollector.getDynamicRooms();
            (function () { return __awaiter(_this, void 0, void 0, function () {
                var fixedRooms, dynamicRooms, filtered;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fixedTask_1];
                        case 1:
                            fixedRooms = _a.sent();
                            return [4 /*yield*/, dynamicTask_1];
                        case 2:
                            dynamicRooms = _a.sent();
                            filtered = dynamicRooms.filter(function (roomid) { return fixedRooms.includes(roomid) === false; });
                            this._fixedController.add(fixedRooms);
                            this._dynamicController.add(filtered);
                            this._dynamicRefreshTask.start();
                            return [2 /*return*/];
                    }
                });
            }); })();
        }
    };
    App.prototype.stop = function () {
        if (this._running === true) {
            this._wsServer.stop();
            this._httpServer.stop();
            this._biliveServer.stop();
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
    App.prototype.printGift = function (g) {
        var msg = '';
        var id = "" + g.id;
        var roomid = "" + g.roomid;
        var t = "" + g.type;
        var category = "" + g.category;
        var name = "" + g.name;
        switch (category) {
            case 'gift':
                msg = id.padEnd(13) + "@" + roomid.padEnd(13) + t.padEnd(13) + name;
                break;
            case 'guard':
                msg = id.padEnd(13) + "@" + roomid.padEnd(13) + t.padEnd(13) + name;
                break;
            case 'storm':
                var sid = "" + id.slice(0, 7);
                msg = sid.padEnd(13) + "@" + roomid.padEnd(13) + t.padEnd(13) + name.padEnd(13) + id;
                break;
            case 'pk':
                msg = id.padEnd(13) + "@" + roomid.padEnd(13) + t.padEnd(13) + name;
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
            case '':
                return;
            default:
                return;
        }
        index_1.cprint(msg, chalk.cyan);
    };
    return App;
}());
exports.App = App;
