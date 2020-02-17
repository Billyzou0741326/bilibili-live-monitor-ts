"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var settings = require("../settings.json");
var path = require("path");
var fs = require("fs");
var crypto = require("crypto");
var chalk = require("chalk");
var index_1 = require("../fmt/index");
var AppConfig = /** @class */ (function () {
    function AppConfig() {
        this._settingsPath = path.resolve(__dirname, '../settings.json');
        this._debug = false;
        this._verbose = false;
        this._tcp_error = false;
        this._appkey = appkey;
        this._appSecret = appSecret;
        this._appCommon = appCommon;
        this._appHeaders = appHeaders;
        this._webHeaders = webHeaders;
        this._initialized = false;
        this._danmuAddr = settings['bilibili-danmu'];
        this._wsAddr = settings['default-ws-server'];
        this._httpAddr = settings['default-http-server'];
        this._biliveAddr = settings['bilive-ws-server'];
        this._users = [];
    }
    AppConfig.prototype.init = function () {
        if (this._initialized === false) {
            this.readArgs()
                .parseUsers();
            this._initialized = true;
        }
    };
    AppConfig.prototype.readArgs = function () {
        if (process.argv.includes('-v')) {
            this._verbose = true;
        }
        if (process.argv.includes('--debug')) {
            this._debug = true;
        }
        if (process.argv.includes('--tcp-error')) {
            this._tcp_error = true;
        }
        return this;
    };
    Object.defineProperty(AppConfig.prototype, "danmuAddr", {
        get: function () {
            return this._danmuAddr;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "wsAddr", {
        get: function () {
            return this._wsAddr;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "httpAddr", {
        get: function () {
            return this._httpAddr;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "biliveAddr", {
        get: function () {
            return this._biliveAddr;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "debug", {
        get: function () {
            return this._debug;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "verbose", {
        get: function () {
            return this._verbose;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "tcp_error", {
        get: function () {
            return this._tcp_error;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "appkey", {
        get: function () {
            return this._appkey;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "appSecret", {
        get: function () {
            return this._appSecret;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "appCommon", {
        get: function () {
            return this._appCommon;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "appHeaders", {
        get: function () {
            return this._appHeaders;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "webHeaders", {
        get: function () {
            return this._webHeaders;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AppConfig.prototype, "users", {
        get: function () {
            return this._users;
        },
        enumerable: true,
        configurable: true
    });
    AppConfig.prototype.parseUsers = function () {
        if (settings.hasOwnProperty('users')) {
            var settingsUpdated = false;
            for (var _i = 0, _a = settings.users; _i < _a.length; _i++) {
                var u = _a[_i];
                var user = u;
                if (user.hasOwnProperty('id')) {
                    if (!user.hasOwnProperty('password') && user.hasOwnProperty('plainTextPassword')) {
                        user.password = crypto.createHash('sha512').update(user.plainTextPassword).digest('base64');
                        delete user['plainTextPassword'];
                        settingsUpdated = true;
                    }
                    if (user.hasOwnProperty('password')) {
                        this._users.push(user);
                    }
                }
            }
            if (settingsUpdated) {
                this.saveToFile().catch(function (error) {
                    index_1.cprint("saveToFile - " + error.message, chalk.red);
                });
            }
        }
        return this;
    };
    AppConfig.prototype.saveToFile = function () {
        var _this = this;
        var data = JSON.stringify(settings, null, 4);
        return new Promise(function (resolve, reject) {
            fs.writeFile(_this._settingsPath, data, function (error) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(true);
                }
            });
        });
    };
    return AppConfig;
}());
exports.AppConfig = AppConfig;
var statistics = {
    'appId': 1,
    'platform': 3,
    'version': '5.53.1',
    'abtest': '507',
};
var appkey = '1d8b6e7d45233436';
var appSecret = '560c52ccd288fed045859ed18bffd973';
var appCommon = {
    'appkey': appkey,
    'build': 5531000,
    'channel': 'html5_app_bili',
    'device': 'android',
    'mobi_app': 'android',
    'platform': 'android',
    'statistics': JSON.stringify(statistics),
};
var appHeaders = {
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 BiliDroid/5.53.1 (bbcallen@gmail.com)',
};
var webHeaders = {
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
};
