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
var crypto = require("crypto");
var chalk = require("chalk");
var index_1 = require("../net/index");
var index_2 = require("../fmt/index");
var index_3 = require("../bilibili/index");
var index_4 = require("../global/index");
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
                return Promise.reject(new index_3.BilibiliError(msg).withStatus(code));
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
            var request = (index_1.RequestBuilder.start()
                .withHost('passport.bilibili.com')
                .withPath('/api/v3/oauth2/login')
                .withMethod(index_1.RequestMethods.POST)
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
        var request = (index_1.RequestBuilder.start()
            .withHost('passport.bilibili.com')
            .withPath('/api/oauth2/getKey')
            .withMethod(index_1.RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build());
        return Bilibili.request(request);
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
        var request = (index_1.RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/lottery/getLotteryInfo')
            .withMethod(index_1.RequestMethods.GET)
            .withParams(payload)
            .withHeaders(config.appHeaders)
            .build());
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
                index_2.cprint("Bilibili.getSailboatRooms - " + error.message, chalk.red);
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
        var request = (index_1.RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(index_1.RequestMethods.GET)
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
                index_2.cprint("Bilibili.getGenkiRooms - " + error.message, chalk.red);
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
        var request = (index_1.RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(index_1.RequestMethods.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build());
        return Bilibili.request(request);
    };
    /**
     * Get number of rooms streaming
     *
     * @static
     * @returns {Promise}   resolve(Integer)    reject(String)
     */
    Bilibili.getLiveCount = function () {
        var params = {
            'parent_area_id': 0,
            'page': 1,
            'page_size': 1,
            'sort_type': 'live_time',
        };
        var request = (index_1.RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v3/area/getRoomList')
            .withMethod(index_1.RequestMethods.GET)
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
            'id': roomid,
        };
        var request = (index_1.RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/room_init')
            .withMethod(index_1.RequestMethods.GET)
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
            var isLive = jsonObj['data']['live_status'] === 1 ? true : false;
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
    Bilibili.getRoomsInArea = function (areaid, size, count) {
        if (size === void 0) { size = 99; }
        if (count === void 0) { count = Infinity; }
        var page_size = size;
        var params = {
            'parent_area_id': areaid,
            'page': 0,
            'page_size': size > 99 || size < 0 ? 99 : size,
            'sort_type': 'live_time',
        };
        var promises = [];
        var promise = Bilibili.getLiveCount().catch(function (error) {
            index_2.cprint("Bilibili.getLiveCount - " + error.message, chalk.red);
            return Promise.resolve(5000); // on error return 5000
        }).then(function (room_count) {
            room_count = Math.min(count, room_count);
            var PAGES = Math.round(room_count / page_size) + 2;
            for (var i = 1; i < PAGES; ++i) {
                var p = Object.assign(new Object(), params);
                p.page = i;
                var request = (index_1.RequestBuilder.start()
                    .withHost('api.live.bilibili.com')
                    .withPath('/room/v3/area/getRoomList')
                    .withMethod(index_1.RequestMethods.GET)
                    .withParams(p)
                    .withHeaders(config.webHeaders)
                    .build());
                var task = (Bilibili.request(request)
                    .then(function (jsonObj) {
                    var code = jsonObj['code'];
                    if (code !== 0) {
                        var msg = jsonObj['message'] || jsonObj['msg'] || 'Error getting rooms';
                        return Promise.reject(new index_3.BilibiliError(msg).withStatus(code));
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
                    index_2.cprint("Bilibili.getRoomsInArea - " + error.message, chalk.red);
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
        areas.forEach(function (areaid) {
            params['parent_area_id'] = areaid;
            var request = (index_1.RequestBuilder.start()
                .withHost('api.live.bilibili.com')
                .withPath('/room/v3/area/getRoomList')
                .withMethod(index_1.RequestMethods.GET)
                .withHeaders(config.webHeaders)
                .withParams(params)
                .build());
            promises.push(Bilibili.request(request));
        });
        return promises; // a list of promises, each element is list of rooms in an area
    };
    Bilibili.appSign = function (str) {
        return crypto.createHash('md5').update(str + config.appSecret).digest('hex');
    };
    Bilibili.parseAppParams = function (params) {
        var presigned = index_2.Params.stringify(params);
        var signature = Bilibili.appSign(presigned);
        return presigned + "&sign=" + signature;
    };
    return Bilibili;
}(index_3.BilibiliBase));
exports.Bilibili = Bilibili;
function sort(obj) {
    var sorted = Object.create(null);
    Object.keys(obj).sort().forEach(function (key) {
        sorted[key] = obj[key];
    });
    return sorted;
}
