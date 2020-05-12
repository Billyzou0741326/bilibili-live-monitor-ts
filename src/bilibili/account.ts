import * as fs from 'fs';
import * as path from 'path';
import * as table from 'table';
import * as chalk from 'chalk';
import { cprint } from '../fmt/index';
import { Bilibili } from './index';
import {
    Danmu,
    DanmuMonitor, } from '../danmu/index';


interface LoginInfo {
    readonly username:          string;
    readonly password:          string;
}

export interface AppSession {
    readonly access_token:      string;
    readonly refresh_token:     string;
    readonly mid?:              number;
    readonly expires_in?:       number;
}

export interface WebSession {
    readonly bili_jct:          string;
    readonly DedeUserID?:       string;
    readonly DedeUserID__ckMd5?:string;
    readonly sid?:              string;
    readonly SESSDATA:          string;
}


export class Account {

    private _filename:      string;
    private _loginInfo:     LoginInfo;
    private _webSession:    WebSession;
    private _appSession:    AppSession;
    private _fsWriteTask:   Promise<void>;  // noexcept

    public constructor(info?: LoginInfo) {
        this._filename = path.resolve(__dirname, 'user.json');
        this._fsWriteTask = (async() => {})();
        this._loginInfo = info || {
            username:           '',
            password:           '',
        } as LoginInfo;
        this._webSession = {
            bili_jct:           '',
            DedeUserID:         '',
            DedeUserID__ckMd5:  '',
            sid:                '',
            SESSDATA:           '',
        } as WebSession;
        this._appSession = {
            access_token:       '',
            refresh_token:      '',
            mid:                0,
            expires_in:         0,
        } as AppSession;
        this.bind();
    }

    private bind(): void {
        this.saveToFile_ = this.saveToFile_.bind(this);
        this.loadFromFile = this.loadFromFile.bind(this);
        this.storeSession = this.storeSession.bind(this);
    }

    public withLoginInfo(loginInfo: LoginInfo): this {
        this._loginInfo = loginInfo;
        return this;
    }

    public withCookies(cookies: {[key: string]: string | number | null} | string): this {
        return this;
    }

    public withTokens(tokens: {[key: string]: string | number | null} | string): this {
        return this;
    }

    public get cookies(): WebSession {
        return this._webSession;
    }

    public get tokens(): AppSession {
        return this._appSession;
    }

    public get username(): string {
        return this._loginInfo.username;
    }

    public get password(): string {
        return this._loginInfo.password;
    }

    public isUsable(): boolean {
        return !!(
            this._webSession.bili_jct
            && this._webSession.SESSDATA
            && this._appSession.access_token
            && this._appSession.refresh_token
        );
    }

    public needsLogin(): Promise<boolean> {
        return Bilibili.sessionInfo({app: this.tokens, web: this.cookies}).then((resp: any): boolean => {
            const code: number = resp['code'];
            let expiresIn = -1;

            if (code === 0) {
                expiresIn = resp['data']['expires_in'];
            }

            return expiresIn < 2 * 24 * 60 * 60;
        }).catch((error: Error): Promise<boolean> => {
            cprint(`(LoginStatus) - ${error.message}`, chalk.red);
            return Promise.resolve(true);
        });
    }

    public refresh(): Promise<any> {
        if (!this.isUsable()) {
            return Promise.reject(new Error('(Login) - No available token fore refresh'));
        }

        return Bilibili.refreshToken(this.tokens).
                then(Account.raiseForIllegalSessionResponse).
                then(this.storeSession);
    }

    public login(): Promise<any> {
        if (!(this._loginInfo.username && this._loginInfo.password)) {
            return Promise.reject(new Error('(Login) - 用户名/密码未提供'));
        }

        if (this.isUsable()) {
            /* Refresh */
            return this.refresh();
        }

        return Bilibili.login(this._loginInfo.username, this._loginInfo.password).
                then(Account.raiseForIllegalSessionResponse).
                then(this.storeSession);
    }

    private storeSession(resp: any): any {
        const data: any = resp['data'];
        const app: any = data['token_info'];
        const web: any = {};
        data['cookie_info']['cookies'].forEach((entry: any): void => {
            web[entry['name']] = entry['value'];
        });

        const appSession = {
            access_token:       app['access_token'],
            refresh_token:      app['refresh_token'],
            mid:                app['mid'],
            expires_in:         app['expires_in'],
        } as AppSession;
        const webSession = {
            bili_jct:           web['bili_jct'],
            DedeUserID:         web['DedeUserID'],
            DedeUserID__ckMd5:  web['DedeUserID__ckMd5'],
            sid:                web['sid'],
            SESSDATA:           web['SESSDATA'],
        } as WebSession;

        this._appSession = appSession;
        this._webSession = webSession;
        return resp;
    }

    private static raiseForIllegalSessionResponse(resp: any): any {
        let result: any = resp;
        const code: number = resp['code'];
        const msg: string = resp['msg'] || resp['message'] || '';
        if (code !== 0) {
            throw new Error(`(Login) ${JSON.stringify(resp)}`);
        }
        if (!resp['data'] || typeof resp['data']['cookie_info'] === 'undefined') {
            throw new Error(`(Login) ${JSON.stringify(resp)}`);
        }
        return resp;
    }

    private loadFromFile(): void {
        if (!this._filename === true) {
            return;
        }

        let filename = this._filename;
        if (fs.existsSync(filename) === false) {
            return;
        }

        const str: string = fs.readFileSync(filename).toString();
        const data: any = JSON.parse(str);
        const user: LoginInfo = data['user'] as LoginInfo;
        const app: AppSession = data['app'] as AppSession;
        const web: WebSession = data['web'] as WebSession;

        this._appSession = app;
        this._webSession = web;
        if (user.username !== '' && user.password !== '') {
            this._loginInfo = user;
        }
    }

    public saveToFile(): void {
        const filename = this._filename;
        cprint(`Storing login info into ${filename}`, chalk.green);

        this.saveToFile_();
    }

    private saveToFile_(args?: any): Promise<any> {
        const filename = this._filename;

        return (async(): Promise<any> => {
            await new Promise((resolve): void => {
                fs.writeFile(filename, this.toFileFormat(), (err: any) => {
                    if (err) {
                        cprint(`(Account) SaveError - ${err.message}`, chalk.red);
                    }
                    resolve();
                });
            });
            return args;
        })();
    }

    public toFileFormat(): string {
        const data: any = {
            'user':     this._loginInfo,
            'web':      this.cookies,
            'app':      this.tokens,
        };
        return JSON.stringify(data, null, 4);
    }

}
