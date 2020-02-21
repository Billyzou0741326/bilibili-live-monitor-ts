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
var fs = require("fs");
var path = require("path");
var chalk = require("chalk");
var index_1 = require("../fmt/index");
var index_2 = require("./index");
var Account = /** @class */ (function () {
    function Account(info) {
        this._filename = 'user.json';
        this._loginInfo = info || {
            username: '',
            password: '',
        };
        this._webSession = {
            bili_jct: '',
            DedeUserID: '',
            DedeUserID__ckMd5: '',
            sid: '',
            SESSDATA: '',
        };
        this._appSession = {
            access_token: '',
            refresh_token: '',
            mid: 0,
            expires_in: 0,
        };
    }
    Account.prototype.withLoginInfo = function (loginInfo) {
        this._loginInfo = loginInfo;
        return this;
    };
    Object.defineProperty(Account.prototype, "cookies", {
        get: function () {
            return this._webSession;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Account.prototype, "tokens", {
        get: function () {
            return this._appSession;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Account.prototype, "username", {
        get: function () {
            return this._loginInfo.username;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Account.prototype, "password", {
        get: function () {
            return this._loginInfo.password;
        },
        enumerable: true,
        configurable: true
    });
    Account.prototype.isUsable = function () {
        return !!(this._webSession.bili_jct
            && this._webSession.DedeUserID
            && this._webSession.DedeUserID__ckMd5
            && this._webSession.SESSDATA
            && this._appSession.access_token
            && this._appSession.refresh_token);
    };
    Account.prototype.needsLogin = function () {
        return index_2.Bilibili.sessionInfo(this.tokens).then(function (resp) {
            var code = resp['code'];
            var expiresIn = -1;
            if (code === 0) {
                expiresIn = resp['data']['expires_in'];
            }
            return expiresIn < 2 * 24 * 60 * 60;
        }).catch(function (error) {
            index_1.cprint("(LoginStatus) - " + error.message, chalk.red);
            return Promise.resolve(true);
        });
    };
    Account.prototype.login = function () {
        var _this = this;
        if (!(this._loginInfo.username && this._loginInfo.password)) {
            return Promise.reject(new Error('(Login) - 用户名/密码未提供'));
        }
        return (index_2.Bilibili.login(this._loginInfo.username, this._loginInfo.password)
            .then(function (resp) {
            var result = resp;
            var code = resp['code'];
            var msg = resp['msg'] || resp['message'] || '';
            if (code !== 0) {
                result = Promise.reject(new Error("(Login) " + code + " - " + msg));
            }
            return Promise.resolve(result);
        })
            .then(function (resp) {
            var data = resp['data'];
            var app = data['token_info'];
            var web = {};
            data['cookie_info']['cookies'].forEach(function (entry) {
                web[entry['name']] = entry['value'];
            });
            var appSession = {
                access_token: app['access_token'],
                refresh_token: app['refresh_token'],
                mid: app['mid'],
                expires_in: app['expires_in'],
            };
            var webSession = {
                bili_jct: web['bili_jct'],
                DedeUserID: web['DedeUserID'],
                DedeUserID__ckMd5: web['DedeUserID__ckMd5'],
                sid: web['sid'],
                SESSDATA: web['SESSDATA'],
            };
            _this._appSession = appSession;
            _this._webSession = webSession;
            return resp;
        })
            .then(function () {
            _this.saveToFile();
        }));
    };
    Account.prototype.loadFromFile = function () {
        if (!this._filename === true) {
            return;
        }
        var filename = path.resolve(__dirname, this._filename);
        if (fs.existsSync(filename) === false) {
            return;
        }
        var str = fs.readFileSync(filename).toString();
        var data = JSON.parse(str);
        var user = data['user'];
        var app = data['app'];
        var web = data['web'];
        this._appSession = app;
        this._webSession = web;
        if (user.username !== '' && user.password !== '') {
            this._loginInfo = user;
        }
    };
    Account.prototype.saveToFile = function () {
        var filename = ((this._filename && path.resolve(__dirname, this._filename))
            || path.resolve(__dirname, 'user.json'));
        index_1.cprint("Storing login info into " + filename, chalk.green);
        fs.writeFile(filename, this.toFileFormat(), function (err) {
            if (err) {
                index_1.cprint("(Account) SaveError - " + err.message, chalk.red);
            }
        });
    };
    Account.prototype.toFileFormat = function () {
        var data = {
            'user': this._loginInfo,
            'web': this.cookies,
            'app': this.tokens,
        };
        return JSON.stringify(data, null, 4);
    };
    return Account;
}());
exports.Account = Account;
var User = /** @class */ (function (_super) {
    __extends(User, _super);
    function User(info) {
        return _super.call(this, info) || this;
    }
    return User;
}(Account));
exports.User = User;
