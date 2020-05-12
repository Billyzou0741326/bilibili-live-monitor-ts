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
    Cookies.parseSetCookie = function (cookieStrList) {
        var cookies = {};
        for (var _i = 0, cookieStrList_1 = cookieStrList; _i < cookieStrList_1.length; _i++) {
            var cookieStr = cookieStrList_1[_i];
            var cookieIndex = cookieStr.indexOf(';');
            if (cookieIndex === -1) {
                continue;
            }
            var keyValuePair = cookieStr.substring(0, cookieIndex);
            var seperatorIndex = keyValuePair.indexOf('=');
            if (seperatorIndex === -1) {
                continue;
            }
            var key = keyValuePair.substring(0, seperatorIndex);
            var value = keyValuePair.substring(seperatorIndex + 1);
            cookies[key] = value;
        }
        return cookies;
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
