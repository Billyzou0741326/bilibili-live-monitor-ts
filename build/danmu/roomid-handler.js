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
        _this._task = new index_3.DelayedTask()
            .withTime(5 * 1000)
            .withCallback(function () { _this.query(); });
        _this._task.start();
        return _this;
    }
    RoomidHandler.prototype.stop = function () {
        this._task.stop();
    };
    RoomidHandler.prototype.add = function (roomid) {
        this._roomids.add(roomid);
        this._task.start();
    };
    RoomidHandler.prototype.query = function () {
        var _this = this;
        var roomids = Array.from(this._roomids);
        this._roomids = new Set();
        roomids.forEach(function (roomid) {
            index_2.Bilibili.appGetLottery(roomid).then(function (resp) {
                if (resp['code'] === 0) {
                    _this.handleResult(roomid, resp);
                }
                else {
                    throw new Error("" + resp['message']);
                }
            }).catch(function (error) {
                index_1.cprint("RoomidHandler - " + error.message, chalk.red);
            });
        });
    };
    RoomidHandler.prototype.handleResult = function (roomid, msg) {
        var _this = this;
        var guards = msg['data']['guard'];
        var gifts = msg['data']['gift_list'];
        var pks = msg['data']['pk'];
        var nameOfType = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };
        guards = guards.map(function (g) {
            var id = g['id'];
            var t = g['keyword'];
            var guard_level = g['privilege_type'];
            var guard_name = nameOfType[guard_level];
            var expireAt = g['time'] + Math.floor(0.001 * new Date().valueOf());
            return new index_4.Guard()
                .withId(id)
                .withRoomid(roomid)
                .withType(t)
                .withName(guard_name)
                .withExpireAt(expireAt);
        });
        gifts = gifts.map(function (g) {
            var id = g['raffleId'];
            var t = g['type'];
            var name = g['title'] || '未知';
            var wait = g['time_wait'] > 0 ? g['time_wait'] : 0;
            var expireAt = g['time'] + Math.floor(0.001 * new Date().valueOf());
            return new index_4.Gift()
                .withId(id)
                .withRoomid(roomid)
                .withType(t)
                .withName(name)
                .withWait(wait)
                .withExpireAt(expireAt);
        });
        pks = pks.map(function (g) {
            var id = g['id'];
            var t = 'pk';
            var name = '大乱斗';
            var expireAt = g['time'] + Math.floor(0.001 * new Date().valueOf());
            return new index_4.PK()
                .withId(id)
                .withRoomid(roomid)
                .withType(t)
                .withName(name)
                .withExpireAt(expireAt);
        });
        guards.forEach(function (g) { _this.emit('guard', g); });
        pks.forEach(function (g) { _this.emit('pk', g); });
        gifts.forEach(function (g) {
            new index_3.DelayedTask()
                .withTime(g.wait * 1000)
                .withCallback(function () { _this.emit('gift', g); })
                .start();
        });
    };
    return RoomidHandler;
}(events_1.EventEmitter));
exports.RoomidHandler = RoomidHandler;
