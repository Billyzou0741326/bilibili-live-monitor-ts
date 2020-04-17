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
var index_1 = require("../fmt/index");
var events_1 = require("events");
var index_2 = require("../bilibili/index");
var index_3 = require("../task/index");
var index_4 = require("../danmu/index");
var RoomidHandler = /** @class */ (function (_super) {
    __extends(RoomidHandler, _super);
    function RoomidHandler() {
        var _this = _super.call(this) || this;
        _this._roomids = new Set();
        var pending = false;
        _this._task = new index_3.DelayedTask();
        _this._task.withTime(5 * 1000); // ensures at least a 5 seconds interval between queries
        _this._task.withCallback(function () {
            if (pending === true) {
                return; // only one should be waiting
            }
            pending = true;
            (function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(this._queryTasks.length > 0)) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.wait()];
                        case 1:
                            _a.sent(); // wait for queries to finish
                            this._queryTasks = []; // all queries finished, reset
                            _a.label = 2;
                        case 2:
                            pending = false;
                            if (this._roomids.size === 0) {
                                return [2 /*return*/]; // nothing to do
                            }
                            this.query();
                            this._task.start();
                            return [2 /*return*/];
                    }
                });
            }); })();
        });
        _this._queryTasks = [];
        return _this;
    }
    RoomidHandler.prototype.stop = function () {
        this._task.stop();
    };
    RoomidHandler.prototype.wait = function () {
        var waiter = Promise.all(this._queryTasks);
        return waiter;
    };
    /**
     *  Before calling `add`, recommend to `wait` for the current queries to complete
     *
     */
    RoomidHandler.prototype.add = function (roomid) {
        this._roomids.add(roomid);
        if (!this._task.running) {
            this._task.start();
            if (this._queryTasks.length === 0) {
                this.query(); // if no tasks are running, start so that caller has something to wait
            }
        }
        return true;
    };
    /**
     *  Before calling `query`, MUST call `wait` until the current queries complete
     *
     */
    RoomidHandler.prototype.query = function () {
        var _this = this;
        var roomids = Array.from(this._roomids);
        this._roomids = new Set();
        roomids.forEach(function (roomid) {
            var t = index_2.Bilibili.appGetLottery(roomid).then(function (resp) {
                if (resp['code'] !== 0) {
                    throw new Error("" + resp['message']);
                }
                _this.handleResult(roomid, resp);
            }).catch(function (error) {
                index_1.cprint("RoomidHandler - " + error.message, chalk.red);
            });
            _this._queryTasks.push(t);
        });
    };
    RoomidHandler.prototype.handleResult = function (roomid, msg) {
        var guards = msg['data']['guard'] || [];
        var gifts = msg['data']['gift_list'] || [];
        var pks = msg['data']['pk'] || [];
        var storm = msg['data']['storm'];
        var anchor = msg['data']['anchor'];
        var nameOfType = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };
        guards = guards.map(function (g) {
            g = index_4.Guard.parse(g);
            g && g.withRoomid(roomid);
            return g;
        });
        for (var _i = 0, guards_1 = guards; _i < guards_1.length; _i++) {
            var g = guards_1[_i];
            if (g !== null)
                this.emit('guard', g);
        }
        pks = pks.map(function (g) {
            g = index_4.PK.parse(g);
            return g;
        });
        for (var _a = 0, pks_1 = pks; _a < pks_1.length; _a++) {
            var g = pks_1[_a];
            if (g !== null)
                this.emit('pk', g);
        }
        gifts = gifts.map(function (g) {
            g = index_4.Gift.parse(g);
            g && g.withRoomid(roomid);
            return g;
        });
        for (var _b = 0, gifts_1 = gifts; _b < gifts_1.length; _b++) {
            var g = gifts_1[_b];
            if (g !== null) {
                this.emit('gift', g);
            }
        }
        if (anchor !== null) {
            var g = index_4.Anchor.parse(anchor);
            if (g !== null) {
                this.emit('anchor', g);
            }
        }
        if (storm !== null) {
            var g = index_4.Storm.parse(storm);
            if (g !== null) {
                g.withRoomid(roomid);
                this.emit('storm', g);
            }
        }
    };
    //! Waiting at this level is insufficient. Duplicates are also waited
    RoomidHandler.prototype.waitEmit = function (g) {
        var _this = this;
        var gifts = Array.isArray(g) ? g : [g];
        var _loop_1 = function (gift) {
            if (g !== null) {
                var t = new index_3.DelayedTask().withTime(gift.wait * 1000).withCallback(function () { _this.emit('gift', gift); });
                t.start();
            }
        };
        for (var _i = 0, gifts_2 = gifts; _i < gifts_2.length; _i++) {
            var gift = gifts_2[_i];
            _loop_1(gift);
        }
    };
    return RoomidHandler;
}(events_1.EventEmitter));
exports.RoomidHandler = RoomidHandler;
