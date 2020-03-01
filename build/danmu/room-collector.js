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
var index_1 = require("../db/index");
var index_2 = require("../bilibili/index");
var index_3 = require("../fmt/index");
var RoomCollector = /** @class */ (function () {
    function RoomCollector() {
        this._db = new index_1.Database();
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
            return new Set(_this.filterRooms((_a = []).concat.apply(_a, results)));
        });
    };
    RoomCollector.prototype.getDynamicRooms = function (numDynamicRooms) {
        var _this = this;
        if (numDynamicRooms === void 0) { numDynamicRooms = 0; }
        if (numDynamicRooms === 0) {
            numDynamicRooms = Infinity;
        }
        var task = (index_2.Bilibili.getRoomsInArea(0, 99, numDynamicRooms)
            .then(function (resp) {
            return _this.filterRooms(resp.map(function (entry) { return entry['roomid']; }));
        })
            .catch(function (error) {
            index_3.cprint("(Collector) - " + error.message, chalk.red);
            return Promise.resolve([]);
        }));
        return task;
    };
    RoomCollector.prototype.getRaffleRoomsInArea = function (areaid, numRooms) {
        var _this = this;
        var pageSize = (numRooms < 1 || numRooms > 99) ? 99 : numRooms;
        return (index_2.Bilibili.getRoomsInArea(areaid, pageSize, numRooms)
            .then(function (roomInfoList) {
            return _this.filterRooms(roomInfoList.map(function (roomInfo) { return roomInfo.roomid; }));
        })
            .catch(function (error) {
            index_3.cprint("Bilibili.getRoomsInArea - " + error.message, chalk.red);
            return Promise.resolve([]);
        }));
    };
    RoomCollector.prototype.filterRooms = function (rooms) {
        return rooms;
    };
    return RoomCollector;
}());
exports.RoomCollector = RoomCollector;
var SimpleLoadBalancingRoomDistributor = /** @class */ (function (_super) {
    __extends(SimpleLoadBalancingRoomDistributor, _super);
    function SimpleLoadBalancingRoomDistributor(loadBalancing) {
        var _this = _super.call(this) || this;
        _this._loadBalancing = loadBalancing || {
            totalServers: 1,
            serverIndex: 0,
        };
        return _this;
    }
    SimpleLoadBalancingRoomDistributor.prototype.filterRooms = function (rooms) {
        var _this = this;
        return rooms.filter(function (roomid) { return roomid % _this._loadBalancing.totalServers === _this._loadBalancing.serverIndex; });
    };
    return SimpleLoadBalancingRoomDistributor;
}(RoomCollector));
exports.SimpleLoadBalancingRoomDistributor = SimpleLoadBalancingRoomDistributor;
