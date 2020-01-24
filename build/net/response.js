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
var index_1 = require("./index");
var Response = /** @class */ (function () {
    function Response() {
        this._url = '';
        this._statusCode = 0;
        this._statusMessage = '';
        this._method = index_1.RequestMethods.GET;
        this._contentType = '';
        this._headers = {};
        this._cookies = {};
        this._data = Buffer.alloc(0);
        this._text = '';
    }
    Object.defineProperty(Response.prototype, "url", {
        get: function () {
            return this._url;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Response.prototype, "statusCode", {
        get: function () {
            return this._statusCode;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Response.prototype, "statusMessage", {
        get: function () {
            return this._statusMessage;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Response.prototype, "method", {
        get: function () {
            return this._method;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Response.prototype, "contentType", {
        get: function () {
            return this._contentType;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Response.prototype, "headers", {
        get: function () {
            return this._headers;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Response.prototype, "data", {
        get: function () {
            return this._data;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Response.prototype, "text", {
        get: function () {
            if (this._text === '') {
                this._text = this.data.toString();
            }
            return this._text;
        },
        enumerable: true,
        configurable: true
    });
    Response.prototype.json = function () {
        return JSON.parse(this.text);
    };
    return Response;
}());
exports.Response = Response;
var ResponseBuilder = /** @class */ (function (_super) {
    __extends(ResponseBuilder, _super);
    function ResponseBuilder() {
        return _super.call(this) || this;
    }
    ResponseBuilder.start = function () {
        return new ResponseBuilder();
    };
    ResponseBuilder.prototype.withHttpResponse = function (inMessage) {
        (this
            .withHeaders(inMessage.headers || {})
            .withStatusCode(inMessage.statusCode || 0)
            .withStatusMessage(inMessage.statusMessage || '')
            .withContentType((this._headers && this._headers['content-type']) || ''));
        return this;
    };
    ResponseBuilder.prototype.withUrl = function (url) {
        this._url = url;
        return this;
    };
    ResponseBuilder.prototype.withStatusCode = function (statusCode) {
        this._statusCode = statusCode;
        return this;
    };
    ResponseBuilder.prototype.withStatusMessage = function (statusMessage) {
        this._statusMessage = statusMessage;
        return this;
    };
    ResponseBuilder.prototype.withMethod = function (method) {
        this._method = method;
        return this;
    };
    ResponseBuilder.prototype.withContentType = function (contentType) {
        this._contentType = contentType;
        return this;
    };
    ResponseBuilder.prototype.withHeaders = function (headers) {
        this._headers = headers;
        return this;
    };
    ResponseBuilder.prototype.withData = function (data) {
        this._text = '';
        this._data = data;
        return this;
    };
    ResponseBuilder.prototype.build = function () {
        return this;
    };
    return ResponseBuilder;
}(Response));
exports.ResponseBuilder = ResponseBuilder;
