"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chalk = require("chalk");
function cprint(msg, color) {
    if (color === void 0) { color = chalk.reset; }
    var now = new Date();
    var year = now.getFullYear();
    var mon = now.getMonth() + 1;
    var date_raw = now.getDate();
    var hr = now.getHours();
    var min = now.getMinutes();
    var sec = now.getSeconds();
    var month = mon < 10 ? "0" + mon : "" + mon;
    var date = date_raw < 10 ? "0" + date_raw : "" + date_raw;
    var hour = hr < 10 ? "0" + hr : "" + hr;
    var minute = min < 10 ? "0" + min : "" + min;
    var second = sec < 10 ? "0" + sec : "" + sec;
    var prefix = " [" + year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second + "]";
    console.log(color(prefix + "   " + msg));
}
exports.cprint = cprint;
