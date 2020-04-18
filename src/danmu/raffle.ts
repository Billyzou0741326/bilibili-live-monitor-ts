export interface Danmu {
    readonly uid:       number;
    readonly msg:       string;
    readonly sender:    string;
    readonly time:      number;
}

export enum RaffleCategory {
    pk = 'pk',
    gift = 'gift',
    guard = 'guard',
    storm = 'storm',
    anchor = 'anchor',
}

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

    public toJson(): any {
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

    public toJsonStr(): string {
        return JSON.stringify(this.toJson());
    }

    public static parse(giftInfo: any): any {
        return null;
    }
}

export class Gift extends Raffle {

    public constructor() {
        super();
        this._category = 'gift';
    }

    public static parse(giftInfo: any): Gift | null{
        let data: any = giftInfo;
        let gift: Gift | null = null;
        const t: string = data['type'];
        const id: number = data['raffleId'];
        const name: string = data['title'] || '未知';
        const wait: number = data['time_wait'] > 0 ? data['time_wait'] : 0;
        const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
        gift = new Gift()
            .withId(id)
            .withType(t)
            .withName(name)
            .withWait(wait)
            .withExpireAt(expireAt);

        return gift;
    }

}

export class Guard extends Raffle {

    public constructor() {
        super();
        this._category = 'guard';
    }

    public static parse(giftInfo: any): Guard | null {
        const nameOfType: any = {
            1: '总督',
            2: '提督',
            3: '舰长',
        };

        let data: any = giftInfo;
        let guard: Guard | null = null;
        const t: string = data['keyword'];
        const id: number = data['id'];
        const name: string = nameOfType[data['privilege_type']];
        const expireAt: number = (data['time'] || 0) + Math.floor(0.001 * new Date().valueOf());
        guard = new Guard()
            .withId(id)
            .withType(t)
            .withName(name)
            .withExpireAt(expireAt);

        return guard;
    }
}

export class PK extends Raffle {

    public constructor() {
        super();
        this._category = 'pk';
    }

    public static parse(giftInfo: any): PK | null {
        let data: any = giftInfo;
        let pk: PK | null = null;
        const id: number = data['id'];
        const roomid: number = data['room_id'];
        const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
        pk = new PK()
            .withId(id)
            .withRoomid(roomid)
            .withType('pk')
            .withName('大乱斗')
            .withExpireAt(expireAt);

        return pk;
    }
}

export class Storm extends Raffle {

    public constructor() {
        super();
        this._category = 'storm';
    }

    public static parse(giftInfo: any): Storm | null {
        const info = giftInfo;
        let details: Storm | null = null;
        if (info) {
            const id: number = info['id'];
            const expireAt: number = info['time'] + Math.floor(0.001 * new Date().valueOf());
            details = new Storm()
                .withId(id)
                .withType('storm')
                .withName('节奏风暴')
                .withExpireAt(expireAt);
        }

        return details;
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

    public toJson(): any {
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

    public static parse(giftInfo: any): Anchor | null {
        let data: any = giftInfo;
        let g: Anchor | null = null;
        const id: number = data['id'];
        const roomid: number = data['room_id'];
        const name: string = data['award_name'];
        const award_num: number = data['award_num'];
        const gift_name: string = data['gift_name'];
        const gift_num: number = data['gift_num'];
        const gift_price: number = data['gift_price'];
        const require_text: string = data['require_text'];
        const danmu: string = data['danmu'];
        const expireAt: number = data['time'] + Math.floor(0.001 * new Date().valueOf());
        g = new Anchor()
            .withId(id)
            .withRoomid(roomid)
            .withGiftPrice(gift_price)
            .withGiftName(gift_name)
            .withGiftNum(gift_num)
            .withDanmu(danmu)
            .withRequirement(require_text)
            .withName(name)
            .withAwardNum(award_num)
            .withType('anchor')
            .withExpireAt(expireAt);

        return g;
    }
}
