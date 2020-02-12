export interface Danmu {
    readonly uid:       number;
    readonly msg:       string;
    readonly sender:    string;
    readonly time:      number;
}

export interface Gift {
    readonly id:        number;
    readonly roomid:    number;
    readonly category:  string;
    readonly type:      string;
    readonly name:      string;
    readonly wait:      number;
    readonly expireAt:  number;
}

export interface Guard {
    readonly id:        number;
    readonly roomid:    number;
    readonly category:  string;
    readonly type:      string;
    readonly name:      string;
    readonly expireAt:  number;
}

export interface PK {
    readonly id:        number;
    readonly roomid:    number;
    readonly category:  string;
    readonly type:      string;
    readonly name:      string;
    readonly expireAt:  number;
}

export interface Storm {
    readonly id:        string;
    readonly roomid:    number;
    readonly category:  string;
    readonly type:      string;
    readonly name:      string;
    readonly expireAt:  number;
}

export interface Anchor {
    readonly id:            number;
    readonly roomid:        number;
    readonly category:      string;
    readonly type:          string;
    readonly name:          string;
    readonly award_num:     number;
    readonly danmu:         string;
    readonly gift_price:    number;
    readonly gift_name:     string;
    readonly gift_num:      number;
    readonly requirement:   string;
    readonly expireAt:      number;
}


export interface Builder {
    build(): Gift | Guard | PK | Storm | Anchor;
}


class AbstractBuilder {

    protected _id:          number;
    protected _roomid:      number;
    protected _type:        string;
    protected _name:        string;
    protected _wait:        number;
    protected _expireAt:    number;
    protected _category:    string;

    constructor() {
        this._id = 0;
        this._roomid = 0;
        this._type = '';
        this._name = '';
        this._wait = 0;
        this._expireAt = 0;
        this._category = '';
    }

    get id(): number {
        return this._id;
    }

    get category(): string {
        return this._category;
    }

    get roomid(): number {
        return this._roomid;
    }

    get type(): string {
        return this._type;
    }

    get name(): string {
        return this._name;
    }

    get wait(): number {
        return this._wait;
    }

    get expireAt(): number {
        return this._expireAt;
    }

    withId(id: number): AbstractBuilder | any {
        this._id = id;
        return this;
    }

    withRoomid(roomid: number): AbstractBuilder | any {
        this._roomid = roomid;
        return this;
    }

    withCategory(c: string): AbstractBuilder | any {
        this._category = c;
        return this;
    }

    withType(t: string): AbstractBuilder | any{
        this._type = t;
        return this;
    }

    withName(n: string): AbstractBuilder | any {
        this._name = n;
        return this;
    }

    withWait(w: number): AbstractBuilder | any {
        this._wait = w;
        return this;
    }

    withExpireAt(e: number): AbstractBuilder | any {
        this._expireAt = e;
        return this;
    }

    build(): any {
        return null;
    }
}

export class GiftBuilder extends AbstractBuilder implements Gift, Builder {

    static start(): GiftBuilder {
        return new GiftBuilder();
    }

    constructor() {
        super();
        this._category = 'gift';
    }

    build(): Gift {
        return {
            id:         this.id,
            roomid:     this.roomid,
            category:   this.category,
            type:       this.type,
            name:       this.name,
            wait:       this.wait,
            expireAt:   this.expireAt,
        } as Gift;
    }

}

export class GuardBuilder extends AbstractBuilder implements Guard, Builder {

    static start(): GuardBuilder {
        return new GuardBuilder();
    }

    constructor() {
        super();
        this._category = 'guard';
    }

    build(): Guard {
        return {
            id:         this.id,
            roomid:     this.roomid,
            category:   this.category,
            type:       this.type,
            name:       this.name,
            expireAt:   this.expireAt,
        } as Guard;
    }

}

export class PKBuilder extends AbstractBuilder implements PK, Builder {

    static start(): PKBuilder {
        return new PKBuilder();
    }

    constructor() {
        super();
        this._category = 'pk';
    }

    build(): PK {
        return {
            id:         this.id,
            roomid:     this.roomid,
            category:   this.category,
            type:       this.type,
            name:       this.name,
            expireAt:   this.expireAt,
        } as PK;
    }

}

export class StormBuilder implements Storm, Builder {

    private _id:            string;
    private _roomid:        number;
    private _category:      string;
    private _type:          string;
    private _name:          string;
    private _expireAt:      number;

    static start(): StormBuilder {
        return new StormBuilder();
    }

    constructor() {
        this._id = '0';
        this._roomid = 0;
        this._type = '';
        this._name = '';
        this._expireAt = 0;
        this._category = 'storm';
    }

    build(): Storm {
        return {
            id:         this.id,
            roomid:     this.roomid,
            category:   this.category,
            type:       this.type,
            name:       this.name,
            expireAt:   this.expireAt,
        } as Storm;
    }

    get id(): string {
        return this._id;
    }

    get roomid(): number {
        return this._roomid;
    }

    get category(): string {
        return this._category;
    }

    get type(): string {
        return this._type;
    }

    get name(): string {
        return this._name;
    }

    get expireAt(): number {
        return this._expireAt;
    }

    withId(id: string | number): StormBuilder {
        this._id = `${id}`;
        return this;
    }

    withRoomid(roomid: number): StormBuilder {
        this._roomid = roomid;
        return this;
    }

    withType(t: string): StormBuilder {
        this._type = t;
        return this;
    }

    withName(n: string): StormBuilder {
        this._name = n;
        return this;
    }

    withExpireAt(e: number): StormBuilder {
        this._expireAt = e;
        return this;
    }

}

export class AnchorBuilder extends AbstractBuilder {

    private _gift_name:     string;
    private _gift_price:    number;
    private _gift_num:      number;
    private _danmu:         string;
    private _award_name:    string;
    private _award_num:     number;
    private _require_text:  string;

    static start(): AnchorBuilder {
        return new AnchorBuilder();
    }

    constructor() {
        super();
        this._category = 'anchor';
        this._gift_name = '';
        this._gift_num = 0;
        this._gift_price = 0;
        this._award_name = '';
        this._award_num = 0;
        this._danmu = '';
        this._require_text = '';
    }

    build(): Anchor {
        return {
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
        } as Anchor;
    }

    get name(): string {
        return this._award_name;
    }

    get award_num(): number {
        return this._award_num;
    }

    get gift_name(): string {
        return this._gift_name;
    }

    get gift_price(): number {
        return this._gift_price;
    }

    get gift_num(): number {
        return this._gift_num;
    }

    get danmu(): string {
        return this._danmu;
    }

    get requirement(): string {
        return this._require_text;
    }

    withName(award_name: string): AnchorBuilder {
        this._award_name = award_name;
        return this;
    }

    withAwardNum(award_num: number): AnchorBuilder {
        this._award_num = award_num;
        return this;
    }

    withGiftName(gift_name: string): AnchorBuilder {
        this._gift_name = gift_name;
        return this;
    }

    withGiftNum(gift_num: number): AnchorBuilder {
        this._gift_num = gift_num;
        return this;
    }

    withGiftPrice(price: number): AnchorBuilder {
        this._gift_price = price;
        return this;
    }

    withDanmu(danmu: string): AnchorBuilder {
        this._danmu = danmu;
        return this;
    }

    withRequirement(requirement: string): AnchorBuilder {
        this._require_text = requirement;
        return this;
    }
}

