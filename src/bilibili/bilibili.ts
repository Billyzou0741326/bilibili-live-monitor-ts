import * as crypto from 'crypto';
import * as chalk from 'chalk';
import { EventEmitter } from 'events';
import {
    BilibiliError,
    BilibiliBase,
    AppSession,
    WebSession, } from './index';
import {
    Request,
    Response,
    Xhr, } from '../net/index';
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
import {
    RateLimiter, } from '../task/index';


const rateLimiter = new RateLimiter(10, 1000);


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
    public static login(username: string, password: string): Promise<any> {
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

            const request: Request = (Request.Builder()
                .withHost('passport.bilibili.com')
                .withPath('/api/v3/oauth2/login')
                .withMethod(Request.POST)
                .withHeaders(config.appHeaders)
                .withData(payload)
                .withContentType('application/x-www-form-urlencoded')
                .build()
            );
            return Bilibili.request(request);
        });
    }

    public static obtainLoginKey(): Promise<any> {
        const data: any = {};
        Object.assign(data, config.appCommon);
        data['appkey'] = config.appkey;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload: string = Bilibili.parseAppParams(sort(data));

        const request: Request = (Request.Builder()
            .withHost('passport.bilibili.com')
            .withPath('/api/oauth2/getKey')
            .withMethod(Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );
        return Bilibili.request(request);
    }

    public static sessionInfo(session: {app: AppSession, web: WebSession}): Promise<any> {
        const access_token = session.app.access_token;
        const params: any = Object.assign(new Object(), config.appCommon);

        params['access_token'] = access_token;
        params['device'] = 'phone';
        params['buvid'] = config.appHeaders.buvid;
        params['bili_jct'] = session.web.bili_jct;
        params['SESSDATA'] = session.web.SESSDATA;
        params['DedeUserID'] = session.web.DedeUserID;
        params['DedeUserID__ckMd5'] = session.web.DedeUserID__ckMd5;
        params['sid'] = session.web.sid;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload: string = Bilibili.parseAppParams(sort(params));

        const request: Request = Request.Builder().
            withHost('passport.bilibili.com').
            withPath('/api/v3/oauth2/info').
            withMethod(Request.GET).
            withHeaders(config.appHeaders).
            withParams(payload).
            build();
        return Bilibili.request(request);

        ////////////////////////////// return value ////////////////////////////////
        //// After refreshing / expired, the refresh token and access token
        //// becomes invalid, and it is ILLEGAL to reuse the token
        // {
        //     "message": "您的账号存在高危异常行为，为了您的账号安全，请验证后登录帐号。",
        //     "ts": 1589223636,
        //     "code": 61000
        // }
        //// Otherwise, it's fine
        // {
        //     "ts": 1589225399,
        //     "code": 0,
        //     "data": {
        //         "mid": 26293612,
        //         "access_token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx551",
        //         "expires_in": 2587299
        //     }
        // }
    }

    public static getCookiesFromToken(appSession: AppSession | string): Promise<{[key:string]: string}> {
        let access_token: string = '';
        if (typeof appSession === 'string') {
            access_token = appSession;
        } else {
            access_token = appSession.access_token;
        }

        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = access_token;
        params['domain'] = '.bigfunapp.cn';
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        params['webview_cookie'] = 1;
        const query: string = Bilibili.parseAppParams(sort(params));

        const request: Request = Request.Builder().
            withHost('passport.bigfunapp.cn').
            withPath('/api/login/sso').
            withMethod(Request.GET).
            withHeaders(config.appHeaders).
            withParams(query).
            build();
        return (async(): Promise<{[key:string]: string}> => {
            const response: Response = await new Xhr().request(request);
            const headers = response.headers;
            if (typeof headers['set-cookie'] === 'undefined') {
                return {};
            }
            const cookies = Cookies.parseSetCookie(headers['set-cookie']);
            return cookies;
        })();

        ////////////////////////////// return value ////////////////////////////////
        ////// The access_token has expired or invalidified
        // {
        //     "sid": "xxxxxxxx"
        // }
        //
        ////// Otherwise, all is good
        // {
        //     "sid": "ijy21zh8",
        //     "DedeUserID": "26293612",
        //     "SESSDATA": "5e72c94d%2C1591818209%2C33b6ca51",
        //     "bili_jct": "968c1adc067b2b9296fea53d2acf5664"
        // }
    }

    public static refreshToken(appSession: AppSession): Promise<any> {
        const access_token = appSession.access_token;
        const refresh_token = appSession.refresh_token;

        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_token'] = access_token;
        data['refresh_token'] = refresh_token;
        const payload: string = Bilibili.parseAppParams(sort(data));

        const request: Request = Request.Builder().
            withHost('passport.bilibili.com').
            withPath('/api/v2/oauth2/refresh_token').
            withMethod(Request.POST).
            withHeaders(config.appHeaders).
            withData(payload).
            withContentType('application/x-www-form-urlencoded').
            build();
        return Bilibili.request(request);

        ////////////////////////////// return value ////////////////////////////////
        ////// After refreshing, the refresh token and access token becomes
        ////// invalid, and it is ILLEGAL to reuse the tokens for refreshing
        // {
        //     "ts": 1589166077,
        //     "message": "Account is not logined.",
        //     "code": -101
        // }
        //
        ////// A pair of mismatch refresh(access) tokens
        // {
        //     "ts": 1589165904,
        //     "message": "refresh_token not match.",
        //     "code": -903
        // }
        //
        ////// Otherwise, all is good (same return value as oauth2/login)
        // {
        //     "ts": 1589225400,
        //     "code": 0,
        //     "data": {
        //         "token_info": {
        //             "mid": xxxxxxxx,
        //             "access_token": "xxxxxxxxxxxxxxxxxxxxxxxxa53df351",
        //             "refresh_token": "xxxxxxxxxxxxxxxxxxxxxxxx6caeab51",
        //             "expires_in": 2592000
        //         },
        //         "cookie_info": {
        //             "cookies": [
        //                 {
        //                     "name": "bili_jct",
        //                     "value": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "DedeUserID",
        //                     "value": "xxxxxx12",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "DedeUserID__ckMd5",
        //                     "value": "xxxxxxxxxxxxx6eb",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "sid",
        //                     "value": "k5iy6q0w",
        //                     "http_only": 0,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 },
        //                 {
        //                     "name": "SESSDATA",
        //                     "value": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        //                     "http_only": 1,
        //                     "expires": 1591817400,
        //                     "type": 0
        //                 }
        //             ],
        //             "domains": [
        //                 ".bilibili.com",
        //                 ".biligame.com",
        //                 ".im9.com",
        //                 ".bigfunapp.cn"
        //             ]
        //         },
        //         "sso": [
        //             "https://passport.bilibili.com/api/v2/sso",
        //             "https://passport.biligame.com/api/v2/sso",
        //             "https://passport.im9.com/api/v2/sso",
        //             "https://passport.bigfunapp.cn/api/v2/sso"
        //         ],
        //         "is_tourist": false
        //     }
        // }
    }

    /**
     * Gets raffle info in a given room (APP API)
     *
     * @static
     * @param   {Integer}   roomid
     * @returns {Promise}   resolve(json)   reject(String)
     */
    public static appGetLottery(roomid: number): Promise<any> {
        const data: any = {};
        Object.assign(data, config.appCommon);
        // data['appkey'] = config.appkey;
        // data['actionKey'] = 'appkey';
        data['roomid'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload: string = Bilibili.parseAppParams(sort(data));

        const request: Request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/lottery/getLotteryInfo')
            .withMethod(Request.GET)
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
    public static appJoinGift(appSession: AppSession, giftData: Gift): Promise<any> {
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

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v4/smalltv/Getaward')
            .withMethod(Request.POST)
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
    public static appJoinPK(appSession: AppSession, pkData: PK): Promise<any> {
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

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/pk/join')
            .withMethod(Request.POST)
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
    public static appJoinGuard(appSession: AppSession, guardData: Guard): Promise<any> {
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

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v2/Lottery/join')
            .withMethod(Request.POST)
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
    public static appJoinStorm(appSession: AppSession, stormData: Storm): Promise<any> {
        const access_key = appSession.access_token;
        const { id } = stormData;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['id'] = id;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/lottery-interface/v1/storm/Join')
            .withMethod(Request.POST)
            .withHeaders(config.appHeaders)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }
    // */

    /** 直播间历史模仿 */
    public static appRoomEntry(appSession: AppSession, roomid: number): Promise<any> {
        const access_key = appSession.access_token;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['access_key'] = access_key;
        data['actionKey'] = 'appkey';
        data['device'] = 'android';
        data['jumpFrom'] = 0;
        data['room_id'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        const payload = Bilibili.parseAppParams(sort(data));

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/room_entry_action')
            .withMethod(Request.POST)
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
    public static appGetInfoByUser(appSession: AppSession, info: { roomid: number }): Promise<any> {
        const { roomid } = info;
        const data: any = Object.assign(new Object(), config.appCommon);
        data['actionKey'] = 'appkey';
        data['room_id'] = roomid;
        data['ts'] = Math.floor(0.001 * new Date().valueOf());
        data['access_key'] = appSession.access_token;
        const paramstr = Bilibili.parseAppParams(sort(data));

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/app-room/v1/index/getInfoByUser')
            .withMethod(Request.GET)
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
    public static appLiveOnlineHeart(appSession: AppSession, info: { roomid: number }) {
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

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/heartbeat/v1/OnLine/mobileOnline')
            .withMethod(Request.POST)
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
    public static shareVideo(appSession: AppSession, info: { aid: number }): Promise<any> {
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

        const request = (Request.Builder()
            .withHost('app.bilibili.com')
            .withPath('/x/v2/view/share/complete')
            .withMethod(Request.POST)
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
    public static loveClubSign(appSession: AppSession, info: { group_id: number, owner_id: number }): Promise<any> {
        const { group_id, owner_id } = info;
        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['group_id'] = group_id;
        params['owner_id'] = owner_id;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const paramstr = Bilibili.parseAppParams(params);

        const request = (Request.Builder()
            .withHost('api.vc.bilibili.com')
            .withPath('/link_setting/v1/link_setting/sign_in')
            .withMethod(Request.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build()
        );

        return Bilibili.request(request);
    }

    public static checkSilverBox(appSession: AppSession): Promise<any> {
        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const paramstr = Bilibili.parseAppParams(params);

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/lottery/v1/SilverBox/getCurrentTask')
            .withMethod(Request.GET)
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
    public static getSilverBox(appSession: AppSession, info: { time_start: number, time_end: number }): Promise<any> {
        const { time_start, time_end } = info;
        const params: any = Object.assign(new Object(), config.appCommon);
        params['access_key'] = appSession.access_token;
        params['time_start'] = time_start;
        params['time_end'] = time_end;
        params['ts'] = Math.floor(0.001 * new Date().valueOf());
        const paramstr = Bilibili.parseAppParams(params);

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/lottery/v1/SilverBox/getAward')
            .withMethod(Request.GET)
            .withHeaders(config.appHeaders)
            .withParams(paramstr)
            .build()
        );

        return Bilibili.request(request);
    }

    /** --------------------------WEB----------------------------- */

    public static mainTaskInfo(webSession: WebSession): Promise<any> {
        const request = (Request.Builder()
            .withHost('account.bilibili.com')
            .withPath('/home/reward')
            .withMethod(Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    public static liveTaskInfo(webSession: WebSession): Promise<any> {
        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/i/api/taskInfo')
            .withMethod(Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    public static liveSignInfo(webSession: WebSession): Promise<any> {
        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/sign/GetSignInfo')
            .withMethod(Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    public static liveSign(webSession: WebSession): Promise<any> {
        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/sign/doSign')
            .withMethod(Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );

        return Bilibili.request(request);
    }

    public static webGetInfoByUser(webSession: WebSession, info: { roomid: number }): Promise<any> {
        const { roomid } = info;
        const params: any = {};
        params['room_id'] = roomid;

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/web-room/v1/index/getInfoByUser')
            .withMethod(Request.GET)
            .withCookies(webSession)
            .withHeaders(config.webHeaders)
            .withParams(params)
            .build()
        );

        return Bilibili.request(request);
    }

    public static webLiveOnlineHeart(webSession: WebSession): Promise<any> {
        const data: any = {
            'csrf': webSession.bili_jct,
            'csrf_token': webSession.bili_jct,
            'visit_id': '',
        };
        const payload = Params.stringify(data);

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/User/userOnlineHeart')
            .withMethod(Request.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    public static liveDoubleWatch(webSession: WebSession): Promise<any> {
        const csrf = webSession.bili_jct;
        const data: any = {
            'task_id': 'double_watch_task',
            'csrf': csrf,
            'csrf_token': csrf,
        };
        const payload = Params.stringify(data);

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/activity/v1/task/receive_award')
            .withMethod(Request.POST)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .withContentType('application/x-www-form-urlencoded')
            .build()
        );

        return Bilibili.request(request);
    }

    public static loveClubList(webSession: WebSession): Promise<any> {
        const params: any = {
            'build': 0,
            'mobi_app': 'web',
        };

        const request = (Request.Builder()
            .withHost('api.vc.bilibili.com')
            .withPath('/link_group/v1/member/my_groups')
            .withMethod(Request.GET)
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
    public static watchVideo(webSession: WebSession | null, info: { cid: number, aid: number }, time: number = 0): Promise<any> {
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

        let preRequest: any = (Request.Builder()
            .withHost('api.bilibili.com')
            .withPath('/x/report/web/heartbeat')
            .withMethod(Request.POST)
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
    public static getAllSailboatRooms(): Promise<any> {
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
    public static getSailboatRooms(page: number): Promise<any> {
        // Page 1-3 (Rank 0-50)
        const PAGE_SIZE = 20;   // 必须是20
        const params: any = {
            'type': 'sail_boat_number',
            'page': page,
            'is_trend': 1,
            'page_size': PAGE_SIZE,
        };

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(Request.GET)
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
    public static getAllGenkiRooms(): Promise<any> {
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
    public static getGenkiRooms(page: number): Promise<any> {
        const PAGE_SIZE = 20;
        const params: any = {
            'date': 'month',
            'type': 'master_vitality_2018',
            'areaid': 0,
            'page': page,
            'is_trend': 1,
            'page_size': PAGE_SIZE,
        };

        const request: Request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/rankdb/v1/Rank2018/getWebTop')
            .withMethod(Request.GET)
            .withParams(params)
            .withHeaders(config.webHeaders)
            .build()
        );

        return Bilibili.request(request);
    }

    public static getLiveDanmuConf(roomid?: number): Promise<any> {
        const params: any = {
            'platform': 'pc',
            'player': 'web',
        };
        if (typeof roomid !== 'undefined') {
            params['room_id'] = roomid;
        }

        return new Promise((resolve, reject): void => {
            const request: Request = Request.Builder().
                withHost('api.live.bilibili.com').
                withPath('/room/v1/Danmu/getConf').
                withMethod(Request.GET).
                withParams(params).
                withHeaders(config.webHeaders).
                build();

            rateLimiter.add((): void => {
                Bilibili.request(request).
                    then((resp: any) => { resolve(resp); }).
                    catch((error: any) => { reject(error); });
            });
        });
    }
    
    public static getLiveDanmuToken(roomid?: number): Promise<string> {
        return (async(): Promise<string> => {
            const resp: any = await Bilibili.getLiveDanmuConf(roomid);
            if (resp['code'] !== 0) {
                throw new BilibiliError(`live token failed ${resp['msg'] || resp['message'] || ''}`);
            }
            return resp['data']['token'];
        })();
    }

    /**
     * Get number of rooms streaming
     *
     * @static
     * @returns {Promise}   resolve(Integer)    reject(String)
     */
    public static getLiveCount(areaid: number = 0): Promise<number> {
        if (![0, 1, 2, 3, 4, 5, 6, 7].includes(areaid)) {
            areaid = 0;
        }
        const params: any = {
            'parent_area_id': areaid,
            'page': 1,
            'page_size': 1,
            'sort_type': 'live_time',
        };
        const request: Request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v3/area/getRoomList')
            .withMethod(Request.GET)
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
    public static getRoomInfo(roomid: number): Promise<any> {
        const params: any = {
            'room_id': roomid,
        };
        const request: Request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/xlive/web-room/v1/index/getInfoByRoom')
            .withMethod(Request.GET)
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
    public static isLive(roomid: number): Promise<boolean> {
        return Bilibili.getRoomInfo(roomid).then((jsonObj: any): boolean => {
            const isLive: boolean = jsonObj['data']['room_info']['live_status'] === 1 ? true : false;
            return isLive;
        });
    }

    public static getRoomCountV1(): Promise<number> {
        const params: any = {
            'areaId': 0,
        };
        const request: Request = Request.Builder().
            withHost('api.live.bilibili.com').
            withPath('/room/v1/Area/getLiveRoomCountByAreaID').
            withMethod(Request.GET).
            withParams(params).
            withHeaders(config.webHeaders)
        ;
        return Bilibili.request(request).
            then((json: any): number => {
                return json['data']['num'];
            });
    }

    /**
     * Get rooms in each area, with stream-like api
     *
     * @static
     * @param   {Integer}       size (page size)        default 99
     * @param   {Integer}       count (rooms to get)    don't use this.
     * @returns {EventEmitter}  'roomids'   (number[]) => {}
     *          {EventEmitter}  'done'      () => {}
     *          {EventEmitter}  'Error'     (error) => {}
     */
    public static getRoomV1Stream(size: number = 500, count: number = Infinity): EventEmitter {
        const emitter = new EventEmitter;
        size = size <= 0 ? 10 : size;
        (async(): Promise<void> => {
            let room_count = await Bilibili.getRoomCountV1().catch((error: Error): number => 10000);
            room_count = Math.min(room_count, count);
            const PAGES: number = Math.ceil(room_count / size) + (count === Infinity ? 1 : 0); // If querying all rooms, add one page to query
            const pageTasks: Promise<void>[] = [];
            for (let i = 1; i < PAGES; ++i) {
                const params: any = {
                    'page': i,
                    'pageSize': size,
                };
                const request: Request = Request.Builder().
                    withHost('api.live.bilibili.com').
                    withPath('/room/v1/Area/getListByAreaID').
                    withMethod(Request.GET).
                    withParams(params).
                    withHeaders(config.webHeaders)
                ;
                pageTasks.push((async(): Promise<void> => {
                    const res = await Bilibili.request(request).catch((error: Error): void => { emitter.emit('error', error) });
                    const roomids: number[] = res['data'].map((data: any): number => data['roomid']);
                    emitter.emit('roomids', roomids);
                })());
            }
            await Promise.all(pageTasks).catch((error: Error): void => { emitter.emit('error', error) });
            emitter.emit('done');
        })();
        return emitter;
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
    public static getRoomsInArea(areaid: number, size: number = 99, count: number = Infinity, sortType: string = 'online'): Promise<any> {
        const page_size = size > 99 || size < 0 ? 99 : size;
        const ok_sort_types = [ 'live_time', 'online', 'sort_type_169' ];
        if (!ok_sort_types.includes(sortType)) {
            sortType = ok_sort_types[0];
        }

        let promises: Promise<any>[] = [];

        const promise = Bilibili.getLiveCount(areaid).catch((error: any): Promise<number> => {

            cprint(`Bilibili.getLiveCount - ${error.message}`, chalk.red);
            return Promise.resolve(5000);    // on error return 5000

        }).then((room_count: number): Promise<any> => {

            room_count = Math.min(count, room_count);
            const PAGES: number = Math.ceil(room_count / page_size) + (count === Infinity ? 1 : 0); // If querying all rooms, add one page to query

            for (let i = 1; i <= PAGES; ++i) {
                const params: any = {
                    'parent_area_id': areaid, 
                    'page': i, 
                    'page_size': page_size, 
                    'sort_type': sortType,
                };

                const request: Request = (Request.Builder()
                    .withHost('api.live.bilibili.com')
                    .withPath('/room/v3/area/getRoomList')
                    .withMethod(Request.GET)
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
    public static getRoomsInEachArea(): Promise<any>[] {
        const params: any = {
            'parent_area_id': 0, 
            'page': 1, 
            'page_size': 10, 
            'sort_type': 'online', 
        };
        const areas: number[] = [ 1, 2, 3, 4, 5, 6, ];

        let promises: Promise<any>[] = [];

        for (const areaid of areas) {

            params['parent_area_id'] = areaid;
            const request: Request = (Request.Builder()
                .withHost('api.live.bilibili.com')
                .withPath('/room/v3/area/getRoomList')
                .withMethod(Request.GET)
                .withHeaders(config.webHeaders)
                .withParams(params)
                .build()
            );

            promises.push(Bilibili.request(request));

        }

        return promises;    // a list of promises, each element is list of rooms in an area
    }

    public static sendDanmu(webSession: WebSession, danmu: DanmuSettings): Promise<any> {
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

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/msg/send')
            .withMethod(Request.POST)
            .withContentType('application/x-www-form-urlencoded')
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .withData(payload)
            .build()
        );

        return Bilibili.request(request);
    }

    public static isLoggedIn(webSession: WebSession): Promise<any> {
        const request = (Request.Builder()
            .withHost('account.bilibili.com')
            .withPath('/home/userInfo')
            .withMethod(Request.GET)
            .withHeaders(config.webHeaders)
            .withCookies(webSession)
            .build()
        );
        return Bilibili.request(request);
    }

    public static startLive(webSession: WebSession, info: { roomid: number, areaid: number }): Promise<any> {
        const data: any = {};
        data['room_id'] = info.roomid;
        data['area_v2'] = info.areaid;
        data['platform'] = 'pc';
        data['csrf'] = webSession.bili_jct;
        data['csrf_token'] = webSession.bili_jct;
        const payload = Params.stringify(data)

        const request = (Request.Builder()
            .withHost('api.live.bilibili.com')
            .withPath('/room/v1/Room/startLive')
            .withMethod(Request.POST)
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
    public static videoInfo(aid: number): Promise<any> {
        const data: any = {};
        data['aid'] = aid;

        const request: Request = (Request.Builder()
            .withHost('api.bilibili.com')
            .withPath('/x/web-interface/view')
            .withMethod(Request.GET)
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
    public static clickVideo(info: { cid: number, aid: number }): Promise<any> {
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

        const request: Request = (Request.Builder()
            .withHost('api.bilibili.com')
            .withPath('/x/click-interface/click/web/h5')
            .withMethod(Request.POST)
            .withHeaders(config.webHeaders)
            .withContentType('application/x-www-form-urlencoded')
            .withData(payload)
            .build()
        );

        return Bilibili.request(request);
    }

    private static appSign(str: string): string {
        return crypto.createHash('md5').update(str + config.appSecret).digest('hex');
    }

    private static parseAppParams(params: {[key: string]: string}): string {
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
