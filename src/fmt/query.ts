import * as querystring from 'querystring';

export class Cookies {

    public static stringify(cookies: {[key: string]: string | number | null}): string {
        const options = {
            'encodeURIComponent': querystring.unescape,
        };
        const formattedCookies = querystring.stringify(cookies, '; ', '=', options);
        return formattedCookies;
    }

    public static parseSetCookie(cookieStrList: string[]): {[key:string]: string} {
        const cookies: {[key:string]: string} = {};
        for (const cookieStr of cookieStrList) {
            const cookieIndex = cookieStr.indexOf(';');
            if (cookieIndex === -1) {
                continue;
            }
            const keyValuePair = cookieStr.substring(0, cookieIndex);
            const seperatorIndex = keyValuePair.indexOf('=');
            if (seperatorIndex === -1) {
                continue;
            }
            const key: string = keyValuePair.substring(0, seperatorIndex);
            const value: string = keyValuePair.substring(seperatorIndex+1);
            cookies[key] = value;
        }
        return cookies;
    }
}

export class Params {

    public static stringify(params: {[key: string]: string | number | null}): string {
        const formattedParams = querystring.stringify(params, '&', '=');
        return formattedParams;
    }

}
