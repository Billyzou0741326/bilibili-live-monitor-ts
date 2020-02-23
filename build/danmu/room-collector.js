"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
var index_1 = require("../db/index");
var index_2 = require("../bilibili/index");
var index_3 = require("../fmt/index");
var index_4 = require("../global/index");
var RoomCollector = /** @class */ (function () {
    function RoomCollector() {
        this._db = new index_1.Database();
        this._loadBalancing = new index_4.AppConfig().loadBalancing;
    }
    RoomCollector.prototype.getFixedRooms = function () {
        var _this = this;
        var dbTask = this._db.getRooms();
        var sailsTask = (index_2.Bilibili.getAllSailboatRooms()
            .catch(function (error) {
            index_3.cprint("(Collector) - " + error.message, chalk.red);
            return Promise.resolve([]);
        }));
        var genkiTask = (index_2.Bilibili.getAllGenkiRooms()
            .catch(function (error) {
            index_3.cprint("(Collector) - " + error.message, chalk.red);
            return Promise.resolve([]);
        }));
        var tasks = [dbTask, sailsTask, genkiTask];
        return Promise.all(tasks).then(function (results) {
            var _a;
            var roomIDs = (_a = []).concat.apply(_a, results);
            if (_this._loadBalancing.totalServers > 1) {
                roomIDs = roomIDs.filter(function (roomid) { return roomid % _this._loadBalancing.totalServers === _this._loadBalancing.serverIndex; });
            }
            return new Set(roomIDs);
        });
    };
    RoomCollector.prototype.getDynamicRooms = function () {
        var _this = this;
        var task = (index_2.Bilibili.getRoomsInArea(0)
            .then(function (resp) {
            var roomIDs = resp.map(function (entry) { return entry['roomid']; });
            if (_this._loadBalancing.totalServers > 1) {
                roomIDs = roomIDs.filter(function (roomid) { return roomid % _this._loadBalancing.totalServers === _this._loadBalancing.serverIndex; });
            }
            return roomIDs;
        })
            .catch(function (error) {
            index_3.cprint("(Collector) - " + error.message, chalk.red);
            return Promise.resolve([]);
        }));
        return task;
    };
    return RoomCollector;
}());
exports.RoomCollector = RoomCollector;
