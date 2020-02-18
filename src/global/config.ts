import * as settings from '../settings.json';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as chalk from 'chalk';
import { cprint } from '../fmt/index';

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

export interface User {
    readonly id:            string;
    readonly password:      string;
}

export class AppConfig implements AppSettings {

    private _settingsPath:  string;
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
    private _users:         User[];

    public constructor() {
        this._settingsPath = path.resolve(__dirname, '../settings.json');
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
        this._users = [];
    }

    public init() {
        if (this._initialized === false) {
            this.readArgs()
                .parseUsers();
            this._initialized = true;
        }
    }

    public readArgs(): this {
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

    public get users(): User[] {
        return this._users;
    }

    private parseUsers(): this {
        if (settings.hasOwnProperty('users')) {
            let settingsUpdated: boolean = false;
            for (const u of settings.users) {
                const user = u as any;
                if (user.hasOwnProperty('id')) {
                    if (!user.hasOwnProperty('password') && user.hasOwnProperty('plainTextPassword')) {
                        user.password = crypto.createHash('sha512').update(user.plainTextPassword).digest('base64');
                        delete user['plainTextPassword'];
                        settingsUpdated = true;
                    }

                    if (user.hasOwnProperty('password')) {
                        this._users.push(user as User);
                    }
                }
            }

            if (settingsUpdated) {
                this.saveToFile().catch((error: any) => {
                    cprint(`saveToFile - ${error.message}`, chalk.red);
                });
            }
        }
        return this;
    }

    private saveToFile(): Promise<boolean> {
        const data: string = JSON.stringify(settings, null, 4);
        return new Promise<boolean>((resolve, reject) => {
            fs.writeFile(this._settingsPath, data, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(true);
                }
            })
        });
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
