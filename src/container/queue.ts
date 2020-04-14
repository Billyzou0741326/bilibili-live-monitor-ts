class LLNode {

    private _item:  any;
    private _next:  LLNode | null;

    public constructor(item: any) {
        this._next = null;
        this._item = item;
    }

    public get next(): LLNode | null {
        return this._next;
    }

    public get value(): any {
        return this._item;
    }

    public set next(n: LLNode | null) {
        this._next = n;
    }

    public set value(v: any) {
        this._item = v;
    }

}


export class Queue {

    private _size:  number;
    private _rear:  LLNode | null;

    public constructor() {
        this._size = 0;
        this._rear = null;
    }

    public push(item: any): this {
        const node = new LLNode(item);
        node.next = node;
        if (this._rear !== null) {
            node.next = this._rear.next;
            this._rear.next = node;
        }
        this._rear = node;
        ++this._size;
        return this;
    }

    public pop(): any {
        let result: any = null;
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
    }

    public front(): any {
        let result: any = null;
        if (this._rear !== null && this._rear.next !== null) {
            result = this._rear.next.value;
        }
        return result;
    }

    public get length(): number {
        return this._size;
    }
}
