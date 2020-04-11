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
    readonly mid:               number;
    readonly expires_in:        number;
}

export interface WebSession {
    readonly bili_jct:          string;
    readonly DedeUserID:        string;
    readonly DedeUserID__ckMd5: string;
    readonly sid:               string;
    readonly SESSDATA:          string;
}


export class Account {

    private _filename:      string;
    private _loginInfo:     LoginInfo;
    private _webSession:    WebSession;
    private _appSession:    AppSession;
    private _fsWriteTask:   Promise<void>;  // noexcept

    constructor(info?: LoginInfo) {
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
    }

    withLoginInfo(loginInfo: LoginInfo): Account | any {
        this._loginInfo = loginInfo;
        return this;
    }

    get cookies(): WebSession {
        return this._webSession;
    }

    get tokens(): AppSession {
        return this._appSession;
    }

    get username(): string {
        return this._loginInfo.username;
    }

    get password(): string {
        return this._loginInfo.password;
    }

    isUsable(): boolean {
        return !!(
            this._webSession.bili_jct
            && this._webSession.DedeUserID
            && this._webSession.DedeUserID__ckMd5
            && this._webSession.SESSDATA
            && this._appSession.access_token
            && this._appSession.refresh_token
        );
    }

    needsLogin(): Promise<boolean> {
        return Bilibili.sessionInfo(this.tokens).then((resp: any): boolean => {
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

    login(): Promise<any> {
        if (!(this._loginInfo.username && this._loginInfo.password)) {
            return Promise.reject(new Error('(Login) - 用户名/密码未提供'));
        }

        return (Bilibili.login(this._loginInfo.username, this._loginInfo.password)
            .then((resp: any): Promise<any> => {
                let result: any = resp;
                const code: number = resp['code'];
                const msg: string = resp['msg'] || resp['message'] || '';
                if (code !== 0) {
                    result = Promise.reject(new Error(`(Login) ${code} - ${msg}`));
                }
                return Promise.resolve(result);
            })
            .then((resp: any): Promise<any> => {
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
            })
        );
    }

    loadFromFile(): void {
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

    saveToFile(): void {
        const filename = this._filename;
        cprint(`Storing login info into ${filename}`, chalk.green);

        const previousTask = this._fsWriteTask;
        this._fsWriteTask = (async(): Promise<void> => {
            await previousTask;     // noexcept
            return new Promise((resolve): void => {
                fs.writeFile(filename, this.toFileFormat(), (err: any) => {
                    if (err) {
                        cprint(`(Account) SaveError - ${err.message}`, chalk.red);
                    }
                    resolve();
                });
            });
        })();
    }

    toFileFormat(): string {
        const data: any = {
            'user':     this._loginInfo,
            'web':      this.cookies,
            'app':      this.tokens,
        };
        return JSON.stringify(data, null, 4);
    }

}
