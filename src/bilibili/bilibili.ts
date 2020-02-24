import * as crypto from 'crypto';
import * as chalk from 'chalk';
import {
    BilibiliError,
    BilibiliBase,
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
    PK,
    Gift,
    Guard,
    Storm, } from '../danmu/index';
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
     * @static
     * @param   {Object}    session
     * @param   {Object}    giftData
     * @param   {Integer}   giftData.id
     * @param   {Integer}   giftData.roomid
     * @param   {String}    giftData.type
     */
    static appJoinGift(appSession: AppSession, giftData: Gift): Promise<any> {
        const { id, roomid, type } = giftData;
        const access_key = appSession.access_token;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['raffleId'] = id;
        data['roomid'] = roomid;
        data['type'] = type;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v4/smalltv/Getaward')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * @static
     * @param   {Object}    session
     * @param   {Object}    pkData
     * @param   {Integer}   pkData.id
     * @param   {Integer}   pkData.roomid
     */
    static appJoinPK(appSession: AppSession, pkData: PK): Promise<any> {
        const { id, roomid } = pkData;
        const access_key = appSession.access_token;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['id'] = id;
        data['roomid'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/pk/join')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * @static
     * @param   {Object}    session
     * @param   {Object}    guardData
     * @param   {Integer}   guardData.id
     * @param   {Integer}   guardData.roomid
     * @param   {String}    guardData.type
     */
    static appJoinGuard(appSession: AppSession, guardData: Guard): Promise<any> {
        const { id, roomid, type } = guardData;
        const access_key = appSession.access_token;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['id'] = id;
        data['roomid'] = roomid;
        data['type'] = type || 'guard';
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v2/Lottery/join')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * @static
     * @param   {Object}    session
     * @param   {Object}    stormData
     * @param   {Integer}   stormData.id
     */
    static appJoinStorm(appSession: AppSession, stormData: Storm): Promise<any> {
        const access_key = appSession.access_token;
        const { id } = stormData;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['id'] = id;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/storm/Join')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }
    // */

    /** 直播间历史模仿 */
    static appRoomEntry(appSession: AppSession, roomid: number): Promise<any> {
        const access_key = appSession.access_token;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['jumpFrom'] = 0;
        data['room_id'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/room_entry_action')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * Necessary for double-watch
     *
     * @param   session     Object
     * @param   info        Object
     *          roomid      Int     房间号
     */
    static appGetInfoByUser(appSession: AppSession, info: { roomid: number }): Promise<any> {
        const { roomid } = info;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['actionKey'] = 'appkey';
        data['room_id'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        data['access_key'] = appSession.access_token;
        const paramstr = Bilibili.parseAppParams(sort(data));

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/app-room/v1/index/getInfoByUser')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build()
        );

        return Bilibili.request(request);
    }


    /**
     * Live Exp / double watch
     *
     * @param   session     Object
     * @param   info        Object
     *          info.roomid Int     房间号
     */
    static appLiveOnlineHeart(appSession: AppSession, info: { roomid: number }) {
        const { roomid } = info;
        const data: any = {
            'room_id': roomid,
            'scale': 'xhdpi',
        };
        const payload = Params.stringify(data);

        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const paramstr = Bilibili.parseAppParams(sort(params));

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/heartbeat/v1/OnLine/mobileOnline')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * @param   access_key  String      
     * @param   info        Object
     *   info.  aid         Int     视频id
     */
    static shareVideo(appSession: AppSession, info: { aid: number }): Promise<any> {
        const { aid } = info;
        const access_key = appSession.access_token;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['aid'] = aid;
        data['share_channel'] = 'qq';
        data['share_trace_id'] = crypto.randomBytes(16).toString('hex');
        data['from'] = 'main.ugc-video-detail.0.0';
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (RequestBuilder.start()
            .withHost('app.bilibili.com')
            .withPath('/x/v2/view/share/complete')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * @param   access_key  
     * @param   info        Object
     *   info.  group_id    Int     应援团id
     *   info.  owner_id    Int     应援对象id
     */
    static loveClubSign(appSession: AppSession, info: { group_id: number, owner_id: number }): Promise<any> {
        const { group_id, owner_id } = info;
        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['group_id'] = group_id;
        params['owner_id'] = owner_id;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const paramstr = Bilibili.parseAppParams(params);

        const request = (RequestBuilder.start()
            .withHost('api.vc.bilibili.com')
            .withPath('/link_setting/v1/link_setting/sign_in')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build()
        );

        return Bilibili.request(request);
    }

    static checkSilverBox(appSession: AppSession): Promise<any> {
        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const paramstr = Bilibili.parseAppParams(params);

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/lottery/v1/SilverBox/getCurrentTask')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build()
        );

        return Bilibili.request(request);
    }

    /**
     * @param   access_key  
     * @param   info        Object
     *          time_start  Int     银瓜子时段起始
     *          time_end    Int     银瓜子时段终末
     */
    static getSilverBox(appSession: AppSession, info: { time_start: number, time_end: number }): Promise<any> {
        const { time_start, time_end } = info;
        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['time_start'] = time_start;
        params['time_end'] = time_end;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const paramstr = Bilibili.parseAppParams(params);

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/lottery/v1/SilverBox/getAward')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build()
        );

        return Bilibili.request(request);
    }

    /** --------------------------WEB----------------------------- */

    static mainTaskInfo(webSession: WebSession): Promise<any> {
        const request = (RequestBuilder.start()
            .withHost('account.bilibili.com')
            .withPath('/home/reward')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    static liveTaskInfo(webSession: WebSession): Promise<any> {
        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/i/api/taskInfo')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    static liveSignInfo(webSession: WebSession): Promise<any> {
        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/sign/GetSignInfo')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    static liveSign(webSession: WebSession): Promise<any> {
        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/sign/doSign')
            .withMethod(RequestMethods.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    static webGetInfoByUser(webSession: WebSession, info: { roomid: number }): Promise<any> {
        const { roomid } = info;
        const params: any = {};
        params['room_id'] = roomid;

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/web-room/v1/index/getInfoByUser')
            .withMethod(RequestMethods.GET)
            .withCookies(webSession)
            .withHeaders(config.webHeaders)
            .withParams(params)
            .build()
        );

        return Bilibili.request(request);
    }

    static webLiveOnlineHeart(webSession: WebSession): Promise<any> {
        const data: any = {
            'csrf': webSession.bili_jct,
            'csrf_token': webSession.bili_jct,
            'visit_id': '',
        };
        const payload = Params.stringify(data);

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/User/userOnlineHeart')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    static liveDoubleWatch(webSession: WebSession): Promise<any> {
        const csrf = webSession.bili_jct;
        const data: any = {
            'task_id': 'double_watch_task',
            'csrf': csrf,
            'csrf_token': csrf,
        };
        const payload = Params.stringify(data);

        const request = (RequestBuilder.start()
            .withHost('api.live.bilibili.com')
            .withPath('/activity/v1/task/receive_award')
            .withMethod(RequestMethods.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    static loveClubList(webSession: WebSession): Promise<any> {
        const params: any = {
            'build': 0,
            'mobi_app': 'web',
        };

        const request = (RequestBuilder.start()
            .withHost('api.vc.bilibili.com')
            .withPath('/link_group/v1/member/my_groups')
            .withMethod(RequestMethods.GET)
            .withParams(params)
            .withCookies(webSession)
            .withHeaders(config.webHeaders)
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
        const page_size = size > 99 || size < 0 ? 99 : size;

        let promises: Promise<any>[] = [];

        const promise = Bilibili.getLiveCount().catch((error: any): Promise<number> => {

            cprint(`Bilibili.getLiveCount - ${error.message}`, chalk.red);
            return Promise.resolve(5000);    // on error return 5000

        }).then((room_count: number): Promise<any> => {

            room_count = Math.min(count, room_count);
            const PAGES: number = Math.round(room_count / page_size) + 2;

            for (let i = 1; i < PAGES; ++i) {
                const params: any = {
                    'parent_area_id': areaid, 
                    'page': i, 
                    'page_size': page_size, 
                    'sort_type': 'live_time',
                };

                const request: Request = (RequestBuilder.start()
                    .withHost('api.live.bilibili.com')
                    .withPath('/room/v3/area/getRoomList')
                    .withMethod(RequestMethods.GET)
                    .withParams(params)
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
