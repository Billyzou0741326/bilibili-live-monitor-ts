"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Account = void 0;
var fs = require("fs");
var path = require("path");
var chalk = require("chalk");
var index_1 = require("../fmt/index");
var index_2 = require("./index");
var Account = /** @class */ (function () {
    function Account(info) {
        var _this = this;
        this._filename = path.resolve(__dirname, 'user.json');
        this._fsWriteTask = (function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); }); })();
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
        this.bind();
    }
    Account.prototype.bind = function () {
        this.saveToFile_ = this.saveToFile_.bind(this);
        this.loadFromFile = this.loadFromFile.bind(this);
        this.storeSession = this.storeSession.bind(this);
    };
    Account.prototype.withLoginInfo = function (loginInfo) {
        this._loginInfo = loginInfo;
        return this;
    };
    Account.prototype.withCookies = function (cookies) {
        return this;
    };
    Account.prototype.withTokens = function (tokens) {
        return this;
    };
    Object.defineProperty(Account.prototype, "cookies", {
        get: function () {
            return this._webSession;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Account.prototype, "tokens", {
        get: function () {
            return this._appSession;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Account.prototype, "username", {
        get: function () {
            return this._loginInfo.username;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Account.prototype, "password", {
        get: function () {
            return this._loginInfo.password;
        },
        enumerable: false,
        configurable: true
    });
    Account.prototype.isUsable = function () {
        return !!(this._webSession.bili_jct
            && this._webSession.SESSDATA
            && this._appSession.access_token
            && this._appSession.refresh_token);
    };
    Account.prototype.needsLogin = function () {
        return index_2.Bilibili.sessionInfo({ app: this.tokens, web: this.cookies }).then(function (resp) {
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
    Account.prototype.refresh = function () {
        if (!this.isUsable()) {
            return Promise.reject(new Error('(Login) - No available token fore refresh'));
        }
        return index_2.Bilibili.refreshToken(this.tokens).
            then(Account.raiseForIllegalSessionResponse).
            then(this.storeSession);
    };
    Account.prototype.login = function () {
        if (!(this._loginInfo.username && this._loginInfo.password)) {
            return Promise.reject(new Error('(Login) - 用户名/密码未提供'));
        }
        if (this.isUsable()) {
            /* Refresh */
            return this.refresh();
        }
        return index_2.Bilibili.login(this._loginInfo.username, this._loginInfo.password).
            then(Account.raiseForIllegalSessionResponse).
            then(this.storeSession);
    };
    Account.prototype.storeSession = function (resp) {
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
        this._appSession = appSession;
        this._webSession = webSession;
        return resp;
    };
    Account.raiseForIllegalSessionResponse = function (resp) {
        var result = resp;
        var code = resp['code'];
        var msg = resp['msg'] || resp['message'] || '';
        if (code !== 0) {
            throw new Error("(Login) " + JSON.stringify(resp));
        }
        if (!resp['data'] || typeof resp['data']['cookie_info'] === 'undefined') {
            throw new Error("(Login) " + JSON.stringify(resp));
        }
        return resp;
    };
    Account.prototype.loadFromFile = function () {
        if (!this._filename === true) {
            return;
        }
        var filename = this._filename;
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
        var filename = this._filename;
        index_1.cprint("Storing login info into " + filename, chalk.green);
        this.saveToFile_();
    };
    Account.prototype.saveToFile_ = function (args) {
        var _this = this;
        var filename = this._filename;
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve) {
                            fs.writeFile(filename, _this.toFileFormat(), function (err) {
                                if (err) {
                                    index_1.cprint("(Account) SaveError - " + err.message, chalk.red);
                                }
                                resolve();
                            });
                        })];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, args];
                }
            });
        }); })();
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
