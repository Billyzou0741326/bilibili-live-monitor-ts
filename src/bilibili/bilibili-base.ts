import {
    Sender,
    HttpError,
    Request,
    Response,
    Xhr, } from '../net/index';
import {
    RateLimiter, } from '../task/index';


let xhr: Sender = new Xhr().withRateLimiter(new RateLimiter(50, 1000));

export class BilibiliBase {

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
