import * as settings from '../settings.json';

export interface AppSettings {

    readonly debug:         boolean;
    readonly verbose:       boolean;
    readonly tcp_error:     boolean;
    readonly appkey:        string;
    readonly appSecret:     string;
    readonly appCommon:     {[key: string]: any};
    readonly appHeaders:    {[key: string]: string};
    readonly webHeaders:    {[key: string]: string};
    [propName: string]:     any;

}

export interface TCPAddress {
    readonly host?:         string;
    readonly port:          number;
}

export interface LoadBalancing {
    readonly totalServers:  number;
    readonly serverIndex:   number;
}

export interface RoomCollectorStrategy {
    readonly fixedRoomExpiry:           number;
    readonly dynamicRoomsQueryInterval: number;
}

export class AppConfig implements AppSettings {

    private _debug:                     boolean;
    private _verbose:                   boolean;
    private _tcp_error:                 boolean;
    private _appkey:                    string;
    private _appSecret:                 string;
    private _appCommon:                 {[key: string]: any};
    private _appHeaders:                {[key: string]: string};
    private _webHeaders:                {[key: string]: string};
    private _initialized:               boolean;
    private _danmuAddr:                 TCPAddress;
    private _wsAddr:                    TCPAddress;
    private _biliveAddr:                TCPAddress;
    private _bilihelperAddr:            TCPAddress;
    private _httpAddr:                  TCPAddress;
    private _loadBalancing:             LoadBalancing;
    private _roomCollectorStrategy:     RoomCollectorStrategy;

    public constructor() {
        this._debug = false;
        this._verbose = false;
        this._tcp_error = false;
        this._appkey = appkey;
        this._appSecret = appSecret;
        this._appCommon = appCommon;
        this._appHeaders = appHeaders;
        this._webHeaders = webHeaders;
        this._initialized = false;
        this._danmuAddr = settings['bilibili-danmu'] as TCPAddress;
        this._wsAddr = settings['default-ws-server'] as TCPAddress;
        this._httpAddr = settings['default-http-server'] as TCPAddress;
        this._biliveAddr = settings['bilive-ws-server'] as TCPAddress;
        this._bilihelperAddr = settings['bilihelper-tcp-server'] as TCPAddress;
        this._loadBalancing = settings['load-balancing'] as LoadBalancing;
        this._roomCollectorStrategy = settings['room-collector-strategy'] as RoomCollectorStrategy;
    }

    public init() {
        if (this._initialized === false) {
            this.readArgs();
            this._initialized = true;
        }
    }

    public readArgs(): AppConfig {
        if (process.argv.includes('-v')) {
            this._verbose = true;
        }
        if (process.argv.includes('--debug')) {
            this._debug = true;
        }
        if (process.argv.includes('--tcp-error')) {
            this._tcp_error = true;
        }
        return this;
    }

    public get danmuAddr(): TCPAddress {
        return this._danmuAddr;
    }

    public get wsAddr(): TCPAddress {
        return this._wsAddr;
    }

    public get httpAddr(): TCPAddress {
        return this._httpAddr;
    }

    public get biliveAddr(): TCPAddress {
        return this._biliveAddr;
    }

    public get bilihelperAddr(): TCPAddress {
        return this._bilihelperAddr;
    }

    public get loadBalancing(): LoadBalancing {
        return this._loadBalancing;
    }

    public get roomCollectorStrategy(): RoomCollectorStrategy {
        return this._roomCollectorStrategy;
    }

    public get debug(): boolean {
        return this._debug;
    }

    public get verbose(): boolean {
        return this._verbose;
    }

    public get tcp_error(): boolean {
        return this._tcp_error;
    }

    public get appkey(): string {
        return this._appkey;
    }

    public get appSecret(): string {
        return this._appSecret;
    }

    public get appCommon(): {[key:string]:string} {
        return this._appCommon;
    }

    public get appHeaders(): {[key:string]:string} {
        return this._appHeaders;
    }

    public get webHeaders(): {[key:string]:string} {
        return this._webHeaders;
    }
}

const statistics: {[key:string]:string|number} = {
    'appId': 1,
    'platform': 3,
    'version': '5.55.1',
    'abtest': '',
};
// const appkey: string = 'fb2c5b71e05297d0';                          // Alternative  APP_KEY
// const appSecret: string = '0a32fa204cd3a2f857cbe73444511e32';       // Alternative  SECRET_KEY
const appkey: string = '1d8b6e7d45233436';
const appSecret: string = '560c52ccd288fed045859ed18bffd973';
const appCommon: {[key:string]:string|number} = {
    'appkey': appkey,
    'build': 5551100,
    'channel': 'bili',
    'device': 'android',
    'mobi_app': 'android',
    'platform': 'android',
    'statistics': JSON.stringify(statistics),
};
const appHeaders: {[key:string]:string} = {
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 BiliDroid/5.55.1 (bbcallen@gmail.com)',
};

const webHeaders: {[key:string]:string} = {
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
};
