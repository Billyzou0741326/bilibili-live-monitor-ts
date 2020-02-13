"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var HttpError = /** @class */ (function () {
    function HttpError(msg) {
        this._name = 'HttpError';
        this._message = msg;
        this._code = 'ERR_HTTP_CONN';
        this._status = 0;
        this.stack = (new Error()).stack;
    }
    HttpError.prototype.withStatus = function (status) {
        this._status = status;
        return this;
    };
    Object.defineProperty(HttpError.prototype, "code", {
        get: function () {
            return this._code;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpError.prototype, "status", {
        get: function () {
            return this._status;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpError.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(HttpError.prototype, "message", {
        get: function () {
            return this._message;
        },
        enumerable: true,
        configurable: true
    });
    return HttpError;
}());
exports.HttpError = HttpError;
