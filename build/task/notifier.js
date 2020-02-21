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
var events_1 = require("events");
var Days;
(function (Days) {
    Days[Days["Mon"] = 1] = "Mon";
    Days[Days["Tue"] = 2] = "Tue";
    Days[Days["Wed"] = 4] = "Wed";
    Days[Days["Thu"] = 8] = "Thu";
    Days[Days["Fri"] = 16] = "Fri";
    Days[Days["Sat"] = 32] = "Sat";
    Days[Days["Sun"] = 64] = "Sun";
})(Days || (Days = {}));
var Notifier = /** @class */ (function (_super) {
    __extends(Notifier, _super);
    function Notifier() {
        return _super.call(this) || this;
    }
    return Notifier;
}(events_1.EventEmitter));
