import * as chalk from 'chalk';
import { Account } from './index';
import { cprint } from '../fmt/index';


//** --------------------------Test Login----------------------
((): void => {
    if (process.argv.length < 4) {
        console.log(`Usage: node <filename> <username> <password>`);
        return;
    }

    let username: string = "";
    let password: string = "";

    username = process.argv[2];
    password = process.argv[3];

    (async(): Promise<void> => {
        const acc = new Account({ username: username, password: password });
        try {
            await acc.login();
            cprint(`\n${acc.toFileFormat()}`, chalk.green);
        }
        catch (error) {
            cprint(error.message, chalk.red);
        }
    })();
})();
// --------------------------Test Login------------------------- */
