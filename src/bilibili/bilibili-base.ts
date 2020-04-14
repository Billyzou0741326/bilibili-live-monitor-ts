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

    public static request(request: Request): Promise<any> {
        const noRetryCode: Array<number> = [ 412 ];
        const requestUntilDone = async(): Promise<any> => {
            let tries = 3;
            let err: any = null;

            while (tries > 0) {
                try {
                    const response: Response = await xhr.request(request);
                    return response.json();
                }
                catch (error) {
                    --tries;
                    err = error;
                    if (error instanceof HttpError) {
                        const code = error.status;
                        if (noRetryCode.includes(code)) {
                            break;
                        }
                    }
                }
            }

            throw err;
        }

        return requestUntilDone();
    }

}
