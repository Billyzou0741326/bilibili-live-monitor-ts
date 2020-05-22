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
var crypto = require("crypto");
var chalk = require("chalk");
var index_1 = require("./index");
var index_2 = require("../net/index");
var index_3 = require("../fmt/index");
var index_4 = require("../global/index");
var index_5 = require("../task/index");
var tokenRateLimiter = new index_5.RateLimiter(15, 1000);
var config = new index_4.AppConfig();
var Bilibili = /** @class */ (function (_super) {
    __extends(Bilibili, _super);
    function Bilibili() {
        return _super.call(this) || this;
    }
    // ------------------------------App------------------------------
    Bilibili.login = function (username, password) {
        return Bilibili.obtainLoginKey().then(function (resp) {
            var code = resp.code;
            if (code !== 0) {
                var msg = resp.message || resp.msg || 'Login key error';
                return Promise.reject(new index_1.BilibiliError(msg).withStatus(code));
            }
            // ------------------Compute Encryption------------------
            var hash = resp['data']['hash'];
            var key = resp['data']['key'];
            var encryptionSettings = {
                key: key,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            };
            var hashedPassword = crypto.publicEncrypt(encryptionSettings, Buffer.from("" + hash + password)).toString('base64');
            var data = {};
            Object.assign(data, config.appCommon);
            data['username'] = username;
            data['password'] = hashedPassword;
            data['ts'] = Math.floor(0.001 * new Date().valueOf());
            var payload = Bilibili.parseAppParams(sort(data));
            var request = (index_2.Request.Builder()
                .withHost('passport.bilibili.com')
                .withPath('/api/v3/oauth2/login')
                .withMethod(index_2.Request.POST)
                .withHeaders(config.appHeaders)
                .withData(payload)
                .withContentType('application/x-www-form-urlencoded')
                .build());
            return Bilibili.request(request);
        });
    };
    Bilibili.obtainLoginKey = function () {
        var data = {};
        Object.assign(data, config.appCommon);
        data['appkey'] = config.appkey;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('passport.bilibili.com')
            .withPath('/api/oauth2/getKey')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    Bilibili.sessionInfo = function (session) {
        var access_token = session.app.access_token;
        var params = Object.assign(new Object(), config.appCommon);
        params['access_token'] = access_token;
        params['device'] = 'phone';
        params['buvid'] = config.appHeaders.buvid;
        params['bili_jct'] = session.web.bili_jct;
        params['SESSDATA'] = session.web.SESSDATA;
        params['DedeUserID'] = session.web.DedeUserID;
        params['DedeUserID__ckMd5'] = session.web.DedeUserID__ckMd5;
        params['sid'] = session.web.sid;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(params));
        var request = index_2.Request.Builder().
            withHost('passport.bilibili.com').
            withPath('/api/v3/oauth2/info').
            withMethod(index_2.Request.GET).
            withHeaders(config.appHeaders).
            withParams(payload).
            build();
        return Bilibili.request(request);
        ////////////////////////////// return value ////////////////////////////////
        //// After refreshing / expired, the refresh token and access token
        //// becomes invalid, and it is ILLEGAL to reuse the token
        // {
        //     "message": "您的账号存在高危异常行为，为了您的账号安全，请验证后登录帐号。",
        //     "ts": 1589223636,
        //     "code": 61000
        // }
        //// Otherwise, it's fine
        // {
        //     "ts": 1589225399,
        //     "code": 0,
        //     "data": {
        //         "mid": 26293612,
        //         "access_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx551",
        //         "expires_in": 2587299
        //     }
        // }
    };
    Bilibili.getCookiesFromToken = function (appSession) {
        var _this = this;
        var access_token = '';
        if (typeof appSession === 'string') {
            access_token = appSession;
        }
        else {
            access_token = appSession.access_token;
        }
        var params = Object.assign(new Object(), config.appCommon);
        params['access_key'] = access_token;
        params['domain'] = '.bigfunapp.cn';
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        params['webview_cookie'] = 1;
        var query = Bilibili.parseAppParams(sort(params));
        var request = index_2.Request.Builder().
            withHost('passport.bigfunapp.cn').
            withPath('/api/login/sso').
            withMethod(index_2.Request.GET).
            withHeaders(config.appHeaders).
            withParams(query).
            build();
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var response, headers, cookies;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new index_2.Xhr().request(request)];
                    case 1:
                        response = _a.sent();
                        headers = response.headers;
                        if (typeof headers['set-cookie'] === 'undefined') {
                            return [2 /*return*/, {}];
                        }
                        cookies = index_3.Cookies.parseSetCookie(headers['set-cookie']);
                        return [2 /*return*/, cookies];
                }
            });
        }); })();
        ////////////////////////////// return value ////////////////////////////////
        ////// The access_token has expired or invalidified
        // {
        //     "sid": "xxxxxxxx"
        // }
        //
        ////// Otherwise, all is good
        // {
        //     "sid": "ijy21zh8",
        //     "DedeUserID": "26293612",
        //     "SESSDATA": "5e72c94d%2C1591818209%2C33b6ca51",
        //     "bili_jct": "968c1adc067b2b9296fea53d2acf5664"
        // }
    };
    Bilibili.refreshToken = function (appSession) {
        var access_token = appSession.access_token;
        var refresh_token = appSession.refresh_token;
        var data = Object.assign(new Object(), config.appCommon);
        data['access_token'] = access_token;
        data['refresh_token'] = refresh_token;
        var payload = Bilibili.parseAppParams(sort(data));
        var request = index_2.Request.Builder().
            withHost('passport.bilibili.com').
            withPath('/api/v2/oauth2/refresh_token').
            withMethod(index_2.Request.POST).
            withHeaders(config.appHeaders).
            withData(payload).
            withContentType('application/x-www-form-urlencoded').
            build();
        return Bilibili.request(request);
        ////////////////////////////// return value ////////////////////////////////
        ////// After refreshing, the refresh token and access token becomes
        ////// invalid, and it is ILLEGAL to reuse the tokens for refreshing
        // {
        //     "ts": 1589166077,
        //     "message": "Account is not logined.",
        //     "code": -101
        // }
        //
        ////// A pair of mismatch refresh(access) tokens
        // {
        //     "ts": 1589165904,
        //     "message": "refresh_token not match.",
        //     "code": -903
        // }
        //
        ////// Otherwise, all is good (same return value as oauth2/login)
        // {
        //     "ts": 1589225400,
        //     "code": 0,
        //     "data": {
        //         "token_info": {
        //             "mid": xxxxxxxx,
        //             "access_token": "xxxxxxxxxxxxxxxxxxxxxxxxa53df351",
        //             "refresh_token": "xxxxxxxxxxxxxxxxxxxxxxxx6caeab51",
        //             "expires_in": 2592000
        //         },
        //         "cookie_info": {
        //             "cookies": [
        //                 {
        //                     "name": "bili_jct",
        //                     "value": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "DedeUserID",
        //                     "value": "xxxxxx12",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "DedeUserID__ckMd5",
        //                     "value": "xxxxxxxxxxxxx6eb",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "sid",
        //                     "value": "k5iy6q0w",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "SESSDATA",
        //                     "value": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        //                     "http_only": 1,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 }
        //             ],
        //             "domains": [
        //                 ".bilibili.com",
        //                 ".biligame.com",
        //                 ".im9.com",
        //                 ".bigfunapp.cn"
        //             ]
        //         },
        //         "sso": [
        //             "https://passport.bilibili.com/api/v2/sso",
        //             "https://passport.biligame.com/api/v2/sso",
        //             "https://passport.im9.com/api/v2/sso",
        //             "https://passport.bigfunapp.cn/api/v2/sso"
        //         ],
        //         "is_tourist": false
        //     }
        // }
    };
    /**
     * Gets raffle info in a given room (APP API)
     *
     * @static
     * @param   {Integer}   roomid
     * @returns {Promise}   resolve(json)   reject(String)
     */
    Bilibili.appGetLottery = function (roomid) {
        var data = {};
        Object.assign(data, config.appCommon);
        // data['appkey'] = config.appkey;
        // data['actionKey'] = 'appkey';
        data['roomid'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/lottery/getLotteryInfo')
            .withMethod(index_2.Request.GET)
            .withParams(payload)
            .withHeaders(config.appHeaders)
            .build());
        return Bilibili.request(request);
    };
    /**
     * @static
     * @param   {Object}    session
     * @param   {Object}    giftData
     * @param   {Integer}   giftData.id
     * @param   {Integer}   giftData.roomid
     * @param   {String}    giftData.type
     */
    Bilibili.appJoinGift = function (appSession, giftData) {
        var id = giftData.id, roomid = giftData.roomid, type = giftData.type;
        var access_key = appSession.access_token;
        var data = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['raffleId'] = id;
        data['roomid'] = roomid;
        data['type'] = type;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v4/smalltv/Getaward')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    /**
     * @static
     * @param   {Object}    session
     * @param   {Object}    pkData
     * @param   {Integer}   pkData.id
     * @param   {Integer}   pkData.roomid
     */
    Bilibili.appJoinPK = function (appSession, pkData) {
        var id = pkData.id, roomid = pkData.roomid;
        var access_key = appSession.access_token;
        var data = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['id'] = id;
        data['roomid'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/pk/join')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    /**
     * @static
     * @param   {Object}    session
     * @param   {Object}    guardData
     * @param   {Integer}   guardData.id
     * @param   {Integer}   guardData.roomid
     * @param   {String}    guardData.type
     */
    Bilibili.appJoinGuard = function (appSession, guardData) {
        var id = guardData.id, roomid = guardData.roomid, type = guardData.type;
        var access_key = appSession.access_token;
        var data = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['id'] = id;
        data['roomid'] = roomid;
        data['type'] = type || 'guard';
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v2/Lottery/join')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    /**
     * @static
     * @param   {Object}    session
     * @param   {Object}    stormData
     * @param   {Integer}   stormData.id
     */
    Bilibili.appJoinStorm = function (appSession, stormData) {
        var access_key = appSession.access_token;
        var id = stormData.id;
        var data = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['id'] = id;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/storm/Join')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    // */
    /** 直播间历史模仿 */
    Bilibili.appRoomEntry = function (appSession, roomid) {
        var access_key = appSession.access_token;
        var data = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['jumpFrom'] = 0;
        data['room_id'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/room_entry_action')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    /**
     * Necessary for double-watch
     *
     * @param   session     Object
     * @param   info        Object
     *          roomid      Int     房间号
     */
    Bilibili.appGetInfoByUser = function (appSession, info) {
        var roomid = info.roomid;
        var data = Object.assign(new Object(), config.appCommon);
        data['actionKey'] = 'appkey';
        data['room_id'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        data['access_key'] = appSession.access_token;
        var paramstr = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/app-room/v1/index/getInfoByUser')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build());
        return Bilibili.request(request);
    };
    /**
     * Live Exp / double watch
     *
     * @param   session     Object
     * @param   info        Object
     *          info.roomid Int     房间号
     */
    Bilibili.appLiveOnlineHeart = function (appSession, info) {
        var roomid = info.roomid;
        var data = {
            'room_id': roomid,
            'scale': 'xhdpi',
        };
        var payload = index_3.Params.stringify(data);
        var params = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        var paramstr = Bilibili.parseAppParams(sort(params));
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/heartbeat/v1/OnLine/mobileOnline')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    Bilibili.appGetLiveDanmuConf = function (roomid) {
        var params = Object.assign(new Object(), config.appCommon);
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        if (typeof roomid !== 'undefined') {
            params['room_id'] = roomid;
        }
        var paramstr = Bilibili.parseAppParams(sort(params));
        return new Promise(function (resolve, reject) {
            var request = index_2.Request.Builder().
                withHost('api.live.bilibili.com').
                withPath('/xlive/app-room/v1/index/getDanmuInfo').
                withMethod(index_2.Request.GET).
                withParams(paramstr).
                withHeaders(config.appHeaders).
                build();
            tokenRateLimiter.add(function () {
                Bilibili.request(request).
                    then(function (resp) { resolve(resp); }).
                    catch(function (error) { reject(error); });
            });
        });
    };
    Bilibili.appGetLiveDanmuToken = function (roomid) {
        var _this = this;
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var resp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bilibili.appGetLiveDanmuConf(roomid)];
                    case 1:
                        resp = _a.sent();
                        if (resp['code'] !== 0) {
                            throw new index_1.BilibiliError("live token failed " + (resp['msg'] || resp['message'] || ''));
                        }
                        return [2 /*return*/, resp['data']['token']];
                }
            });
        }); })();
    };
    /**
     * @param   access_key  String
     * @param   info        Object
     *   info.  aid         Int     视频id
     */
    Bilibili.shareVideo = function (appSession, info) {
        var aid = info.aid;
        var access_key = appSession.access_token;
        var data = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['aid'] = aid;
        data['share_channel'] = 'qq';
        data['share_trace_id'] = crypto.randomBytes(16).toString('hex');
        data['from'] = 'main.ugc-video-detail.0.0';
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        var payload = Bilibili.parseAppParams(sort(data));
        var request = (index_2.Request.Builder()
            .withHost('app.bilibili.com')
            .withPath('/x/v2/view/share/complete')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    /**
     * @param   access_key
     * @param   info        Object
     *   info.  group_id    Int     应援团id
     *   info.  owner_id    Int     应援对象id
     */
    Bilibili.loveClubSign = function (appSession, info) {
        var group_id = info.group_id, owner_id = info.owner_id;
        var params = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['group_id'] = group_id;
        params['owner_id'] = owner_id;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        var paramstr = Bilibili.parseAppParams(params);
        var request = (index_2.Request.Builder()
            .withHost('api.vc.bilibili.com')
            .withPath('/link_setting/v1/link_setting/sign_in')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.checkSilverBox = function (appSession) {
        var params = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        var paramstr = Bilibili.parseAppParams(params);
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/lottery/v1/SilverBox/getCurrentTask')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build());
        return Bilibili.request(request);
    };
    /**
     * @param   access_key
     * @param   info        Object
     *          time_start  Int     银瓜子时段起始
     *          time_end    Int     银瓜子时段终末
     */
    Bilibili.getSilverBox = function (appSession, info) {
        var time_start = info.time_start, time_end = info.time_end;
        var params = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['time_start'] = time_start;
        params['time_end'] = time_end;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        var paramstr = Bilibili.parseAppParams(params);
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/lottery/v1/SilverBox/getAward')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build());
        return Bilibili.request(request);
    };
    /** --------------------------WEB----------------------------- */
    Bilibili.mainTaskInfo = function (webSession) {
        var request = (index_2.Request.Builder()
            .withHost('account.bilibili.com')
            .withPath('/home/reward')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.liveTaskInfo = function (webSession) {
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/i/api/taskInfo')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.liveSignInfo = function (webSession) {
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/sign/GetSignInfo')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.liveSign = function (webSession) {
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/sign/doSign')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.webGetInfoByUser = function (webSession, info) {
        var roomid = info.roomid;
        var params = {};
        params['room_id'] = roomid;
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/web-room/v1/index/getInfoByUser')
            .withMethod(index_2.Request.GET)
            .withCookies(webSession)
            .withHeaders(config.webHeaders)
            .withParams(params)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.webLiveOnlineHeart = function (webSession) {
        var data = {
            'csrf': webSession.bili_jct,
            'csrf_token': webSession.bili_jct,
            'visit_id': '',
        };
        var payload = index_3.Params.stringify(data);
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/User/userOnlineHeart')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    Bilibili.liveDoubleWatch = function (webSession) {
        var csrf = webSession.bili_jct;
        var data = {
            'task_id': 'double_watch_task',
            'csrf': csrf,
            'csrf_token': csrf,
        };
        var payload = index_3.Params.stringify(data);
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/activity/v1/task/receive_award')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
    };
    Bilibili.loveClubList = function (webSession) {
        var params = {
            'build': 0,
            'mobi_app': 'web',
        };
        var request = (index_2.Request.Builder()
            .withHost('api.vc.bilibili.com')
            .withPath('/link_group/v1/member/my_groups')
            .withMethod(index_2.Request.GET)
            .withParams(params)
            .withCookies(webSession)
            .withHeaders(config.webHeaders)
            .build());
        return Bilibili.request(request);
    };
    /**
     *
     * @returns     {Promise<any>}      { "code": 0, "message": "0", "ttl": 1 }
     * */
    Bilibili.watchVideo = function (webSession, info, time) {
        if (time === void 0) { time = 0; }
        var aid = info.aid, cid = info.cid;
        var data = {};
        data['cid'] = cid;
        data['aid'] = aid;
        data['mid'] = (webSession && webSession.DedeUserID) || '';
        data['played_time'] = time;
        data['real_time'] = time;
        data['type'] = 3;
        data['dt'] = 2;
        data['play_type'] = 0;
        data['start_ts'] = Math.floor(0.001 * new Date().valueOf()) - data['played_time'];
        var payload = index_3.Params.stringify(data);
        var preRequest = (index_2.Request.Builder()
            .withHost('api.bilibili.com')
            .withPath('/x/report/web/heartbeat')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.webHeaders)
            .withContentType('application/x-www-form-urlencoded')
            .withData(payload));
        if (webSession) {
            preRequest = preRequest.withCookies(webSession);
        }
        var request = preRequest.build();
        return Bilibili.request(request);
    };
    /**
     * Get all rooms from sailboat API
     *
     * @static
     * @returns {Promise}   resolve(json)   reject(String)
     */
    Bilibili.getAllSailboatRooms = function () {
        var MAX_PAGES = 3;
        var promises = [];
        for (var page = 1; page <= MAX_PAGES; ++page) {
            var task = (Bilibili.getSailboatRooms(page)
                .then(function (jsonObj) {
                var entryList = jsonObj['data']['list'];
                var roomids = entryList.map(function (entry) { return entry['roomid']; });
                return roomids;
            })
                .catch(function (error) {
                index_3.cprint("Bilibili.getSailboatRooms - " + error.message, chalk.red);
                return Promise.resolve([]);
            }));
            promises.push(task);
        }
        var result = Promise.all(promises).then(function (lists) {
            var _a;
            var finalList = (_a = []).concat.apply(_a, lists);
            return finalList;
        });
        return result;
    };
    /**
     * Get rooms from sailboat rank API
     *
     * @static
     * @param   {Integer}   page    - page of the API, valid values: [1,2,3]
     * @returns {Promise}   resolve(json)   reject(Error)
     */
    Bilibili.getSailboatRooms = function (page) {
        // Page 1-3 (Rank 0-50)
        var PAGE_SIZE = 20; // 必须是20
        var params = {
            'type': 'sail_boat_number',
            'page': page,
            'is_trend': 1,
            'page_size': PAGE_SIZE,
        };
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(index_2.Request.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build());
        return Bilibili.request(request);
    };
    /**
     * Get rooms from genki rank API
     *
     * @static
     * @returns     {Promise}   resolve(json)   reject(String)
     */
    Bilibili.getAllGenkiRooms = function () {
        var MAX_PAGES = 3;
        var promises = [];
        for (var page = 1; page <= MAX_PAGES; ++page) {
            var task = (Bilibili.getGenkiRooms(page)
                .then(function (jsonObj) {
                var entryList = jsonObj['data']['list'];
                var roomids = entryList.map(function (entry) { return entry['roomid']; });
                return roomids;
            })
                .catch(function (error) {
                index_3.cprint("Bilibili.getGenkiRooms - " + error.message, chalk.red);
                return Promise.resolve([]);
            }));
            promises.push(task);
        }
        var result = Promise.all(promises).then(function (lists) {
            var _a;
            var finalList = (_a = []).concat.apply(_a, lists);
            return finalList;
        });
        return result;
    };
    /**
     * Get rooms from genki rank API
     *
     * @static
     * @param   {Integer}   page    - page of API
     * @returns {Promise}   resolve(json)  reject(Error)
     */
    Bilibili.getGenkiRooms = function (page) {
        var PAGE_SIZE = 20;
        var params = {
            'date': 'month',
            'type': 'master_vitality_2018',
            'areaid': 0,
            'page': page,
            'is_trend': 1,
            'page_size': PAGE_SIZE,
        };
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(index_2.Request.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.webGetLiveDanmuConf = function (roomid) {
        var params = {
            'platform': 'pc',
            'player': 'web',
        };
        if (typeof roomid !== 'undefined') {
            params['room_id'] = roomid;
        }
        return new Promise(function (resolve, reject) {
            var request = index_2.Request.Builder().
                withHost('api.live.bilibili.com').
                withPath('/room/v1/Danmu/getConf').
                withMethod(index_2.Request.GET).
                withParams(params).
                withHeaders(config.webHeaders).
                build();
            tokenRateLimiter.add(function () {
                Bilibili.request(request).
                    then(function (resp) { resolve(resp); }).
                    catch(function (error) { reject(error); });
            });
        });
    };
    Bilibili.webGetLiveDanmuToken = function (roomid) {
        var _this = this;
        return (function () { return __awaiter(_this, void 0, void 0, function () {
            var resp;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Bilibili.webGetLiveDanmuConf(roomid)];
                    case 1:
                        resp = _a.sent();
                        if (resp['code'] !== 0) {
                            throw new index_1.BilibiliError("live token failed " + (resp['msg'] || resp['message'] || ''));
                        }
                        return [2 /*return*/, resp['data']['token']];
                }
            });
        }); })();
    };
    /**
     * Get number of rooms streaming
     *
     * @static
     * @returns {Promise}   resolve(Integer)    reject(String)
     */
    Bilibili.getLiveCount = function (areaid) {
        if (areaid === void 0) { areaid = 0; }
        if (![0, 1, 2, 3, 4, 5, 6, 7].includes(areaid)) {
            areaid = 0;
        }
        var params = {
            'parent_area_id': areaid,
            'page': 1,
            'page_size': 1,
            'sort_type': 'live_time',
        };
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v3/area/getRoomList')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.webHeaders)
            .withParams(params)
            .build());
        return Bilibili.request(request).then(function (jsonObj) {
            var count = jsonObj['data']['count'];
            return count;
        });
    };
    /**
     * Get basic info of a room
     *
     * @static
     * @param       {Integer}   roomid
     * @returns     {Promise}   resolve(json)   reject(Error)
     */
    Bilibili.getRoomInfo = function (roomid) {
        var params = {
            'room_id': roomid,
        };
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/web-room/v1/index/getInfoByRoom')
            .withMethod(index_2.Request.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build());
        return Bilibili.request(request);
    };
    /**
     * Check if a room is streaming
     *
     * @static
     * @param   {Integer}   roomid
     * @returns {Promise}   resolve(boolean)    reject(String)
     */
    Bilibili.isLive = function (roomid) {
        return Bilibili.getRoomInfo(roomid).then(function (jsonObj) {
            var isLive = jsonObj['data']['room_info']['live_status'] === 1 ? true : false;
            return isLive;
        });
    };
    /**
     * Get streaming roomd in area ``areaid``
     *
     * @static
     * @param   {Integer}   areaid
     * @param   {Integer}   size
     * @param   {Integer}   count
     * @returns {Promise}   resolve([ { 'roomid': roomid, 'online': online }, ... ])
     */
    Bilibili.getRoomsInArea = function (areaid, size, count, sortType) {
        if (size === void 0) { size = 99; }
        if (count === void 0) { count = Infinity; }
        if (sortType === void 0) { sortType = 'online'; }
        var page_size = size > 99 || size < 0 ? 99 : size;
        var ok_sort_types = ['live_time', 'online', 'sort_type_169'];
        if (!ok_sort_types.includes(sortType)) {
            sortType = ok_sort_types[0];
        }
        var promises = [];
        var promise = Bilibili.getLiveCount(areaid).catch(function (error) {
            index_3.cprint("Bilibili.getLiveCount - " + error.message, chalk.red);
            return Promise.resolve(5000); // on error return 5000
        }).then(function (room_count) {
            room_count = Math.min(count, room_count);
            var PAGES = Math.ceil(room_count / page_size) + (count === Infinity ? 1 : 0); // If querying all rooms, add one page to query
            for (var i = 1; i <= PAGES; ++i) {
                var params = {
                    'parent_area_id': areaid,
                    'page': i,
                    'page_size': page_size,
                    'sort_type': sortType,
                };
                var request = (index_2.Request.Builder()
                    .withHost('api.live.bilibili.com')
                    .withPath('/room/v3/area/getRoomList')
                    .withMethod(index_2.Request.GET)
                    .withParams(params)
                    .withHeaders(config.webHeaders)
                    .build());
                var task = (Bilibili.request(request)
                    .then(function (jsonObj) {
                    var code = jsonObj['code'];
                    if (code !== 0) {
                        var msg = jsonObj['message'] || jsonObj['msg'] || 'Error getting rooms';
                        return Promise.reject(new index_1.BilibiliError(msg).withStatus(code));
                    }
                    var roomInfo = jsonObj['data']['list'].map(function (entry) {
                        return {
                            'roomid': entry['roomid'],
                            'online': entry['online'],
                        };
                    });
                    return Promise.resolve(roomInfo);
                })
                    .catch(function (error) {
                    index_3.cprint("Bilibili.getRoomsInArea - " + error.message, chalk.red);
                    return Promise.resolve([]);
                }));
                promises.push(task);
            }
            var roomInfos = [];
            return Promise.all(promises).then(function (roomInfoLists) {
                var _a;
                var roomInfos = (_a = []).concat.apply(_a, roomInfoLists);
                return roomInfos;
            });
        });
        return promise;
    };
    /**
     * Get rooms in each of the six areas
     *
     * @static
     * @returns     {Promise}   resolve([ Array(Integer), Array(Integer), ... ])    reject(String)
     */
    Bilibili.getRoomsInEachArea = function () {
        var params = {
            'parent_area_id': 0,
            'page': 1,
            'page_size': 10,
            'sort_type': 'online',
        };
        var areas = [1, 2, 3, 4, 5, 6,];
        var promises = [];
        for (var _i = 0, areas_1 = areas; _i < areas_1.length; _i++) {
            var areaid = areas_1[_i];
            params['parent_area_id'] = areaid;
            var request = (index_2.Request.Builder()
                .withHost('api.live.bilibili.com')
                .withPath('/room/v3/area/getRoomList')
                .withMethod(index_2.Request.GET)
                .withHeaders(config.webHeaders)
                .withParams(params)
                .build());
            promises.push(Bilibili.request(request));
        }
        return promises; // a list of promises, each element is list of rooms in an area
    };
    Bilibili.sendDanmu = function (webSession, danmu) {
        var data = {
            'color': 0xFFFFFF,
            'fontsize': 25,
            'mode': 1,
            'msg': danmu.msg,
            'rnd': Math.floor(0.001 * new Date().valueOf()),
            'roomid': danmu.roomid,
            'bubble': 0,
            'csrf': webSession.bili_jct,
            'csrf_token': webSession.bili_jct,
        };
        var payload = index_3.Params.stringify(data);
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/msg/send')
            .withMethod(index_2.Request.POST)
            .withContentType('application/x-www-form-urlencoded')
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.isLoggedIn = function (webSession) {
        var request = (index_2.Request.Builder()
            .withHost('account.bilibili.com')
            .withPath('/home/userInfo')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.startLive = function (webSession, info) {
        var data = {};
        data['room_id'] = info.roomid;
        data['area_v2'] = info.areaid;
        data['platform'] = 'pc';
        data['csrf'] = webSession.bili_jct;
        data['csrf_token'] = webSession.bili_jct;
        var payload = index_3.Params.stringify(data);
        var request = (index_2.Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/startLive')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .build());
        return Bilibili.request(request);
    };
    /**
     *
     * @returns     {Promise<any>}      { "code": 0, "message": "0", "data": { aid: 0, cid: 0, title: "", pubdate: 0, ... } }
     * */
    Bilibili.videoInfo = function (aid) {
        var data = {};
        data['aid'] = aid;
        var request = (index_2.Request.Builder()
            .withHost('api.bilibili.com')
            .withPath('/x/web-interface/view')
            .withMethod(index_2.Request.GET)
            .withHeaders(config.webHeaders)
            .withParams(data)
            .build());
        return Bilibili.request(request);
    };
    /**
     *
     * @returns     {Promise<any>}      { "code": 0, "message": "0", "ttl": 1 }
     * */
    Bilibili.clickVideo = function (info) {
        var aid = info.aid, cid = info.cid;
        var data = {};
        data['cid'] = cid;
        data['aid'] = aid;
        data['mid'] = '';
        data['part'] = 1;
        data['lv'] = 0;
        data['stime'] = Math.floor(0.001 * new Date().valueOf());
        data['ftime'] = Math.floor(data['stime'] - 3);
        data['jsonp'] = 'jsonp';
        data['type'] = 3;
        data['sub_type'] = 0;
        var payload = index_3.Params.stringify(data);
        var request = (index_2.Request.Builder()
            .withHost('api.bilibili.com')
            .withPath('/x/click-interface/click/web/h5')
            .withMethod(index_2.Request.POST)
            .withHeaders(config.webHeaders)
            .withContentType('application/x-www-form-urlencoded')
            .withData(payload)
            .build());
        return Bilibili.request(request);
    };
    Bilibili.appSign = function (str) {
        return crypto.createHash('md5').update(str + config.appSecret).digest('hex');
    };
    Bilibili.parseAppParams = function (params) {
        var presigned = index_3.Params.stringify(params);
        var signature = Bilibili.appSign(presigned);
        return presigned + "&sign=" + signature;
    };
    return Bilibili;
}(index_1.BilibiliBase));
exports.Bilibili = Bilibili;
function sort(obj) {
    var sorted = Object.create(null);
    Object.keys(obj).sort().forEach(function (key) {
        sorted[key] = obj[key];
    });
    return sorted;
}
