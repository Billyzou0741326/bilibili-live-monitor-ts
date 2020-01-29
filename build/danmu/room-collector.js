"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
var index_1 = require("../db/index");
var index_2 = require("../bilibili/index");
var index_3 = require("../fmt/index");
var RoomCollector = /** @class */ (function () {
    function RoomCollector() {
        this._db = new index_1.Database();
    }
    RoomCollector.prototype.getFixedRooms = function () {
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
            return Array.from(new Set((_a = []).concat.apply(_a, results)));
        });
    };
    RoomCollector.prototype.getDynamicRooms = function () {
        var task = (index_2.Bilibili.getRoomsInArea(0)
            .then(function (resp) {
            return resp.map(function (entry) { return entry['roomid']; });
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
