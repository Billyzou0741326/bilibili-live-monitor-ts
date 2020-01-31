"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("../task/index");
var History = /** @class */ (function () {
    function History() {
        this._active = {
            pks: new Map(),
            gifts: new Map(),
            guards: new Map(),
            storms: new Map(),
            anchors: new Map(),
        };
        this._tasks = [];
        this._CLEAR_ON_EXCEEDS = 200;
    }
    History.prototype.stop = function () {
        this._tasks.forEach(function (t) { t.stop(); });
        this._tasks = [];
    };
    History.prototype.retrieveGetter = function (target) {
        var _this = this;
        var result = function () { return []; };
        switch (target) {
            case 'gift':
                result = function () { return Array.from(_this._active.gifts.values()); };
                break;
            case 'guard':
                result = function () { return Array.from(_this._active.guards.values()); };
                break;
            case 'pk':
                result = function () { return Array.from(_this._active.pks.values()); };
                break;
            case 'storm':
                result = function () { return Array.from(_this._active.storms.values()); };
                break;
            case 'anchor':
                result = function () { return Array.from(_this._active.anchors.values()); };
                break;
        }
        return result;
    };
    History.prototype.add = function (g) {
        var _this = this;
        var t = g.category;
        var now = new Date().valueOf();
        var removeTask = new index_1.DelayedTask();
        removeTask.withTime(g.expireAt * 1000 - now);
        this._tasks.push(removeTask);
        switch (t) {
            case 'gift':
                this._active.gifts.set(g.id, g);
                removeTask.withCallback(function () { _this._active.gifts.delete(g.id); });
                removeTask.start();
                break;
            case 'guard':
                this._active.guards.set(g.id, g);
                removeTask.withCallback(function () { _this._active.guards.delete(g.id); });
                removeTask.start();
                break;
            case 'storm':
                this._active.storms.set(g.id, g);
                removeTask.withCallback(function () { _this._active.storms.delete(g.id); });
                removeTask.start();
                break;
            case 'pk':
                this._active.pks.set(g.id, g);
                removeTask.withCallback(function () { _this._active.pks.delete(g.id); });
                removeTask.start();
                break;
            case 'anchor':
                this._active.anchors.set(g.id, g);
                removeTask.withCallback(function () { _this._active.anchors.delete(g.id); });
                removeTask.start();
                break;
            case '':
                return;
            default:
                return;
        }
        if (this._tasks.length > this._CLEAR_ON_EXCEEDS) {
            this._tasks = this._tasks.filter(function (t) { return t.running; });
        }
    };
    History.prototype.has = function (g) {
        var exists = false;
        switch (g.category) {
            case 'gift':
                var giftId = g.id;
                exists = this._active.gifts.has(giftId);
                break;
            case 'guard':
                var guardId = g.id;
                exists = this._active.guards.has(guardId);
                break;
            case 'storm':
                var stormId = g.id;
                exists = this._active.storms.has(stormId);
                break;
            case 'pk':
                var pkId = g.id;
                exists = this._active.pks.has(pkId);
                break;
            case 'anchor':
                var anchorId = g.id;
                exists = this._active.anchors.has(anchorId);
                break;
            case '':
                exists = true;
                break;
            default:
                break;
        }
        return exists;
    };
    return History;
}());
exports.History = History;
