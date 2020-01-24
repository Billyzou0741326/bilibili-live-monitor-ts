import {
    Sender,
    HttpError,
    Request,
    Response,
    Xhr,
    RateLimitedXhr, } from '../net/index';

const sender: any = {
    limited: new RateLimitedXhr(50, 1000),
    unlimited: new Xhr(),
};
let xhr: Sender = sender.limited;

export class BilibiliBase {

    static withNoLimit(r?: Xhr): void {
        if (r) {
            xhr = r;
        }
        else {
            xhr = sender.unlimited;
        }
    }

    static withLimit(r?: RateLimitedXhr): void {
        if (r) {
            xhr = r;
        }
        else {
            xhr = sender.limited;
        }
    }

    static request(request: Request): Promise<any> {
        const noRetryCode: Array<number> = [ 412 ];
        const requestUntilDone = async(): Promise<any> => {
            let success = false;
            let tries = 3;
            let result: any = null;
            let err: any = null;

            while (success === false && tries > 0) {
                try {
                    const response: Response = await xhr.request(request);
                    result = response.json();
                    err = null;
                    success = true;
                }
                catch (error) {
                    err = error;
                    --tries;
                    if (error instanceof HttpError) {
                        const code = error.status;
                        if (noRetryCode.includes(code)) {
                            tries = 0;
                        }
                    }
                }
            }

            if (err) {
                throw err;
            }
            return result;
        }

        return requestUntilDone();
    }

}
