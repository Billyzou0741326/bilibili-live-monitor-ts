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
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var https = require("https");
var index_1 = require("./index");
var index_2 = require("../task/index");
var Xhr = /** @class */ (function () {
    function Xhr() {
    }
    Xhr.prototype.request = function (request) {
        var xhr = null;
        var options = request.toHttpOptions();
        if (request.https === true) {
            xhr = https;
        }
        else {
            xhr = http;
        }
        var promise = new Promise(function (resolve, reject) {
            var req = (xhr.request(options)
                .on('timeout', function () { return req.abort(); })
                .on('abort', function () { return reject(new index_1.HttpError('Http request aborted')); })
                .on('error', function () { return reject(new index_1.HttpError('Http request errored')); })
                .on('close', function () { return reject(new index_1.HttpError('Http request closed')); })
                .on('response', function (response) {
                var code = response.statusCode || 0;
                var dataSequence = [];
                response.on('aborted', function () { return reject(new index_1.HttpError('Http request aborted')); });
                response.on('error', function (error) { return reject(new index_1.HttpError(error.message)); });
                response.on('data', function (data) { return dataSequence.push(data); });
                if (code === 200) {
                    response.on('end', function () {
                        var url = "" + request.host + request.path;
                        var method = request.method;
                        var data = Buffer.concat(dataSequence);
                        var res = (index_1.ResponseBuilder.start()
                            .withHttpResponse(response)
                            .withUrl(url)
                            .withMethod(method)
                            .withData(data)
                            .build());
                        resolve(res);
                    });
                }
                else {
                    reject((new index_1.HttpError("Http status " + code)).withStatus(code));
                }
            }));
            if (request.data) {
                req.write(request.data);
            }
            req.end();
        });
        return promise;
    };
    return Xhr;
}());
exports.Xhr = Xhr;
var RateLimitedXhr = /** @class */ (function (_super) {
    __extends(RateLimitedXhr, _super);
    function RateLimitedXhr(count, milliseconds) {
        var _this = _super.call(this) || this;
        milliseconds = milliseconds || 0;
        _this._interval = 1000;
        _this._limit = Infinity;
        if (Number.isInteger(count)) {
            count = count > 0 ? count : 0;
            if (Number.isInteger(milliseconds) === false) {
                milliseconds = _this._interval;
            }
            milliseconds = milliseconds > 0 ? milliseconds : 1;
            var rate = _this._interval / milliseconds;
            _this._limit = Math.round(rate * count);
        }
        _this._taskQueue = new index_2.RateLimiter(count, milliseconds);
        return _this;
    }
    RateLimitedXhr.prototype.request = function (request) {
        var _this = this;
        var promise = new Promise(function (resolve) {
            var task = function () { return resolve(_super.prototype.request.call(_this, request)); };
            _this._taskQueue.add(task);
        });
        return promise;
    };
    return RateLimitedXhr;
}(Xhr));
exports.RateLimitedXhr = RateLimitedXhr;
