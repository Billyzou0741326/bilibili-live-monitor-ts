import { EventEmitter } from 'events';

enum Days {
    Mon = 0b00000001,
    Tue = 0b00000010,
    Wed = 0b00000100,
    Thu = 0b00001000,
    Fri = 0b00010000,
    Sat = 0b00100000,
    Sun = 0b01000000,
}

interface Time {
    hour:       number;
    minute:     number;
    day:        Days;
}


class Notifier extends EventEmitter {

    constructor() {
        super();
    }

}
