import * as querystring from 'querystring';

export class Cookies {

    static stringify(cookies: {[key: string]: string}): string {
        const options = {
            'encodeURIComponent': querystring.unescape,
        };
        const formattedCookies = querystring.stringify(cookies, '; ', '=', options);
        return formattedCookies;
    }

}

export class Params {

    static stringify(params: {[key: string]: string}): string {
        const formattedParams = querystring.stringify(params, '&', '=');
        return formattedParams;
    }

}
