"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LLNode = /** @class */ (function () {
    function LLNode(item) {
        this._next = null;
        this._item = item;
    }
    Object.defineProperty(LLNode.prototype, "next", {
        get: function () {
            return this._next;
        },
        set: function (n) {
            this._next = n;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LLNode.prototype, "value", {
        get: function () {
            return this._item;
        },
        set: function (v) {
            this._item = v;
        },
        enumerable: true,
        configurable: true
    });
    return LLNode;
}());
var Queue = /** @class */ (function () {
    function Queue() {
        this._size = 0;
        this._rear = null;
    }
    Queue.prototype.push = function (item) {
        var node = new LLNode(item);
        node.next = node;
        if (this._rear !== null) {
            node.next = this._rear.next;
            this._rear.next = node;
        }
        this._rear = node;
        ++this._size;
        return this;
    };
    Queue.prototype.pop = function () {
        var result = null;
        if (this._rear !== null && this._rear.next !== null) {
            result = this._rear.next.value;
            if (this._rear !== this._rear.next) {
                this._rear.next = this._rear.next.next;
            }
            else {
                this._rear = null;
            }
            --this._size;
        }
        return result;
    };
    Queue.prototype.front = function () {
        var result = null;
        if (this._rear !== null && this._rear.next !== null) {
            result = this._rear.next.value;
        }
        return result;
    };
    Object.defineProperty(Queue.prototype, "length", {
        get: function () {
            return this._size;
        },
        enumerable: true,
        configurable: true
    });
    return Queue;
}());
exports.Queue = Queue;
