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
var http2 = require("http2");
var querystring = require("querystring");
var httpAgent = null;
var httpsAgent = null;
initializeAgents();
var RequestMethods;
(function (RequestMethods) {
    RequestMethods["GET"] = "GET";
    RequestMethods["PUT"] = "PUT";
    RequestMethods["POST"] = "POST";
    RequestMethods["HEAD"] = "HEAD";
    RequestMethods["DELETE"] = "DELETE";
})(RequestMethods = exports.RequestMethods || (exports.RequestMethods = {}));
var HttpVersion;
(function (HttpVersion) {
    HttpVersion[HttpVersion["HTTP_VERSION_1"] = 1] = "HTTP_VERSION_1";
    HttpVersion[HttpVersion["HTTP_VERSION_2"] = 2] = "HTTP_VERSION_2";
})(HttpVersion = exports.HttpVersion || (exports.HttpVersion = {}));
var Request = /** @class */ (function () {
    function Request() {
        this._host = '';
        this._path = '';
        this._port = 80;
        this._https = false;
        this._method = RequestMethods.GET;
        this._params = {};
        this._data = undefined;
        this._headers = {};
        this._cookies = {};
        this._contentType = '';
        this._agent = httpAgent;
        this._timeout = 8000;
        this._version = HttpVersion.HTTP_VERSION_2;
    }
    Request.prototype.toHttpOptions = function () {
        var path = this.path;
        var paramstr = '';
        var cookiestr = '';
        var headers = {};
        var timeout = 4000;
        if (typeof this._params !== 'string') {
            paramstr = formatParams(this._params);
        }
        else {
            paramstr = this._params;
        }
        paramstr && (path = path + "?" + paramstr);
        if (typeof this._cookies !== 'string') {
            cookiestr = formatCookies(this._cookies);
            cookiestr && (headers['Cookie'] = cookiestr);
        }
        if (this._contentType) {
            headers['Content-Type'] = this._contentType;
        }
        if (this._timeout && this._timeout > 0) {
            timeout = this._timeout;
        }
        Object.assign(headers, this.headers);
        this._headers = headers;
        var options = {
            host: this.host,
            path: path,
            port: this.port,
            method: this.method,
            headers: this.headers,
            agent: this.agent,
            timeout: timeout,
        };
        if (this.version === Request.HTTP_VERSION_2) {
            delete options.headers['Connection'];
            options.headers['timeout'] = timeout;
            options.headers[http2.constants.HTTP2_HEADER_PATH] = path;
            options.headers[http2.constants.HTTP2_HEADER_METHOD] = this.method;
            options.headers[http2.constants.HTTP2_HEADER_SCHEME] = this.https ? 'https' : 'http';
            return options.headers;
        }
        return options;
    };
    Request.Builder = function () {
        return new RequestBuilder();
    };
    Object.defineProperty(Request, "GET", {
        get: function () {
            return RequestMethods.GET;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request, "PUT", {
        get: function () {
            return RequestMethods.PUT;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request, "POST", {
        get: function () {
            return RequestMethods.POST;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request, "HEAD", {
        get: function () {
            return RequestMethods.HEAD;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request, "DELETE", {
        get: function () {
            return RequestMethods.DELETE;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request, "HTTP_VERSION_1", {
        get: function () {
            return HttpVersion.HTTP_VERSION_1;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request, "HTTP_VERSION_2", {
        get: function () {
            return HttpVersion.HTTP_VERSION_2;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "host", {
        get: function () {
            return this._host;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "path", {
        get: function () {
            return this._path;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "port", {
        get: function () {
            return this._port;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "https", {
        get: function () {
            return this._https;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "method", {
        get: function () {
            return this._method;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "params", {
        get: function () {
            return this._params;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "data", {
        get: function () {
            return this._data;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "headers", {
        get: function () {
            return this._headers;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "agent", {
        get: function () {
            return this._agent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "contentType", {
        get: function () {
            return this._contentType;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "timeout", {
        get: function () {
            return this._timeout;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Request.prototype, "version", {
        get: function () {
            return this._version;
        },
        enumerable: true,
        configurable: true
    });
    return Request;
}());
exports.Request = Request;
var RequestBuilder = /** @class */ (function (_super) {
    __extends(RequestBuilder, _super);
    function RequestBuilder() {
        return _super.call(this) || this;
    }
    RequestBuilder.start = function () {
        return new RequestBuilder();
    };
    RequestBuilder.prototype.withHost = function (host) {
        this._host = host;
        return this;
    };
    RequestBuilder.prototype.withPath = function (path) {
        this._path = path;
        return this;
    };
    RequestBuilder.prototype.withPort = function (port) {
        this._port = port;
        return this;
    };
    /** ``version``: HTTP_VERSION_1 or HTTP_VERSION_2 */
    RequestBuilder.prototype.withHttpVersion = function (version) {
        this._version = version;
        return this;
    };
    RequestBuilder.prototype.withHttps = function () {
        this._https = true;
        if ([80, 443].includes(this._port)) {
            this._port = 443;
        }
        this.withAgent(httpsAgent);
        return this;
    };
    RequestBuilder.prototype.withMethod = function (method) {
        this._method = method;
        return this;
    };
    RequestBuilder.prototype.withParams = function (params) {
        this._params = params;
        return this;
    };
    RequestBuilder.prototype.withData = function (data) {
        this._data = data;
        return this;
    };
    RequestBuilder.prototype.withHeaders = function (headers) {
        if (headers) {
            this._headers = headers;
        }
        return this;
    };
    RequestBuilder.prototype.withCookies = function (cookies) {
        this._cookies = cookies;
        return this;
    };
    RequestBuilder.prototype.withContentType = function (contentType) {
        this._contentType = contentType;
        return this;
    };
    RequestBuilder.prototype.withAgent = function (agent) {
        this._agent = agent;
        return this;
    };
    RequestBuilder.prototype.withTimeout = function (timeout) {
        this._timeout = timeout;
        return this;
    };
    RequestBuilder.prototype.build = function () {
        return this;
    };
    return RequestBuilder;
}(Request));
exports.RequestBuilder = RequestBuilder;
function initializeAgents() {
    if (httpAgent === null) {
        httpAgent = new http.Agent({
            keepAlive: true,
            maxFreeSockets: 1024,
        });
    }
    if (httpsAgent === null) {
        httpsAgent = new https.Agent({
            keepAlive: true,
            maxFreeSockets: 64,
        });
    }
    return { httpAgent: httpAgent, httpsAgent: httpsAgent };
}
function formatParams(params) {
    var formattedParams = querystring.stringify(params, '&', '=');
    return formattedParams;
}
function formatCookies(cookies) {
    var options = {
        'encodeURIComponent': querystring.unescape,
    };
    var formattedCookies = querystring.stringify(cookies, '; ', '=', options);
    return formattedCookies;
}
