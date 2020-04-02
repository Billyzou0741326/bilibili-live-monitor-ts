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
var net = require("net");
var chalk = require("chalk");
var events_1 = require("events");
var index_1 = require("../fmt/index");
var index_2 = require("../bilibili/index");
var index_3 = require("../global/index");
var index_4 = require("../task/index");
var index_5 = require("./index");
var AbstractDanmuTCP = /** @class */ (function (_super) {
    __extends(AbstractDanmuTCP, _super);
    function AbstractDanmuTCP(addr, info) {
        var _this = _super.call(this) || this;
        _this.bind();
        _this._host = addr.host || '127.0.0.1';
        _this._port = addr.port;
        _this._roomid = info.roomid;
        _this._areaid = info.areaid || 0;
        _this._running = false;
        _this._closedByUs = false;
        _this._socket = null;
        _this._remoteAddr = '';
        _this._lastRead = new Date();
        _this._healthTask = new index_4.RecurrentTask();
        _this._heartbeatTask = new index_4.RecurrentTask();
        _this._reader = new DanmuTCPReader();
        _this._heartbeat = _this.prepareData(2);
        _this._handshake = _this.prepareData(7, JSON.stringify({
            roomid: _this.roomid,
            platform: 'web',
            clientver: '1.8.12',
        }));
        var sendHeartBeat = function () {
            _this._socket && _this._socket.write(_this._heartbeat);
        };
        var closeAfterInactivity = function () {
            if (_this._running) {
                if (new Date().valueOf() - _this._lastRead.valueOf() > 35000) {
                    _this.close(false);
                }
            }
        };
        _this._heartbeatTask.withTime(30 * 1000).withCallback(sendHeartBeat);
        _this._healthTask.withTime(10 * 1000).withCallback(closeAfterInactivity);
        return _this;
    }
    AbstractDanmuTCP.prototype.bind = function () {
        this.onConnect = this.onConnect.bind(this);
        this.onData = this.onData.bind(this);
        this.onEnd = this.onEnd.bind(this);
        this.onError = this.onError.bind(this);
        this.onClose = this.onClose.bind(this);
    };
    Object.defineProperty(AbstractDanmuTCP.prototype, "running", {
        get: function () {
            return this._running;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractDanmuTCP.prototype, "roomid", {
        get: function () {
            return this._roomid;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractDanmuTCP.prototype, "areaid", {
        get: function () {
            return this._areaid;
        },
        enumerable: true,
        configurable: true
    });
    AbstractDanmuTCP.prototype.start = function () {
        if (this._running === false) {
            this._running = true;
            this._closedByUs = false;
            this.connect();
        }
    };
    AbstractDanmuTCP.prototype.stop = function () {
        if (this._running === true) {
            this.close();
            this._running = false;
        }
    };
    AbstractDanmuTCP.prototype.destroy = function () {
        this.removeAllListeners();
        this.stop();
    };
    AbstractDanmuTCP.prototype.connect = function () {
        var options = {
            port: this._port,
            host: this._host,
        };
        if (this._socket === null) {
            this._socket = net.createConnection(options);
        }
        if (this._socket !== null) {
            this._socket.setKeepAlive(true);
            this._socket.on('connect', this.onConnect);
            this._socket.on('data', this.onData);
            this._socket.on('end', this.onEnd);
            this._socket.on('error', this.onError);
            this._socket.on('close', this.onClose);
        }
    };
    AbstractDanmuTCP.prototype.reset = function () {
        this._heartbeatTask.stop();
        this._healthTask.stop();
        if (this._socket !== null) {
            this._socket.unref().destroy();
            this._socket = null;
        }
        this._reader = new DanmuTCPReader();
        this._running = false;
    };
    AbstractDanmuTCP.prototype.onConnect = function () {
        this._healthTask.start();
        this._remoteAddr = (this._socket && this._socket.remoteAddress) || '';
        this._socket && this._socket.write(this._handshake);
    };
    AbstractDanmuTCP.prototype.close = function (closedByUs) {
        if (closedByUs === void 0) { closedByUs = true; }
        this._closedByUs = closedByUs;
        if (this._socket !== null) {
            this._socket.unref().destroy();
            this._socket = null;
        }
    };
    AbstractDanmuTCP.prototype.onClose = function (hadError) {
        this.reset();
        if (this._closedByUs === false) {
            this.start();
        }
        else {
            this.emit('close', this);
        }
    };
    AbstractDanmuTCP.prototype.onData = function (data) {
        this._lastRead = new Date();
        this._reader.onData(data);
        var messages = this._reader.getMessages();
        try {
            for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
                var msg = messages_1[_i];
                this.onMessage(msg);
            }
        }
        catch (error) {
            // Close, reset
            this.close(false);
        }
    };
    AbstractDanmuTCP.prototype.onMessage = function (data) {
        var totalLen = data.readUInt32BE(0);
        var headerLen = data.readUInt16BE(4);
        var cmd = data.readUInt32BE(8);
        var jsonStr = '';
        var msg = {};
        switch (cmd) {
            case 3:
                var popularity = data.readUInt32BE(headerLen);
                this.onPopularity(popularity);
                break;
            case 5:
                jsonStr = data.toString('utf8', headerLen, totalLen);
                msg = JSON.parse(jsonStr);
                this.processMsg(msg);
                break;
            case 8:
                if (this._heartbeatTask.running === false) {
                    this._socket && this._socket.write(this._heartbeat);
                    this._heartbeatTask.start();
                }
                break;
        }
    };
    AbstractDanmuTCP.prototype.onEnd = function () {
    };
    AbstractDanmuTCP.prototype.onError = function (error) {
        if (config.tcp_error) {
            var roomid = "" + this.roomid;
            index_1.cprint("(TCP) @" + roomid.padEnd(13) + " " + this._remoteAddr + " - " + error.message, chalk.red);
        }
    };
    /**
     * @param   {Integer}   popularity  - # watching stream
     */
    AbstractDanmuTCP.prototype.onPopularity = function (popularity) {
        return popularity;
    };
    AbstractDanmuTCP.prototype.prepareData = function (cmd, msg) {
        if (msg === void 0) { msg = ''; }
        var body = Buffer.from(msg, 'utf8');
        var headerLen = 16;
        var totalLen = headerLen + body.length;
        var header = Buffer.alloc(16);
        header.writeUInt32BE(totalLen, 0);
        header.writeUInt16BE(headerLen, 4);
        header.writeUInt16BE(1, 6);
        header.writeUInt32BE(cmd, 8);
        header.writeUInt32BE(1, 12);
        var buffer = Buffer.concat([header, body]);
        return buffer;
    };
    return AbstractDanmuTCP;
}(events_1.EventEmitter));
exports.AbstractDanmuTCP = AbstractDanmuTCP;
var DanmuTarget;
(function (DanmuTarget) {
    DanmuTarget[DanmuTarget["GIFT"] = 1] = "GIFT";
    DanmuTarget[DanmuTarget["GUARD"] = 2] = "GUARD";
    DanmuTarget[DanmuTarget["STORM"] = 4] = "STORM";
    DanmuTarget[DanmuTarget["ANCHOR"] = 8] = "ANCHOR";
    DanmuTarget[DanmuTarget["NOTICE"] = 16] = "NOTICE";
    DanmuTarget[DanmuTarget["DANMU"] = 32] = "DANMU";
})(DanmuTarget || (DanmuTarget = {}));
var DanmuTCP = /** @class */ (function (_super) {
    __extends(DanmuTCP, _super);
    function DanmuTCP(addr, info, targets) {
        if (targets === void 0) { targets = 255; }
        var _this = _super.call(this, addr, info) || this;
        _this.targets = targets;
        _this._peak_popularity = 0;
        return _this;
    }
    DanmuTCP.prototype.processMsg = function (msg) {
        if (msg['scene_key']) {
            msg = msg['msg'];
        }
        var cmd = msg['cmd'];
        switch (cmd) {
            case 'DANMU_MSG':
                if ((this.targets & DanmuTarget.DANMU) === DanmuTarget.DANMU)
                    this.onDanmu(msg);
                break;
            case 'GUARD_LOTTERY_START':
                if ((this.targets & DanmuTarget.GUARD) === DanmuTarget.GUARD)
                    this.onGuard(msg);
                break;
            case 'TV_START':
                if ((this.targets & DanmuTarget.GIFT) === DanmuTarget.GIFT)
                    this.onTV(msg);
                break;
            case 'RAFFLE_START':
                if ((this.targets & DanmuTarget.GIFT) === DanmuTarget.GIFT)
                    this.onRaffle(msg);
                break;
            case 'SPECIAL_GIFT':
                if ((this.targets & DanmuTarget.STORM) === DanmuTarget.STORM)
                    this.onSpecialGift(msg);
                break;
            case 'PK_LOTTERY_START':
                if ((this.targets & DanmuTarget.GIFT) === DanmuTarget.GIFT)
                    this.onPkLottery(msg);
                break;
            case 'ANCHOR_LOT_START':
                if ((this.targets & DanmuTarget.ANCHOR) === DanmuTarget.ANCHOR)
                    this.onAnchorLottery(msg);
                break;
            case 'NOTICE_MSG':
                if ((this.targets & DanmuTarget.NOTICE) === DanmuTarget.NOTICE)
                    this.onNoticeMsg(msg);
                break;
            case 'PREPARING':
                this.onPreparing(msg);
                break;
            case 'ROOM_CHANGE':
                this.onRoomChange(msg);
                break;
            case 'PREPARING':
                this.onPreparing(msg);
                break;
            case 'LIVE':
                this.onLive(msg);
                break;
            default:
                break;
        }
    };
    DanmuTCP.prototype.onDanmu = function (msg) {
        var data = msg['info'];
        var dataOk = typeof data !== 'undefined';
        var result = null;
        if (dataOk) {
            var msg_1 = data[1];
            var uid = data[2][0];
            var sender = data[2][1];
            var time = data[9]['ts'];
            result = {
                uid: uid,
                msg: msg_1,
                sender: sender,
                time: time,
            };
        }
        return result;
    };
    /**
     * @param   {Object}    msg
     * @param   {String}    msg.cmd
     * @param   {Object}    msg.data
     * @param   {Integer}   msg.data.raffleId
     * @param   {Integer}   msg.data.time
     * @param   {Integer}   msg.data.time_wait
     * @param   {String}    msg.data.type
     * @param   {String}    msg.data.title
     * @returns {Raffle|null} gift info
     */
    DanmuTCP.prototype.onRaffle = function (msg) {
        var data = msg['data'];
        var dataOk = typeof data !== 'undefined';
        var gift = null;
        if (dataOk) {
            var t = data['type'];
            var id = data['raffleId'];
            var name_1 = data['title'] || '未知';
            var wait = data['time_wait'] > 0 ? data['time_wait'] : 0;
            var expireAt = data['time'] + Math.floor(0.001 * new Date().valueOf());
            gift = new index_5.Gift()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name_1)
                .withWait(wait)
                .withExpireAt(expireAt);
        }
        return gift;
    };
    /**
     * @param   {Object}    msg
     * @param   {String}    msg.cmd
     * @param   {Object}    msg.data
     * @param   {Integer}   msg.data.raffleId
     * @param   {Integer}   msg.data.time
     * @param   {Integer}   msg.data.time_wait
     * @param   {String}    msg.data.type
     * @param   {String}    msg.data.title
     * @returns {Raffle|null}
     */
    DanmuTCP.prototype.onTV = function (msg) {
        var data = msg['data'];
        var dataOk = typeof data !== 'undefined';
        var gift = null;
        if (dataOk) {
            var t = data['type'];
            var id = data['raffleId'];
            var name_2 = data['title'] || '未知';
            var wait = data['time_wait'] > 0 ? data['time_wait'] : 0;
            var expireAt = data['time'] + Math.floor(0.001 * new Date().valueOf());
            gift = new index_5.Gift()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name_2)
                .withWait(wait)
                .withExpireAt(expireAt);
        }
        return gift;
    };
    /**
     * @param   {Object}    msg
     * @param   {String}    msg.cmd
     * @param   {Object}    msg.data
     * @param   {Integer}   msg.data.id
     * @param   {Integer}   msg.data.privilege_type
     * @param   {String}    msg.data.type
     * @param   {Object}    msg.data.lottery
     * @param   {Integer}   msg.data.lottery.time
     * @returns {Guard|null}
     */
    DanmuTCP.prototype.onGuard = function (msg) {
        var data = msg['data'];
        var dataOk = typeof data !== 'undefined';
        var nameOfType = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };
        var guard = null;
        if (dataOk) {
            var lottery = data['lottery'] || {};
            var lotteryOk = typeof lottery !== 'undefined';
            var t = data['type'];
            var id = data['id'];
            var name_3 = nameOfType[data['privilege_type']];
            var expireAt = (lottery['time'] || 0) + Math.floor(0.001 * new Date().valueOf());
            guard = new index_5.Guard()
                .withId(id)
                .withRoomid(this.roomid)
                .withType(t)
                .withName(name_3)
                .withExpireAt(expireAt);
        }
        return guard;
    };
    /**
     * @returns     {Raffle|null}
     */
    DanmuTCP.prototype.onSpecialGift = function (msg) {
        var data = msg['data'];
        var dataOk = typeof data !== 'undefined';
        if (!dataOk)
            return null;
        var info = data['39'];
        var infoOk = typeof info !== 'undefined';
        if (!infoOk)
            return null;
        var details = null;
        if (info['action'] === 'start') {
            var id = info['id'];
            var expireAt = info['time'] + Math.floor(0.001 * new Date().valueOf());
            details = new index_5.Storm()
                .withId(id)
                .withRoomid(this.roomid)
                .withType('storm')
                .withName('节奏风暴')
                .withExpireAt(expireAt);
        }
        return details;
    };
    /**
     * @returns     {Raffle|null}
     */
    DanmuTCP.prototype.onPkLottery = function (msg) {
        var data = msg['data'];
        var dataOk = typeof data !== 'undefined';
        var pk = null;
        if (dataOk) {
            var id = data['id'];
            var roomid = data['room_id'];
            var expireAt = data['time'] + Math.floor(0.001 * new Date().valueOf());
            pk = new index_5.PK()
                .withId(id)
                .withRoomid(roomid)
                .withType('pk')
                .withName('大乱斗')
                .withExpireAt(expireAt);
        }
        return pk;
    };
    /**
     * @returns     {Raffle|null}
     */
    DanmuTCP.prototype.onAnchorLottery = function (msg) {
        var data = msg['data'];
        var dataOk = typeof data !== 'undefined';
        var details = null;
        if (dataOk) {
            var id = data['id'];
            var roomid = data['room_id'];
            var name_4 = data['award_name'];
            var award_num = data['award_num'];
            var gift_name = data['gift_name'];
            var gift_num = data['gift_num'];
            var gift_price = data['gift_price'];
            var require_text = data['require_text'];
            var danmu = data['danmu'];
            var expireAt = data['time'] + Math.floor(0.001 * new Date().valueOf());
            details = new index_5.Anchor()
                .withId(id)
                .withRoomid(roomid)
                .withGiftPrice(gift_price)
                .withGiftName(gift_name)
                .withGiftNum(gift_num)
                .withDanmu(danmu)
                .withRequirement(require_text)
                .withName(name_4)
                .withAwardNum(award_num)
                .withType('anchor')
                .withExpireAt(expireAt);
        }
        return details;
    };
    DanmuTCP.prototype.onNoticeMsg = function (msg) {
    };
    DanmuTCP.prototype.onPreparing = function (msg) {
    };
    DanmuTCP.prototype.onLive = function (msg) {
    };
    DanmuTCP.prototype.onRoomChange = function (msg) {
    };
    DanmuTCP.prototype.onPopularity = function (popularity) {
        var result = _super.prototype.onPopularity.call(this, popularity);
        this._peak_popularity = Math.max(this._peak_popularity, popularity);
        this._peak_popularity = this._peak_popularity || 0;
        return result;
    };
    return DanmuTCP;
}(AbstractDanmuTCP));
exports.DanmuTCP = DanmuTCP;
var DanmuMonitor = /** @class */ (function (_super) {
    __extends(DanmuMonitor, _super);
    function DanmuMonitor(addr, info) {
        return _super.call(this, addr, info, DanmuTarget.DANMU) || this;
    }
    DanmuMonitor.prototype.onDanmu = function (msg) {
        var data = _super.prototype.onDanmu.call(this, msg);
        if (data !== null) {
            this.emit('danmu', data);
        }
        return data;
    };
    return DanmuMonitor;
}(DanmuTCP));
exports.DanmuMonitor = DanmuMonitor;
var FixedGuardMonitor = /** @class */ (function (_super) {
    __extends(FixedGuardMonitor, _super);
    function FixedGuardMonitor(addr, info) {
        var _this = this;
        var targets = (DanmuTarget.GIFT
            | DanmuTarget.GUARD
            | DanmuTarget.STORM
            | DanmuTarget.ANCHOR);
        _this = _super.call(this, addr, info, targets) || this;
        _this._delayedTasks = [];
        return _this;
    }
    FixedGuardMonitor.prototype.destroy = function () {
        _super.prototype.destroy.call(this);
        this._delayedTasks.forEach(function (task) { return task.stop(); });
        this._delayedTasks = [];
    };
    FixedGuardMonitor.prototype.onAnchorLottery = function (msg) {
        var data = _super.prototype.onAnchorLottery.call(this, msg);
        if (data !== null) {
            this.emit('anchor', data);
        }
        return data;
    };
    FixedGuardMonitor.prototype.onTV = function (msg) {
        var _this = this;
        var data = _super.prototype.onTV.call(this, msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            var t = new index_4.DelayedTask();
            t.withTime(data.wait * 1000).withCallback(function () { _this.emit('gift', data); });
            t.start();
        }
        return data;
    };
    FixedGuardMonitor.prototype.onRaffle = function (msg) {
        var _this = this;
        var data = _super.prototype.onRaffle.call(this, msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            var t = new index_4.DelayedTask();
            t.withTime(data.wait * 1000).withCallback(function () { _this.emit('gift', data); });
            t.start();
        }
        return data;
    };
    FixedGuardMonitor.prototype.onPkLottery = function (msg) {
        var data = _super.prototype.onPkLottery.call(this, msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('pk', data);
        }
        return data;
    };
    FixedGuardMonitor.prototype.onGuard = function (msg) {
        var data = _super.prototype.onGuard.call(this, msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('guard', data);
        }
        return data;
    };
    FixedGuardMonitor.prototype.onSpecialGift = function (msg) {
        var data = _super.prototype.onSpecialGift.call(this, msg);
        if (data !== null) {
            this.emit('add_to_db', this.roomid);
            this.emit('storm', data);
        }
        return data;
    };
    return FixedGuardMonitor;
}(DanmuTCP));
exports.FixedGuardMonitor = FixedGuardMonitor;
var DynamicGuardMonitor = /** @class */ (function (_super) {
    __extends(DynamicGuardMonitor, _super);
    function DynamicGuardMonitor(addr, info) {
        var _this = _super.call(this, addr, info) || this;
        _this._offTimes = 0;
        _this._newAnchorCount = 0;
        _this._newGuardCount = 0;
        _this._newStormCount = 0;
        _this._newGiftCount = 0;
        _this._toFixed = false;
        _this._canClose = false;
        return _this;
    }
    Object.defineProperty(DynamicGuardMonitor.prototype, "toFixed", {
        get: function () {
            return (this._toFixed
                || this._newAnchorCount > 0
                || this._newGuardCount > 0
                || this._newStormCount > 0
                || this._newGiftCount > 1);
        },
        enumerable: true,
        configurable: true
    });
    DynamicGuardMonitor.prototype.onAnchorLottery = function (msg) {
        var data = _super.prototype.onAnchorLottery.call(this, msg);
        if (data !== null) {
            ++this._newAnchorCount;
        }
        return data;
    };
    DynamicGuardMonitor.prototype.onRaffle = function (msg) {
        var data = _super.prototype.onRaffle.call(this, msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    };
    DynamicGuardMonitor.prototype.onTV = function (msg) {
        var data = _super.prototype.onTV.call(this, msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    };
    DynamicGuardMonitor.prototype.onGuard = function (msg) {
        var data = _super.prototype.onGuard.call(this, msg);
        if (data !== null) {
            ++this._newGuardCount;
        }
        return data;
    };
    DynamicGuardMonitor.prototype.onPkLottery = function (msg) {
        var data = _super.prototype.onPkLottery.call(this, msg);
        if (data !== null) {
            ++this._newGiftCount;
        }
        return data;
    };
    DynamicGuardMonitor.prototype.onSpecialGift = function (msg) {
        var data = _super.prototype.onSpecialGift.call(this, msg);
        if (data !== null) {
            ++this._newStormCount;
        }
        return data;
    };
    DynamicGuardMonitor.prototype.onPreparing = function (msg) {
        this._canClose = true;
    };
    DynamicGuardMonitor.prototype.onLive = function (msg) {
        this._canClose = false;
    };
    DynamicGuardMonitor.prototype.onPopularity = function (popularity) {
        var result = _super.prototype.onPopularity.call(this, popularity);
        if (popularity <= 1) {
            ++this._offTimes;
            if (this._offTimes > 50) {
                this._canClose = true;
            }
            if (this._offTimes > 10) {
                if (this._peak_popularity > 50000) {
                    this._toFixed = true;
                }
                if (this._canClose === true) {
                    this.close(true);
                }
            }
        }
        else {
            this._offTimes = 0;
            this._canClose = false;
        }
        return result;
    };
    return DynamicGuardMonitor;
}(FixedGuardMonitor));
exports.DynamicGuardMonitor = DynamicGuardMonitor;
var RaffleMonitor = /** @class */ (function (_super) {
    __extends(RaffleMonitor, _super);
    function RaffleMonitor(addr, info) {
        var _this = this;
        var targets = DanmuTarget.NOTICE;
        _this = _super.call(this, addr, info, targets) || this;
        return _this;
    }
    RaffleMonitor.prototype.onNoticeMsg = function (msg) {
        var msg_type = msg['msg_type'];
        var roomid = msg['real_roomid'];
        switch (msg_type) {
            case 2:
            // fall through
            case 4:
            // fall through
            case 6:
                this.emit('roomid', roomid);
                break;
        }
    };
    RaffleMonitor.prototype.onPreparing = function (msg) {
        if (this.areaid !== 0) {
            this.close(true);
        }
    };
    RaffleMonitor.prototype.onRoomChange = function (msg) {
        var changedInfo = msg['data'];
        var newAreaid = (changedInfo && changedInfo['parent_area_id']) || 0;
        if (this.areaid !== 0 && newAreaid !== this.areaid) {
            this.close(true);
        }
    };
    RaffleMonitor.prototype.onPopularity = function (popularity) {
        var _this = this;
        var result = _super.prototype.onPopularity.call(this, popularity);
        if (popularity <= 1) {
            index_2.Bilibili.isLive(this.roomid).then(function (streaming) {
                if (streaming === false) {
                    _this.close(true);
                }
            }).catch(function (error) {
                index_1.cprint("Bilibili.isLive - " + error.message, chalk.red);
            });
        }
        return result;
    };
    return RaffleMonitor;
}(DanmuTCP));
exports.RaffleMonitor = RaffleMonitor;
var DanmuTCPReader = /** @class */ (function () {
    function DanmuTCPReader() {
        this._data = Buffer.alloc(0);
        this._nextMsgLen = 0;
    }
    DanmuTCPReader.prototype.onData = function (data) {
        if (typeof data === 'string') {
            data = Buffer.from(data, 'utf8');
        }
        this._data = Buffer.concat([this._data, data]);
    };
    DanmuTCPReader.prototype.getMessages = function () {
        var result = [];
        if (this._nextMsgLen <= 0 && this._data.length >= 4) {
            this._nextMsgLen = this._data.readUInt32BE(0);
        }
        while (this._nextMsgLen > 0 && this._data.length >= this._nextMsgLen) {
            result.push(this._data.slice(0, this._nextMsgLen));
            this._data = this._data.slice(this._nextMsgLen, this._data.length);
            var len = this._data.length;
            if (len === 0) {
                this._nextMsgLen = 0;
                this._data = Buffer.alloc(0);
            }
            else if (len >= 4) {
                this._nextMsgLen = this._data.readUInt32BE(0);
            }
            else {
                this._nextMsgLen = -1;
            }
        }
        return result;
    };
    return DanmuTCPReader;
}());
var config = new index_3.AppConfig();
config.readArgs();
