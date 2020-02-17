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

export class AppConfig implements AppSettings {

    private _debug:         boolean;
    private _verbose:       boolean;
    private _tcp_error:     boolean;
    private _appkey:        string;
    private _appSecret:     string;
    private _appCommon:     {[key: string]: any};
    private _appHeaders:    {[key: string]: string};
    private _webHeaders:    {[key: string]: string};
    private _initialized:   boolean;
    private _danmuAddr:     TCPAddress;
    private _wsAddr:        TCPAddress;
    private _biliveAddr:    TCPAddress;
    private _httpAddr:      TCPAddress;

    constructor() {
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
    }

    init() {
        if (this._initialized === false) {
            this.readArgs();
            this._initialized = true;
        }
    }

    readArgs(): AppConfig {
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

    get danmuAddr(): TCPAddress {
        return this._danmuAddr;
    }

    get wsAddr(): TCPAddress {
        return this._wsAddr;
    }

    get httpAddr(): TCPAddress {
        return this._httpAddr;
    }

    get biliveAddr(): TCPAddress {
        return this._biliveAddr;
    }

    get debug(): boolean {
        return this._debug;
    }

    get verbose(): boolean {
        return this._verbose;
    }

    get tcp_error(): boolean {
        return this._tcp_error;
    }

    get appkey(): string {
        return this._appkey;
    }

    get appSecret(): string {
        return this._appSecret;
    }

    get appCommon(): {[key:string]:string} {
        return this._appCommon;
    }

    get appHeaders(): {[key:string]:string} {
        return this._appHeaders;
    }

    get webHeaders(): {[key:string]:string} {
        return this._webHeaders;
    }
}

const statistics: {[key:string]:string|number} = {
    'appId': 1,
    'platform': 3,
    'version': '5.53.1',
    'abtest': '507',
};
const appkey: string = '1d8b6e7d45233436';
const appSecret: string = '560c52ccd288fed045859ed18bffd973';
const appCommon: {[key:string]:string|number} = {
    'appkey': appkey,
    'build': 5531000,
    'channel': 'html5_app_bili',
    'device': 'android',
    'mobi_app': 'android',
    'platform': 'android',
    'statistics': JSON.stringify(statistics),
};
const appHeaders: {[key:string]:string} = {
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 BiliDroid/5.53.1 (bbcallen@gmail.com)',
};

const webHeaders: {[key:string]:string} = {
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36',
};
