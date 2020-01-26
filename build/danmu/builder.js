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
var AbstractBuilder = /** @class */ (function () {
    function AbstractBuilder() {
        this._id = 0;
        this._roomid = 0;
        this._type = '';
        this._name = '';
        this._wait = 0;
        this._expireAt = 0;
        this._category = '';
    }
    Object.defineProperty(AbstractBuilder.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractBuilder.prototype, "category", {
        get: function () {
            return this._category;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractBuilder.prototype, "roomid", {
        get: function () {
            return this._roomid;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractBuilder.prototype, "type", {
        get: function () {
            return this._type;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractBuilder.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractBuilder.prototype, "wait", {
        get: function () {
            return this._wait;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AbstractBuilder.prototype, "expireAt", {
        get: function () {
            return this._expireAt;
        },
        enumerable: true,
        configurable: true
    });
    AbstractBuilder.prototype.withId = function (id) {
        this._id = id;
        return this;
    };
    AbstractBuilder.prototype.withRoomid = function (roomid) {
        this._roomid = roomid;
        return this;
    };
    AbstractBuilder.prototype.withCategory = function (c) {
        this._category = c;
        return this;
    };
    AbstractBuilder.prototype.withType = function (t) {
        this._type = t;
        return this;
    };
    AbstractBuilder.prototype.withName = function (n) {
        this._name = n;
        return this;
    };
    AbstractBuilder.prototype.withWait = function (w) {
        this._wait = w;
        return this;
    };
    AbstractBuilder.prototype.withExpireAt = function (e) {
        this._expireAt = e;
        return this;
    };
    AbstractBuilder.prototype.build = function () {
        return null;
    };
    return AbstractBuilder;
}());
var GiftBuilder = /** @class */ (function (_super) {
    __extends(GiftBuilder, _super);
    function GiftBuilder() {
        var _this = _super.call(this) || this;
        _this._category = 'gift';
        return _this;
    }
    GiftBuilder.start = function () {
        return new GiftBuilder();
    };
    GiftBuilder.prototype.build = function () {
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
    return GiftBuilder;
}(AbstractBuilder));
exports.GiftBuilder = GiftBuilder;
var GuardBuilder = /** @class */ (function (_super) {
    __extends(GuardBuilder, _super);
    function GuardBuilder() {
        var _this = _super.call(this) || this;
        _this._category = 'guard';
        return _this;
    }
    GuardBuilder.start = function () {
        return new GuardBuilder();
    };
    GuardBuilder.prototype.build = function () {
        return {
            id: this.id,
            roomid: this.roomid,
            category: this.category,
            type: this.type,
            name: this.name,
            expireAt: this.expireAt,
        };
    };
    return GuardBuilder;
}(AbstractBuilder));
exports.GuardBuilder = GuardBuilder;
var PKBuilder = /** @class */ (function (_super) {
    __extends(PKBuilder, _super);
    function PKBuilder() {
        var _this = _super.call(this) || this;
        _this._category = 'pk';
        return _this;
    }
    PKBuilder.start = function () {
        return new PKBuilder();
    };
    PKBuilder.prototype.build = function () {
        return {
            id: this.id,
            roomid: this.roomid,
            category: this.category,
            type: this.type,
            name: this.name,
            expireAt: this.expireAt,
        };
    };
    return PKBuilder;
}(AbstractBuilder));
exports.PKBuilder = PKBuilder;
var StormBuilder = /** @class */ (function () {
    function StormBuilder() {
        this._id = '0';
        this._roomid = 0;
        this._type = '';
        this._name = '';
        this._expireAt = 0;
        this._category = 'storm';
    }
    StormBuilder.start = function () {
        return new StormBuilder();
    };
    StormBuilder.prototype.build = function () {
        return {
            id: this.id,
            roomid: this.roomid,
            category: this.category,
            type: this.type,
            name: this.name,
            expireAt: this.expireAt,
        };
    };
    Object.defineProperty(StormBuilder.prototype, "id", {
        get: function () {
            return this._id;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StormBuilder.prototype, "roomid", {
        get: function () {
            return this._roomid;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StormBuilder.prototype, "category", {
        get: function () {
            return this._category;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StormBuilder.prototype, "type", {
        get: function () {
            return this._type;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StormBuilder.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StormBuilder.prototype, "expireAt", {
        get: function () {
            return this._expireAt;
        },
        enumerable: true,
        configurable: true
    });
    StormBuilder.prototype.withId = function (id) {
        this._id = "" + id;
        return this;
    };
    StormBuilder.prototype.withRoomid = function (roomid) {
        this._roomid = roomid;
        return this;
    };
    StormBuilder.prototype.withType = function (t) {
        this._type = t;
        return this;
    };
    StormBuilder.prototype.withName = function (n) {
        this._name = n;
        return this;
    };
    StormBuilder.prototype.withExpireAt = function (e) {
        this._expireAt = e;
        return this;
    };
    return StormBuilder;
}());
exports.StormBuilder = StormBuilder;
var AnchorBuilder = /** @class */ (function (_super) {
    __extends(AnchorBuilder, _super);
    function AnchorBuilder() {
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
    AnchorBuilder.start = function () {
        return new AnchorBuilder();
    };
    AnchorBuilder.prototype.build = function () {
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
    Object.defineProperty(AnchorBuilder.prototype, "name", {
        get: function () {
            return this._award_name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnchorBuilder.prototype, "award_num", {
        get: function () {
            return this._award_num;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnchorBuilder.prototype, "gift_name", {
        get: function () {
            return this._gift_name;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnchorBuilder.prototype, "gift_price", {
        get: function () {
            return this._gift_price;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnchorBuilder.prototype, "gift_num", {
        get: function () {
            return this._gift_num;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnchorBuilder.prototype, "danmu", {
        get: function () {
            return this._danmu;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AnchorBuilder.prototype, "requirement", {
        get: function () {
            return this._require_text;
        },
        enumerable: true,
        configurable: true
    });
    AnchorBuilder.prototype.withName = function (award_name) {
        this._award_name = award_name;
        return this;
    };
    AnchorBuilder.prototype.withAwardNum = function (award_num) {
        this._award_num = award_num;
        return this;
    };
    AnchorBuilder.prototype.withGiftName = function (gift_name) {
        this._gift_name = gift_name;
        return this;
    };
    AnchorBuilder.prototype.withGiftNum = function (gift_num) {
        this._gift_num = gift_num;
        return this;
    };
    AnchorBuilder.prototype.withGiftPrice = function (price) {
        this._gift_price = price;
        return this;
    };
    AnchorBuilder.prototype.withDanmu = function (danmu) {
        this._danmu = danmu;
        return this;
    };
    AnchorBuilder.prototype.withRequirement = function (requirement) {
        this._require_text = requirement;
        return this;
    };
    return AnchorBuilder;
}(AbstractBuilder));
exports.AnchorBuilder = AnchorBuilder;
