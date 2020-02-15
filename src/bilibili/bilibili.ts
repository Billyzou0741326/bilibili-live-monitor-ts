import * as crypto from 'crypto';
import * as chalk from 'chalk';
import {
    AppSession,
    WebSession, } from './index';
import {
    Request,
    RequestBuilder,
    RequestMethods,
    Response, } from '../net/index';
import {
    cprint,
    Cookies,
    Params, } from '../fmt/index';
import {
    BilibiliError,
    BilibiliBase, } from '../bilibili/index';
import {
    AppConfig, } from '../global/index';


const config = new AppConfig();


export interface DanmuSettings {
    readonly roomid:        number;
    readonly msg:           string;
}

export class Bilibili extends BilibiliBase {

    constructor() {
        super();
    }

    // ------------------------------App------------------------------
    static login(username: string, password: string): Promise<any> {
        return Bilibili.obtainLoginKey().then((resp: any): Promise<Response> => {
            const code: number = resp.code;
            if (code !== 0) {
                const msg: string = resp.message || resp.msg || 'Login key error';
                return Promise.reject(new BilibiliError(msg).withStatus(code));
            }
            // ------------------Compute Encryption------------------
            const hash = resp['data']['hash'];
            const key = resp['data']['key'];
            const encryptionSettings: any = {
                key: key,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            };
            const hashedPassword = crypto.publicEncrypt(
                encryptionSettings,
                Buffer.from(`${hash}${password}`)
            ).toString('base64');

            const data: any = {};
            Object.assign(data, config.appCommon);
            data['username'] = username;
            data['password'] = hashedPassword;
            data['ts'] = Math.floor(0.001 * new Date().valueOf());

            const payload: string = Bilibili.parseAppParams(sort(data));

            const request: Request = (RequestBuilder.start()
                .withHost('passport.bilibili.com')
                .withPath('/api/v3/oauth2/login')
                .withMethod(RequestMethods.POST)
                .withHeaders(config.appHeaders)
                .withData(payload)
                .withContentType('application/x-www-form-urlencoded')
                .build()
            );
            return Bilibili.request(request);
        });
    }

    static obtainLoginKey(): Promise<any> {
        const data: any = {};
        Object.assign(data, config.appCommon);
        data['appkey'] = config.appkey;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload: string = Bilibili.parseAppParams(sort(data));

        const request: Request = (RequestBuilder.start()
            .withHost('passport.bilibili.com')
            .withPath('/api/oauth2/getKey')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );
        return Bilibili.request(request);
    }

    /**
     * Gets raffle info in a given room (APP API)
     *
     * @static
     * @param   {Integer}   roomid
     * @returns {Promise}   resolve(json)   reject(String)
     */
    static appGetLottery(roomid: number): Promise<any> {
        const data: any = {};
        Object.assign(data, config.appCommon);
        // data['appkey'] = config.appkey;
        // data['actionKey'] = 'appkey';
        data['roomid'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload: string = Bilibili.parseAppParams(sort(data));

        const request: Request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/lottery/getLotteryInfo')
            .withMethod(RequestMethods.GET)
            .withParams(payload)
            .withHeaders(config.appHeaders)
            .build()
        );
        return Bilibili.request(request);
    }

    /**
     * Get all rooms from sailboat API
     *
     * @static
     * @returns {Promise}   resolve(json)   reject(String)
     */
    static getAllSailboatRooms(): Promise<any> {
        const MAX_PAGES = 3;
        const promises: Promise<any>[] = [];

        for (let page = 1; page <= MAX_PAGES; ++page) {
            const task: Promise<any> = (Bilibili.getSailboatRooms(page)
                .then((jsonObj: any) => {
                    const entryList: any[] = jsonObj['data']['list'];
                    const roomids: number[] = entryList.map((entry: any): number => entry['roomid']);
                    return roomids;
                })
                .catch((error: any) => {
                    cprint(`Bilibili.getSailboatRooms - ${error.message}`, chalk.red);
                    return Promise.resolve([]);
                })
            );
            promises.push(task);
        }

        const result: Promise<any> = Promise.all(promises).then((lists: Array<number[]>) => {
            const finalList: Array<number> = ([] as any[]).concat(...lists);
            return finalList;
        });

        return result;
    }

    /**
     * Get rooms from sailboat rank API
     *
     * @static
     * @param   {Integer}   page    - page of the API, valid values: [1,2,3]
     * @returns {Promise}   resolve(json)   reject(Error)
     */
    static getSailboatRooms(page: number): Promise<any> {
        // Page 1-3 (Rank 0-50)
        const PAGE_SIZE = 20;   // 必须是20
        const params: any = {
            'type': 'sail_boat_number',
            'page': page,
            'is_trend': 1,
            'page_size': PAGE_SIZE,
        };

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(RequestMethods.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * Get rooms from genki rank API
     *
     * @static
     * @returns     {Promise}   resolve(json)   reject(String)
     */
    static getAllGenkiRooms(): Promise<any> {
        const MAX_PAGES = 3;
        const promises: Promise<any>[] = [];

        for (let page = 1; page <= MAX_PAGES; ++page) {
            const task: Promise<any> = (Bilibili.getGenkiRooms(page)
                .then((jsonObj: any) => {
                    const entryList: any[] = jsonObj['data']['list'];
                    const roomids: number[] = entryList.map((entry: any): number => entry['roomid']);
                    return roomids;
                })
                .catch((error: any) => {
                    cprint(`Bilibili.getGenkiRooms - ${error.message}`, chalk.red);
                    return Promise.resolve([]);
                })
            );
            promises.push(task);
        }

        const result = Promise.all(promises).then((lists: Array<number[]>) => {
            const finalList: number[] = ([] as any[]).concat(...lists);
            return finalList;
        });

        return result;
    }

    /**
     * Get rooms from genki rank API
     *
     * @static
     * @param   {Integer}   page    - page of API
     * @returns {Promise}   resolve(json)  reject(Error)
     */
    static getGenkiRooms(page: number): Promise<any> {
        const PAGE_SIZE = 20;
        const params: any = {
            'date': 'month',
            'type': 'master_vitality_2018',
            'areaid': 0,
            'page': page,
            'is_trend': 1,
            'page_size': PAGE_SIZE,
        };

        const request: Request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(RequestMethods.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * Get number of rooms streaming
     *
     * @static
     * @returns {Promise}   resolve(Integer)    reject(String)
     */
    static getLiveCount(): Promise<number> {
        const params: any = {
            'parent_area_id': 0,
            'page': 1,
            'page_size': 1,
            'sort_type': 'live_time',
        };
        const request: Request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v3/area/getRoomList')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.webHeaders)
            .withParams(params)
            .build()
        );

        return Bilibili.request(request).then((jsonObj: any): number => {
            const count: number = jsonObj['data']['count'];
            return count;
        });
    }

    /**
     * Get basic info of a room
     *
     * @static
     * @param       {Integer}   roomid
     * @returns     {Promise}   resolve(json)   reject(Error)
     */
    static getRoomInfo(roomid: number): Promise<any> {
        const params: any = {
            'id': roomid, 
        };
        const request: Request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/room_init')
            .withMethod(RequestMethods.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * Check if a room is streaming
     *
     * @static
     * @param   {Integer}   roomid
     * @returns {Promise}   resolve(boolean)    reject(String)
     */
    static isLive(roomid: number): Promise<boolean> {
        return Bilibili.getRoomInfo(roomid).then((jsonObj: any): boolean => {
            const isLive: boolean = jsonObj['data']['live_status'] === 1 ? true : false;
            return isLive;
        });
    }

    /** 
     * Get streaming roomd in area ``areaid``
     * 
     * @static
     * @param   {Integer}   areaid
     * @param   {Integer}   size
     * @param   {Integer}   count
     * @returns {Promise}   resolve([ { 'roomid': roomid, 'online': online }, ... ])
     */
    static getRoomsInArea(areaid: number, size: number=99, count: number=Infinity): Promise<any> {
        const page_size = size;
        const params: any = {
            'parent_area_id': areaid, 
            'page': 0, 
            'page_size': size > 99 || size < 0 ? 99 : size, 
            'sort_type': 'live_time',
        };

        let promises: Promise<any>[] = [];

        const promise = Bilibili.getLiveCount().catch((error: any): Promise<number> => {

            cprint(`Bilibili.getLiveCount - ${error.message}`, chalk.red);
            return Promise.resolve(5000);    // on error return 5000

        }).then((room_count: number): Promise<any> => {

            room_count = Math.min(count, room_count);
            const PAGES: number = Math.round(room_count / page_size) + 2;

            for (let i = 1; i < PAGES; ++i) {
                const p: any = Object.assign(new Object(), params);
                p.page = i;

                const request: Request = (RequestBuilder.start()
                    .withHost('api.live.bilibili.com')
                    .withPath('/room/v3/area/getRoomList')
                    .withMethod(RequestMethods.GET)
                    .withParams(p)
                    .withHeaders(config.webHeaders)
                    .build()
                );

                const task: Promise<any> = (Bilibili.request(request)
                    .then((jsonObj: any): Promise<any[]> => {

                        const code: number = jsonObj['code'];
                        if (code !== 0) {
                            const msg: string = jsonObj['message'] || jsonObj['msg'] || 'Error getting rooms';
                            return Promise.reject(new BilibiliError(msg).withStatus(code));
                        }
                        const roomInfo: any[] = jsonObj['data']['list'].map((entry: any): any => {
                            return {
                                'roomid': entry['roomid'],
                                'online': entry['online'],
                            };
                        });
                        return Promise.resolve(roomInfo);
                    })
                    .catch((error: any) => {
                        cprint(`Bilibili.getRoomsInArea - ${error.message}`, chalk.red);
                        return Promise.resolve([]);
                    })
                );
                promises.push(task);
            }

            const roomInfos: any[] = [];
            return Promise.all(promises).then((roomInfoLists: Array<any[]>): any[] => {
                const roomInfos: any[] = ([] as any[]).concat(...roomInfoLists);
                return roomInfos;
            });
        });

        return promise;
    }

    /**
     * Get rooms in each of the six areas
     *
     * @static
     * @returns     {Promise}   resolve([ Array(Integer), Array(Integer), ... ])    reject(String)
     */
    static getRoomsInEachArea(): Promise<any>[] {
        const params: any = {
            'parent_area_id': 0, 
            'page': 1, 
            'page_size': 10, 
            'sort_type': 'online', 
        };
        const areas: number[] = [ 1, 2, 3, 4, 5, 6, ];

        let promises: Promise<any>[] = [];

        areas.forEach((areaid: number): void => {

            params['parent_area_id'] = areaid;
            const request: Request = (RequestBuilder.start()
                .withHost('api.live.bilibili.com')
                .withPath('/room/v3/area/getRoomList')
                .withMethod(RequestMethods.GET)
                .withHeaders(config.webHeaders)
                .withParams(params)
                .build()
            );

            promises.push(Bilibili.request(request));

        });

        return promises;    // a list of promises, each element is list of rooms in an area
    }

    static sendDanmu(webSession: WebSession, danmu: DanmuSettings): Promise<any> {
        const data: any = {
            'color':        0xFFFFFF,
            'fontsize':     25,
            'mode':         1,
            'msg':          danmu.msg,
            'rnd':          Math.floor(0.001 * new Date().valueOf()),
            'roomid':       danmu.roomid,
            'bubble':       0,
            'csrf':         webSession.bili_jct,
            'csrf_token':   webSession.bili_jct,
        };
        const payload = Params.stringify(data);

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/msg/send')
            .withMethod(RequestMethods.POST)
            .withContentType('application/x-www-form-urlencoded')
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .build()
        );

        return Bilibili.request(request);
    }

    static sessionInfo(appSession: AppSession): Promise<any> {
        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_token'] = appSession.access_token;
        const paramstr = Bilibili.parseAppParams(sort(params));

        const request = (RequestBuilder.start()
            .withHost('passport.bilibili.com')
            .withPath('/api/v3/oauth2/info')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build()
        );
        return Bilibili.request(request);
    }

    static isLoggedIn(webSession: WebSession): Promise<any> {
        const request = (RequestBuilder.start()
            .withHost('account.bilibili.com')
            .withPath('/home/userInfo')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );
        return Bilibili.request(request);
    }

    static startLive(webSession: WebSession, info: { roomid: number, areaid: number }): Promise<any> {
        const data: any = {};
        data['room_id'] = info.roomid;
        data['area_v2'] = info.areaid;
        data['platform'] = 'pc';
        data['csrf'] = webSession.bili_jct;
        data['csrf_token'] = webSession.bili_jct;
        const payload = Params.stringify(data)
        console.log(payload);

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/startLive')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     *
     * @returns     {Promise<any>}      { "code": 0, "message": "0", "data": { aid: 0, cid: 0, title: "", pubdate: 0, ... } }
     * */
    static videoInfo(aid: number): Promise<any> {
        const data: any = {};
        data['aid'] = aid;

        const request: Request = (RequestBuilder.start()
            .withHost('api.bilibili.com')
            .withPath('/x/web-interface/view')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.webHeaders)
            .withParams(data)
            .build()
        );
        return Bilibili.request(request);
    }

    /**
     *
     * @returns     {Promise<any>}      { "code": 0, "message": "0", "ttl": 1 }
     * */
    static clickVideo(info: { cid: number, aid: number }): Promise<any> {
        const { aid, cid } = info;
        const data: any = {};
        data['cid'] = cid;
        data['aid'] = aid;
        data['mid'] = '';
        data['part'] = 1;
        data['lv'] = 0;
        data['stime'] = Math.floor(0.001 * new Date().valueOf());
        data['ftime'] = Math.floor(data['stime'] - 3);
        data['jsonp'] = 'jsonp';
        data['type'] = 3;
        data['sub_type'] = 0;
        const payload = Params.stringify(data);

        const request: Request = (RequestBuilder.start()
            .withHost('api.bilibili.com')
            .withPath('/x/click-interface/click/web/h5')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.webHeaders)
            .withContentType('application/x-www-form-urlencoded')
            .withData(payload)
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     *
     * @returns     {Promise<any>}      { "code": 0, "message": "0", "ttl": 1 }
     * */
    static watchVideo(webSession: WebSession | null, info: { cid: number, aid: number }, time: number = 0): Promise<any> {
        const { aid, cid } = info;
        const data: any = {};
        data['cid'] = cid;
        data['aid'] = aid;
        data['mid'] = (webSession && webSession.DedeUserID) || '';
        data['played_time'] = time;
        data['real_time'] = time;
        data['type'] = 3;
        data['dt'] = 2;
        data['play_type'] = 0;
        data['start_ts'] = Math.floor(0.001 * new Date().valueOf()) - data['played_time'];
        const payload = Params.stringify(data);

        let preRequest: RequestBuilder = (RequestBuilder.start()
            .withHost('api.bilibili.com')
            .withPath('/x/report/web/heartbeat')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.webHeaders)
            .withContentType('application/x-www-form-urlencoded')
            .withData(payload)
        );
        if (webSession) {
            preRequest = preRequest.withCookies(webSession);
        }
        const request: Request = preRequest.build();

        return Bilibili.request(request);
    }

    static appSign(str: string): string {
        return crypto.createHash('md5').update(str + config.appSecret).digest('hex');
    }

    static parseAppParams(params: {[key: string]: string}): string {
        const presigned: string = Params.stringify(params);
        const signature: string = Bilibili.appSign(presigned);
        return `${presigned}&sign=${signature}`;
    }
}


function sort(obj: {[key: string]: any}): {[key: string]: any} {
    const sorted = Object.create(null);
    Object.keys(obj).sort().forEach(key => {
        sorted[key] = obj[key];
    });
    return sorted;
}
