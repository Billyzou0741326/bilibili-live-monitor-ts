"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
var index_1 = require("../container/index");
var index_2 = require("../fmt/index");
var index_3 = require("./index");
var RateLimiter = /** @class */ (function () {
    function RateLimiter(count, milliseconds) {
        var _this = this;
        milliseconds = milliseconds || 0;
        this._interval = 1000;
        this._limit = Infinity;
        this._dispatched = 0;
        this._refreshTask = new index_3.DelayedTask();
        this._refreshTask.withTime(this._interval).withCallback(function () {
            _this._dispatched = 0;
            _this.dispatch();
            if (_this._queue.length > 0) {
                _this._refreshTask.start();
            }
        });
        this._running = false;
        this._queue = new index_1.Queue();
        if (Number.isInteger(count)) {
            count = count > 0 ? count : 0;
            if (Number.isInteger(milliseconds) === false) {
                milliseconds = this._interval;
            }
            milliseconds = milliseconds > 0 ? milliseconds : 1;
            var rate = this._interval / milliseconds;
            this._limit = Math.round(rate * count);
        }
    }
    RateLimiter.prototype.add = function (task) {
        this._queue.push(task);
        this._refreshTask.start();
        this.dispatch();
    };
    RateLimiter.prototype.dispatch = function () {
        while (this._dispatched < this._limit && this._queue.length > 0) {
            var task = this._queue.pop();
            try {
                task && task();
            }
            catch (error) {
                // TODO: turn this into EventEmitter and emit error?
                index_2.cprint("(RateLimiter) - " + error.message, chalk.red);
            }
            ++this._dispatched;
        }
    };
    RateLimiter.prototype.start = function () {
        if (this._running === false) {
            this._running = true;
            this._refreshTask.start();
            this.dispatch();
        }
    };
    RateLimiter.prototype.stop = function () {
        if (this._running === true) {
            this._refreshTask.stop();
            this._running = false;
        }
    };
    return RateLimiter;
}());
exports.RateLimiter = RateLimiter;
