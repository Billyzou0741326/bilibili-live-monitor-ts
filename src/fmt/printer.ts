import * as chalk from 'chalk';

export function cprint(msg: string, color: chalk.Chalk = chalk.reset): void {
    const now = new Date();
    const year = now.getFullYear();
    const mon = now.getMonth() + 1;
    const date_raw = now.getDate();
    const hr = now.getHours();
    const min = now.getMinutes();
    const sec = now.getSeconds();
    const month: string = mon < 10 ? `0${mon}` : `${mon}`;
    const date: string = date_raw < 10 ? `0${date_raw}` : `${date_raw}`;
    const hour: string = hr < 10 ? `0${hr}` : `${hr}`;
    const minute: string = min < 10 ? `0${min}` : `${min}`;
    const second: string = sec < 10 ? `0${sec}` : `${sec}`;
    const prefix: string = ` [${year}-${month}-${date} ${hour}:${minute}:${second}]`;
    console.log(color(`${prefix}   ${msg}`));
}
