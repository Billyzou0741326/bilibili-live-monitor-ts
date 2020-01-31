"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var chalk = require("chalk");
var index_1 = require("../task/index");
var index_2 = require("../fmt/index");
var Database = /** @class */ (function () {
    function Database(name) {
        var _this = this;
        if (typeof name === 'undefined') {
            name = 'record.json';
        }
        this._filename = path.resolve(__dirname, name);
        this._roomData = {};
        this._saveTask = new index_1.DelayedTask();
        this._saveTask.withTime(2 * 60 * 1000).withCallback(function () {
            (_this.load()
                .then(function () { _this.save(); })
                .catch(function (error) {
                index_2.cprint("(Database) - " + error.message, chalk.red);
            }));
        });
        this.setup();
    }
    Database.prototype.stop = function () {
        this._saveTask.stop();
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
        (this.load()
            .catch(function (error) { return Promise.resolve({}); })
            .then(function (roomData) { return _this.save(); }));
    };
    Database.prototype.save = function () {
        var data = JSON.stringify(this._roomData, null, 4);
        fs.writeFile(this._filename, data, function (error) {
            if (error) {
                index_2.cprint("(Database) - " + error.message, chalk.red);
            }
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
        var thirtyDays = 1000 * 60 * 60 * 24 * 30;
        var result = Object.assign(new Object(), data);
        Object.entries(result).forEach(function (entry) {
            if (new Date().valueOf() - entry[1].updated_at > thirtyDays) {
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
