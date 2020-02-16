"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../task/index");
var index_2 = require("./index");
var History = /** @class */ (function () {
    function History() {
        this._active = new Map();
        for (var _i = 0, RaffleCategories_1 = index_2.RaffleCategories; _i < RaffleCategories_1.length; _i++) {
            var category = RaffleCategories_1[_i];
            this._active.set(category, new Map());
        }
        this._tasks = [];
        this._CLEAR_ON_EXCEEDS = 200;
    }
    History.prototype.stop = function () {
        this._tasks.forEach(function (t) { t.stop(); });
        this._tasks = [];
    };
    History.prototype.retrieveGetter = function (target) {
        var _this = this;
        return function () { return Array.from(_this._active.get(target).values()); };
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
