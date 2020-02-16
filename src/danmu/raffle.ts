export const RaffleCategories = [
    'gift',
    'guard',
    'pk',
    'storm',
    'anchor',
];

export abstract class Raffle {

    protected _id:          number;
    protected _roomid:      number;
    protected _type:        string;
    protected _name:        string;
    protected _wait:        number;
    protected _expireAt:    number;
    protected _category:    string;

    protected constructor() {
        this._id = 0;
        this._roomid = 0;
        this._type = '';
        this._name = '';
        this._wait = 0;
        this._expireAt = 0;
        this._category = '';
    }

    public get id(): number {
        return this._id;
    }

    public get category(): string {
        return this._category;
    }

    public get roomid(): number {
        return this._roomid;
    }

    public get type(): string {
        return this._type;
    }

    public get name(): string {
        return this._name;
    }

    public get wait(): number {
        return this._wait;
    }

    public get expireAt(): number {
        return this._expireAt;
    }

    public withId(id: number): this {
        this._id = id;
        return this;
    }

    public withRoomid(roomid: number): this {
        this._roomid = roomid;
        return this;
    }

    public withCategory(c: string): this {
        this._category = c;
        return this;
    }

    public withType(t: string): this {
        this._type = t;
        return this;
    }

    public withName(n: string): this {
        this._name = n;
        return this;
    }

    public withWait(w: number): this {
        this._wait = w;
        return this;
    }

    public withExpireAt(e: number): this {
        this._expireAt = e;
        return this;
    }

    public convert(): any {
        // Convert to an object that is backward compatible with old HTTP handler
        return {
            id:         this.id,
            roomid:     this.roomid,
            category:   this.category,
            type:       this.type,
            name:       this.name,
            expireAt:   this.expireAt,
        };
    }

    public toJson(): string {
        // For now, exclude wait in the serialized JSON
        return JSON.stringify({
            id:         this.id,
            roomid:     this.roomid,
            category:   this.category,
            type:       this.type,
            name:       this.name,
            expireAt:   this.expireAt,
        });
    }

}

export class Gift extends Raffle {

    public constructor() {
        super();
        this._category = 'gift';
    }

    public convert(): any {
        // Convert to an object that is backward compatible with old HTTP handler
        return {
            id:         this.id,
            roomid:     this.roomid,
            category:   this.category,
            type:       this.type,
            name:       this.name,
            wait:       this.wait,
            expireAt:   this.expireAt,
        };
    }

}

export class Guard extends Raffle {

    public constructor() {
        super();
        this._category = 'guard';
    }

}

export class PK extends Raffle {

    public constructor() {
        super();
        this._category = 'pk';
    }

}

export class Storm extends Raffle {

    public constructor() {
        super();
        this._category = 'storm';
    }

}

export class Anchor extends Raffle {

    private _gift_name:     string;
    private _gift_price:    number;
    private _gift_num:      number;
    private _danmu:         string;
    private _award_name:    string;
    private _award_num:     number;
    private _require_text:  string;

    public constructor() {
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

    public convert(): any {
        // Convert to an object that is backward compatible with old HTTP handler
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
        };
    }

    public get name(): string {
        return this._award_name;
    }

    public get award_num(): number {
        return this._award_num;
    }

    public get gift_name(): string {
        return this._gift_name;
    }

    public get gift_price(): number {
        return this._gift_price;
    }

    public get gift_num(): number {
        return this._gift_num;
    }

    public get danmu(): string {
        return this._danmu;
    }

    public get requirement(): string {
        return this._require_text;
    }

    public withName(award_name: string): this {
        this._award_name = award_name;
        return this;
    }

    public withAwardNum(award_num: number): this {
        this._award_num = award_num;
        return this;
    }

    public withGiftName(gift_name: string): this {
        this._gift_name = gift_name;
        return this;
    }

    public withGiftNum(gift_num: number): this {
        this._gift_num = gift_num;
        return this;
    }

    public withGiftPrice(price: number): this {
        this._gift_price = price;
        return this;
    }

    public withDanmu(danmu: string): this {
        this._danmu = danmu;
        return this;
    }

    public withRequirement(requirement: string): this {
        this._require_text = requirement;
        return this;
    }

    public toJson(): string {
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
    }

}
