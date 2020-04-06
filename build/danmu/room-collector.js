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
        var sailsTask = (function () { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_2.Bilibili.getAllSailboatRooms()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_1 = _a.sent();
                        index_3.cprint("(Collector) [SailboatRank] - " + error_1.message, chalk.red);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, []];
                }
            });
        }); })();
        var genkiTask = (function () { return __awaiter(_this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_2.Bilibili.getAllGenkiRooms()];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_2 = _a.sent();
                        index_3.cprint("(Collector) [GenkiRank] - " + error_2.message, chalk.red);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, []];
                }
            });
        }); })();
        var tasks = [dbTask, sailsTask, genkiTask];
        return Promise.all(tasks).then(function (results) {
            var _a;
            return new Set(_this.filterRooms((_a = []).concat.apply(_a, results)));
        });
    };
    RoomCollector.prototype.getDynamicRooms = function (numDynamicRooms) {
        var _this = this;
        if (numDynamicRooms === void 0) { numDynamicRooms = 0; }
        if (numDynamicRooms <= 0) {
            numDynamicRooms = Infinity;
        }
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var resp, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, index_2.Bilibili.getRoomsInArea(0, 99, numDynamicRooms)];
                    case 1:
                        resp = _a.sent();
                        return [2 /*return*/, resp.map(function (entry) { return entry['roomid']; })];
                    case 2:
                        error_3 = _a.sent();
                        index_3.cprint("(Collector) - " + error_3.message, chalk.red);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/, []];
                }
            });
        }); })();
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
