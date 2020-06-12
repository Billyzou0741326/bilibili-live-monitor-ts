"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = void 0;
function sleep(timeInMilliseconds) {
    timeInMilliseconds = timeInMilliseconds > 0 ? timeInMilliseconds : 0;
    return new Promise(function (resolve) { setTimeout(resolve, timeInMilliseconds); });
}
exports.sleep = sleep;
