"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var querystring = require("querystring");
var Cookies = /** @class */ (function () {
    function Cookies() {
    }
    Cookies.stringify = function (cookies) {
        var options = {
            'encodeURIComponent': querystring.unescape,
        };
        var formattedCookies = querystring.stringify(cookies, '; ', '=', options);
        return formattedCookies;
    };
    return Cookies;
}());
exports.Cookies = Cookies;
var Params = /** @class */ (function () {
    function Params() {
    }
    Params.stringify = function (params) {
        var formattedParams = querystring.stringify(params, '&', '=');
        return formattedParams;
    };
    return Params;
}());
exports.Params = Params;
