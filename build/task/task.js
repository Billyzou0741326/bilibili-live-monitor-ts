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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
var AbstractTask = /** @class */ (function () {
    function AbstractTask() {
        this._time = 0;
        this._callback = function () { };
    }
    AbstractTask.prototype.start = function () {
    };
    AbstractTask.prototype.stop = function () {
    };
    Object.defineProperty(AbstractTask.prototype, "running", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractTask.prototype, "time", {
        get: function () {
            return this._time;
        },
        enumerable: true,
        configurable: true
    });
    AbstractTask.prototype.withCallback = function (callback) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this._callback = callback;
        this._args = args;
        return this;
    };
    AbstractTask.prototype.withTime = function (ms) {
        ms = ms > 0 ? ms : 0;
        this._time = ms;
        return this;
    };
    return AbstractTask;
}());
var RecurrentTask = /** @class */ (function (_super) {
    __extends(RecurrentTask, _super);
    function RecurrentTask() {
        var _this = _super.call(this) || this;
        _this._stopper = null;
        return _this;
    }
    Object.defineProperty(RecurrentTask.prototype, "running", {
        get: function () {
            return this._stopper !== null;
        },
        enumerable: true,
        configurable: true
    });
    RecurrentTask.prototype.start = function () {
        if (this._stopper === null) {
            this._stopper = setInterval.apply(void 0, __spreadArrays([this._callback, this.time], this._args));
        }
    };
    RecurrentTask.prototype.stop = function () {
        if (this._stopper !== null) {
            clearInterval(this._stopper);
            this._stopper = null;
        }
    };
    return RecurrentTask;
}(AbstractTask));
exports.RecurrentTask = RecurrentTask;
var DelayedTask = /** @class */ (function (_super) {
    __extends(DelayedTask, _super);
    function DelayedTask() {
        var _this = _super.call(this) || this;
        _this._stopper = null;
        return _this;
    }
    Object.defineProperty(DelayedTask.prototype, "running", {
        get: function () {
            return this._stopper !== null;
        },
        enumerable: true,
        configurable: true
    });
    DelayedTask.prototype.start = function () {
        var _this = this;
        if (this._stopper === null) {
            this._stopper = setTimeout(function () {
                _this._stopper = null;
                _this._callback.apply(_this, _this._args);
            }, this.time);
        }
    };
    DelayedTask.prototype.stop = function () {
        if (this._stopper !== null) {
            clearTimeout(this._stopper);
            this._stopper = null;
        }
    };
    return DelayedTask;
}(AbstractTask));
exports.DelayedTask = DelayedTask;
