"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../task/index");
var index_2 = require("./index");
var History = /** @class */ (function () {
    function History() {
        this._active = new Map();
        for (var category in index_2.RaffleCategory) {
            this._active.set(category, new Map());
        }
        this._tasks = [];
        this._CLEAR_ON_EXCEEDS = 200;
    }
    History.prototype.stop = function () {
        for (var _i = 0, _a = this._tasks; _i < _a.length; _i++) {
            var t = _a[_i];
            t.stop();
        }
        this._tasks = [];
    };
    History.prototype.retrieveGetter = function (target) {
        // Potential memory leak: Some other resources may hold reference to the Map
        var gifts = this._active.get(target) || new Map();
        return function () { return Array.from(gifts.values()); };
    };
    History.prototype.add = function (g) {
        var raffles = this._active.get(g.category);
        raffles.set(g.id, g);
        var removeTask = new index_1.DelayedTask()
            .withTime(g.expireAt * 1000 - new Date().valueOf())
            .withCallback(function () { raffles.delete(g.id); });
        this._tasks.push(removeTask);
        removeTask.start();
        if (this._tasks.length > this._CLEAR_ON_EXCEEDS) {
            this._tasks = this._tasks.filter(function (t) { return t.running; });
        }
    };
    History.prototype.has = function (g) {
        return this._active.get(g.category).has(g.id);
    };
    return History;
}());
exports.History = History;
