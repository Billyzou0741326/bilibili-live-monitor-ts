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
var fs = require("fs");
var path = require("path");
var chalk = require("chalk");
var fs_1 = require("fs");
var index_1 = require("../task/index");
var index_2 = require("../fmt/index");
var FileWatcher = /** @class */ (function () {
    function FileWatcher(filename, task) {
        this._filename = path.resolve(__dirname, filename);
        this._fsWatcher = null;
        this._listenerTask = null;
        this._paused = false;
    }
    FileWatcher.prototype.withTask = function (task) {
        this._listenerTask = task;
        return this;
    };
    FileWatcher.prototype.start = function () {
        var _this = this;
        if (this._fsWatcher === null) {
            this._fsWatcher = fs.watch(this._filename)
                .on('change', function () {
                if (!_this._paused) {
                    _this._listenerTask && _this._listenerTask.start();
                }
            })
                .on('error', function (error) {
                index_2.cprint("(FileWatcher) - " + error.message, chalk.red);
                _this._fsWatcher && _this._fsWatcher.close();
            })
                .on('close', function () {
                _this._listenerTask && _this._listenerTask.stop();
                _this._fsWatcher = null;
            });
        }
    };
    FileWatcher.prototype.stop = function () {
        if (this._fsWatcher !== null) {
            this._fsWatcher.close();
        }
    };
    FileWatcher.prototype.pause = function () {
        this._paused = true;
    };
    FileWatcher.prototype.resume = function () {
        this._paused = false;
    };
    return FileWatcher;
}());
exports.FileWatcher = FileWatcher;
var Database = /** @class */ (function () {
    function Database(options) {
        var _this = this;
        var name = 'record.json'; // name defaults to 'record.json'
        var expiry = 1000 * 60 * 60 * 24 * 3; // expiry defaults to 3 days
        if (typeof options !== 'undefined') {
            name = options.name || name; // custom configuration
            if (options.expiry && Number.isInteger(options.expiry)) {
                expiry = 1000 * 60 * 60 * 24 * options.expiry; // expiry is in days
            }
        }
        this._filename = path.resolve(__dirname, name);
        this._roomData = {};
        this._expiry = expiry;
        this._saveTask = new index_1.DelayedTask();
        this._saveTask.withTime(2 * 60 * 1000).withCallback(function () {
            _this.update();
        });
        this._watcher = new FileWatcher(this._filename, new index_1.DelayedTask().withTime(100).withCallback(function () {
            _this.load();
        }));
        this.setup();
    }
    Database.prototype.start = function () {
        this._watcher.start();
    };
    Database.prototype.stop = function () {
        this._saveTask.stop();
        this._watcher.stop();
    };
    Database.prototype.setup = function () {
        if (fs.existsSync(this._filename) === false) {
            var data = JSON.stringify({}, null, 4);
            fs.writeFileSync(this._filename, data);
        }
    };
    Database.prototype.add = function (roomid) {
        this._roomData[roomid] = {
            'updated_at': new Date().valueOf(),
        };
        this._saveTask.start();
    };
    Database.prototype.update = function () {
        var _this = this;
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    this.save();
                }
                catch (error) {
                    index_2.cprint("(Database) - " + error.message, chalk.red);
                }
                return [2 /*return*/];
            });
        }); })();
    };
    Database.prototype.save = function () {
        var _this = this;
        var data = JSON.stringify(this.filter(this._roomData), null, 4);
        this._watcher.pause();
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, fs_1.promises.writeFile(this._filename, data)];
                    case 1:
                        _a.sent();
                        this._watcher.resume();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        this._watcher.resume();
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        }); })();
    };
    Database.prototype.readFile = function () {
        return fs_1.promises.readFile(this._filename, { encoding: 'utf8' });
    };
    Database.prototype.load = function () {
        var _this = this;
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var result, data;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = {};
                        return [4 /*yield*/, this.readFile()];
                    case 1:
                        data = _a.sent();
                        try {
                            result = JSON.parse(data);
                            Object.keys(result).forEach(function (roomid) {
                                var rid = +roomid;
                                if (!_this._roomData[rid]) {
                                    _this._roomData[rid] = result[rid];
                                }
                            });
                        }
                        catch (error) {
                            index_2.cprint("(Database) - " + error.message, chalk.red);
                        }
                        return [2 /*return*/, result];
                }
            });
        }); })();
    };
    Database.prototype.filter = function (data) {
        var threshold = new Date().valueOf() - this._expiry;
        var result = Object.assign(new Object(), data);
        Object.entries(result).forEach(function (entry) {
            if (entry[1].updated_at < threshold) {
                delete result[entry[0]];
            }
        });
        return result;
    };
    Database.prototype.getRooms = function () {
        var _this = this;
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var result, roomData, filtered, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        result = [];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.load()];
                    case 2:
                        roomData = _a.sent();
                        filtered = this.filter(roomData);
                        result = Object.keys(filtered).map(function (d) { return +d; });
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        index_2.cprint("(Database) - " + error_2.message, chalk.red);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, result];
                }
            });
        }); })();
    };
    return Database;
}());
exports.Database = Database;
