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
var RaffleCategory;
(function (RaffleCategory) {
    RaffleCategory["gift"] = "gift";
    RaffleCategory["guard"] = "guard";
    RaffleCategory["pk"] = "pk";
    RaffleCategory["storm"] = "storm";
    RaffleCategory["anchor"] = "anchor";
})(RaffleCategory = exports.RaffleCategory || (exports.RaffleCategory = {}));
var Raffle = /** @class */ (function () {
    function Raffle() {
        this._id = 0;
        this._roomid = 0;
        this._type = '';
        this._name = '';
        this._wait = 0;
        this._expireAt = 0;
        this._category = '';
    }
    Object.defineProperty(Raffle.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Raffle.prototype, "category", {
        get: function () {
            return this._category;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Raffle.prototype, "roomid", {
        get: function () {
            return this._roomid;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Raffle.prototype, "type", {
        get: function () {
            return this._type;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Raffle.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Raffle.prototype, "wait", {
        get: function () {
            return this._wait;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Raffle.prototype, "expireAt", {
        get: function () {
            return this._expireAt;
        },
        enumerable: true,
        configurable: true
    });
    Raffle.prototype.withId = function (id) {
        this._id = id;
        return this;
    };
    Raffle.prototype.withRoomid = function (roomid) {
        this._roomid = roomid;
        return this;
    };
    Raffle.prototype.withCategory = function (c) {
        this._category = c;
        return this;
    };
    Raffle.prototype.withType = function (t) {
        this._type = t;
        return this;
    };
    Raffle.prototype.withName = function (n) {
        this._name = n;
        return this;
    };
    Raffle.prototype.withWait = function (w) {
        this._wait = w;
        return this;
    };
    Raffle.prototype.withExpireAt = function (e) {
        this._expireAt = e;
        return this;
    };
    Raffle.prototype.convert = function () {
        // Convert to an object that is backward compatible with old HTTP handler
        return {
            id: this.id,
            roomid: this.roomid,
            category: this.category,
            type: this.type,
            name: this.name,
            expireAt: this.expireAt,
        };
    };
    Raffle.prototype.toJson = function () {
        // For now, exclude wait in the serialized JSON
        return JSON.stringify({
            id: this.id,
            roomid: this.roomid,
            category: this.category,
            type: this.type,
            name: this.name,
            expireAt: this.expireAt,
        });
    };
    return Raffle;
}());
exports.Raffle = Raffle;
var Gift = /** @class */ (function (_super) {
    __extends(Gift, _super);
    function Gift() {
        var _this = _super.call(this) || this;
        _this._category = 'gift';
        return _this;
    }
    Gift.prototype.convert = function () {
        // Convert to an object that is backward compatible with old HTTP handler
        return {
            id: this.id,
            roomid: this.roomid,
            category: this.category,
            type: this.type,
            name: this.name,
            wait: this.wait,
            expireAt: this.expireAt,
        };
    };
    return Gift;
}(Raffle));
exports.Gift = Gift;
var Guard = /** @class */ (function (_super) {
    __extends(Guard, _super);
    function Guard() {
        var _this = _super.call(this) || this;
        _this._category = 'guard';
        return _this;
    }
    return Guard;
}(Raffle));
exports.Guard = Guard;
var PK = /** @class */ (function (_super) {
    __extends(PK, _super);
    function PK() {
        var _this = _super.call(this) || this;
        _this._category = 'pk';
        return _this;
    }
    return PK;
}(Raffle));
exports.PK = PK;
var Storm = /** @class */ (function (_super) {
    __extends(Storm, _super);
    function Storm() {
        var _this = _super.call(this) || this;
        _this._category = 'storm';
        return _this;
    }
    return Storm;
}(Raffle));
exports.Storm = Storm;
var Anchor = /** @class */ (function (_super) {
    __extends(Anchor, _super);
    function Anchor() {
        var _this = _super.call(this) || this;
        _this._category = 'anchor';
        _this._gift_name = '';
        _this._gift_num = 0;
        _this._gift_price = 0;
        _this._award_name = '';
        _this._award_num = 0;
        _this._danmu = '';
        _this._require_text = '';
        return _this;
    }
    Anchor.prototype.convert = function () {
        // Convert to an object that is backward compatible with old HTTP handler
        return {
            id: this.id,
            roomid: this.roomid,
            type: this.type,
            category: this.category,
            expireAt: this.expireAt,
            name: this.name,
            award_num: this.award_num,
            gift_name: this.gift_name,
            gift_num: this.gift_num,
            gift_price: this.gift_price,
            requirement: this.requirement,
            danmu: this.danmu,
        };
    };
    Object.defineProperty(Anchor.prototype, "name", {
        get: function () {
            return this._award_name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Anchor.prototype, "award_num", {
        get: function () {
            return this._award_num;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Anchor.prototype, "gift_name", {
        get: function () {
            return this._gift_name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Anchor.prototype, "gift_price", {
        get: function () {
            return this._gift_price;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Anchor.prototype, "gift_num", {
        get: function () {
            return this._gift_num;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Anchor.prototype, "danmu", {
        get: function () {
            return this._danmu;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Anchor.prototype, "requirement", {
        get: function () {
            return this._require_text;
        },
        enumerable: true,
        configurable: true
    });
    Anchor.prototype.withName = function (award_name) {
        this._award_name = award_name;
        return this;
    };
    Anchor.prototype.withAwardNum = function (award_num) {
        this._award_num = award_num;
        return this;
    };
    Anchor.prototype.withGiftName = function (gift_name) {
        this._gift_name = gift_name;
        return this;
    };
    Anchor.prototype.withGiftNum = function (gift_num) {
        this._gift_num = gift_num;
        return this;
    };
    Anchor.prototype.withGiftPrice = function (price) {
        this._gift_price = price;
        return this;
    };
    Anchor.prototype.withDanmu = function (danmu) {
        this._danmu = danmu;
        return this;
    };
    Anchor.prototype.withRequirement = function (requirement) {
        this._require_text = requirement;
        return this;
    };
    Anchor.prototype.toJson = function () {
        // Currently Anchor is not being sent out
        return '';
        /*
                return JSON.stringify({
                    id:             this.id,
                    roomid:         this.roomid,
                    type:           this.type,
                    category:       this.category,
                    expireAt:       this.expireAt,
                    name:           this.name,
                    award_num:      this.award_num,
                    gift_name:      this.gift_name,
                    gift_num:       this.gift_num,
                    gift_price:     this.gift_price,
                    requirement:    this.requirement,
                    danmu:          this.danmu,
                });
        */
    };
    return Anchor;
}(Raffle));
exports.Anchor = Anchor;
