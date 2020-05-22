"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http2 = require("http2");
var follow_redirects_1 = require("follow-redirects");
var index_1 = require("./index");
var Xhr = /** @class */ (function () {
    function Xhr() {
        this._rateLimiter = null;
        this._http2Client = new Map();
    }
    Xhr.prototype.withRateLimiter = function (limiter) {
        this._rateLimiter = limiter;
        return this;
    };
    Xhr.prototype.request = function (request) {
        var _this = this;
        var sendRequestPre = null;
        if (request.version == index_1.Request.HTTP_VERSION_1) {
            sendRequestPre = this.prepareRequestHttp1(request);
        }
        else if (request.version == index_1.Request.HTTP_VERSION_2) {
            sendRequestPre = this.prepareRequestHttp2(request);
        }
        if (null === sendRequestPre) {
            return Promise.reject(new index_1.HttpError("Invalid http version"));
        }
        var sendRequest = sendRequestPre;
        var result = new Promise(function (resolve) {
            if (_this._rateLimiter !== null) {
                var task = function () { resolve(sendRequest()); };
                _this._rateLimiter.add(task);
            }
            else {
                resolve(sendRequest());
            }
        });
        return result;
    };
    Xhr.prototype.prepareRequestHttp2 = function (request) {
        var _this = this;
        var xhr = null;
        var options = request.toHttpOptions();
        var hostPort = request.host + ":443";
        xhr = this._http2Client.get(hostPort);
        if (typeof xhr === 'undefined') {
            var protocol = 'https:';
            var sessionOptions = {
                'protocol': protocol,
            };
            var conn = http2.connect(protocol + "//" + hostPort, sessionOptions);
            conn.setMaxListeners(50);
            conn.on('error', function (error) {
                _this._http2Client.delete(hostPort);
            });
            conn.on('goaway', function () {
                _this._http2Client.delete(hostPort);
            });
            conn.on('close', function () {
                _this._http2Client.delete(hostPort);
            });
            this._http2Client.set(hostPort, conn);
            xhr = conn;
        }
        var sendRequest = function () {
            var promise = new Promise(function (resolve, reject) {
                var dataSequence = [];
                var req = xhr.request(options);
                (req
                    .on('timeout', function () {
                    req.close(http2.constants.NGHTTP2_SETTINGS_TIMEOUT);
                    reject(new index_1.HttpError('Http request timed out'));
                })
                    .on('aborted', function () { return reject(new index_1.HttpError('Http request aborted')); })
                    .on('error', function (error) { return reject(new index_1.HttpError("Http request errored - " + error.message)); })
                    .on('close', function () { return reject(new index_1.HttpError('Http request closed')); })
                    .on('response', function (headers, flags) {
                    var code = headers[':status'] || -1;
                    if (code !== -1 && (200 < code || code >= 300)) {
                        req.close(http2.constants.NGHTTP2_NO_ERROR);
                        reject((new index_1.HttpError("Http status " + code)).withStatus(code));
                    }
                })
                    .on('data', function (data) { return dataSequence.push(data); })
                    .on('end', function () {
                    var url = "" + request.host + request.path;
                    var method = request.method;
                    var data = Buffer.concat(dataSequence);
                    var res = (index_1.ResponseBuilder.start()
                        .withUrl(url)
                        .withMethod(method)
                        .withData(data)
                        .build());
                    resolve(res);
                }));
                req.setTimeout(request.timeout);
                if (request.data) {
                    req.write(request.data);
                }
                req.end();
            });
            return promise;
        };
        return sendRequest;
    };
    Xhr.prototype.prepareRequestHttp1 = function (request) {
        var xhr = null;
        var options = request.toHttpOptions();
        if (request.https === true) {
            xhr = follow_redirects_1.https;
        }
        else {
            xhr = follow_redirects_1.http;
        }
        var sendRequest = function () {
            var promise = new Promise(function (resolve, reject) {
                var req = (xhr.request(options)
                    .on('timeout', function () {
                    req.abort();
                    reject(new index_1.HttpError('Http request timed out'));
                })
                    .on('abort', function () { return reject(new index_1.HttpError('Http request aborted')); })
                    .on('error', function (error) { return reject(new index_1.HttpError("Http request errored - " + error.message)); })
                    .on('close', function () { return reject(new index_1.HttpError('Http request closed')); })
                    .on('response', function (response) {
                    var code = response.statusCode || 0;
                    if (code >= 200 && code < 300) {
                        var dataSequence_1 = [];
                        response
                            .on('aborted', function () { return reject(new index_1.HttpError('Http request aborted')); })
                            .on('error', function (error) { return reject(new index_1.HttpError(error.message)); })
                            .on('data', function (data) { return dataSequence_1.push(data); })
                            .on('end', function () {
                            var url = "" + request.host + request.path;
                            var method = request.method;
                            var data = Buffer.concat(dataSequence_1);
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
        return sendRequest;
    };
    return Xhr;
}());
exports.Xhr = Xhr;
