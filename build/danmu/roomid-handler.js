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
exports.RoomidHandler = void 0;
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
        _this._task = new index_3.DelayedTask();
        _this._task.withTime(5 * 1000); // ensures at least a 5 seconds interval between queries
        _this._task.withCallback(function () {
            if (_this._roomids.size === 0) {
                return; // nothing to do
            }
            _this.query();
            _this._task.start();
        });
        _this._onDoneCallbacks = [];
        _this._rateLimiter = null;
        return _this;
    }
    RoomidHandler.prototype.withRateLimiter = function (limiter) {
        this._rateLimiter = limiter;
        return this;
    };
    RoomidHandler.prototype.stop = function () {
        this._task.stop();
    };
    /**
     *  Before calling `add`, recommend to `wait` for the current queries to complete
     *
     */
    RoomidHandler.prototype.add = function (roomids, onDone) {
        roomids = Array.isArray(roomids) ? roomids : [roomids];
        for (var _i = 0, roomids_1 = roomids; _i < roomids_1.length; _i++) {
            var roomid = roomids_1[_i];
            this._roomids.add(roomid);
        }
        if (!this._task.running) {
            this._task.start();
        }
        if (onDone) {
            this._onDoneCallbacks.push(onDone);
        }
    };
    /**
     *  Before calling `query`, MUST call `wait` until the current queries complete
     *
     */
    RoomidHandler.prototype.query = function () {
        var _this = this;
        var roomids = this._roomids;
        this._roomids = new Set();
        var callbacks = this._onDoneCallbacks;
        this._onDoneCallbacks = [];
        var promises = [];
        roomids.forEach(function (roomid) {
            var queryRoom = function () {
                return index_2.Bilibili.appGetLottery(roomid)
                    .then(function (resp) {
                    if (resp['code'] !== 0) {
                        throw new Error("" + resp['message']);
                    }
                    _this.handleResult(roomid, resp);
                }).catch(function (error) {
                    index_1.cprint("RoomidHandler - " + error.message, chalk.red);
                });
            };
            var t = new Promise(function (resolve) {
                if (_this._rateLimiter !== null) {
                    var task = function () { resolve(queryRoom()); };
                    _this._rateLimiter.add(task);
                }
                else {
                    resolve(queryRoom());
                }
            });
            promises.push(t);
        });
        Promise.all(promises).then(function (_a) {
            for (var _i = 0, callbacks_1 = callbacks; _i < callbacks_1.length; _i++) {
                var cb = callbacks_1[_i];
                cb();
            }
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
