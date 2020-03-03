"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var chalk = require("chalk");
var index_1 = require("../task/index");
var index_2 = require("../fmt/index");
var FileWatcher = /** @class */ (function () {
    function FileWatcher(filename, listener, delay) {
        this._filename = filename;
        this._fsWatcher = null;
        this._listenerTask = new index_1.DelayedTask().withTime(delay ? delay : 10).withCallback(function () { return listener(); });
        this._paused = false;
    }
    FileWatcher.prototype.start = function () {
        var _this = this;
        this._fsWatcher = fs.watch(this._filename)
            .on('change', function () {
            if (!_this._paused) {
                _this._listenerTask.start();
            }
        });
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
        this._watcher = new FileWatcher(this._filename, function () {
            _this.load();
        });
        this.setup();
    }
    Database.prototype.start = function () {
        this._watcher.start();
        this.getRooms();
    };
    Database.prototype.stop = function () {
        this._saveTask.stop();
        this._watcher.stop();
        return this.update();
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
        return this.save().catch(function (error) {
            index_2.cprint("(Database) - " + error.message, chalk.red);
        });
    };
    Database.prototype.save = function () {
        var _this = this;
        var data = JSON.stringify(this.filter(this._roomData), null, 4);
        this._watcher.pause();
        return new Promise(function (resolve, reject) {
            fs.writeFile(_this._filename, data, function (error) {
                _this._watcher.resume();
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    };
    Database.prototype.readFile = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            fs.readFile(_this._filename, 'utf8', function (error, data) {
                if (error) {
                    reject(error);
                }
                else if (data instanceof Buffer) {
                    data = data.toString();
                }
                resolve(data);
            });
        });
    };
    Database.prototype.load = function () {
        var _this = this;
        return this.readFile().then(function (data) {
            var result = {};
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
            return result;
        });
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
        return (this.load()
            .then(function (data) { return _this.filter(data); })
            .then(function (data) { return Object.keys(data).map(function (d) { return +d; }); })
            .catch(function (error) {
            index_2.cprint("(Database) - " + error.message, chalk.red);
            return Promise.resolve([]);
        }));
    };
    return Database;
}());
exports.Database = Database;
