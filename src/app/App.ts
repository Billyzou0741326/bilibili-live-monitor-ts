import * as chalk from 'chalk';
import { table } from 'table';
import { EventEmitter } from 'events';
import { cprint } from '../fmt/index';
import { Database } from '../db/index';
import { Bilibili } from '../bilibili/index';
import { AppConfig } from '../global/index';
import { DelayedTask } from '../task/index';
import {
    WsServer,
    WsServerBilive,
    HttpServer, } from '../server/index';
import {
    PK,
    Gift,
    Guard,
    Storm,
    Anchor,
    History,
    RoomCollector,
    AbstractRoomController,
    DynamicGuardController,
    FixedGuardController,
    RaffleController, } from '../danmu/index';

export class App {

    private _db:                    Database;
    private _history:               History;
    private _roomCollector:         RoomCollector;
    private _raffleController:      RaffleController;
    private _fixedController:       FixedGuardController;
    private _dynamicController:     DynamicGuardController;
    private _emitter:               EventEmitter;
    private _wsServer:              WsServer;
    private _biliveServer:          WsServerBilive;
    private _httpServer:            HttpServer;
    private _appConfig:             AppConfig;
    private _dynamicRefreshTask:    DelayedTask;
    private _running:               boolean;

    constructor() {
        this._appConfig = new AppConfig();
        this._appConfig.init();
        this._db = new Database();
        this._history = new History();
        this._emitter = new EventEmitter();
        this._wsServer = new WsServer(this._appConfig.wsAddr);
        this._biliveServer = new WsServerBilive(this._appConfig.biliveAddr);
        this._httpServer = new HttpServer(this._appConfig.httpAddr);
        this._roomCollector = new RoomCollector();
        this._fixedController = new FixedGuardController();
        this._raffleController = new RaffleController();
        this._dynamicController = new DynamicGuardController();
        this._dynamicRefreshTask = new DelayedTask();
        this._running = false;

        this._dynamicRefreshTask.withTime(120 * 1000).withCallback((): void => {
            const dynamicTask = this._roomCollector.getDynamicRooms();
            (async () => {
                try {
                    const roomids: number[] = await dynamicTask;
                    const establishedFix: number[] = this._fixedController.connected;
                    const establishedDyn: number[] = this._dynamicController.connected;
                    const newIds: number[] = roomids.filter((roomid: number): boolean => establishedFix.includes(roomid) === false);
                    cprint(`Monitoring (静态) ${establishedFix.length} + (动态) ${establishedDyn.length}`, chalk.green);
                    this._dynamicController.add(newIds);
                    this._dynamicRefreshTask.start();
                }
                catch (error) {
                    cprint(`(Dynamic) - ${error.message}`, chalk.red);
                    this._dynamicRefreshTask.start();
                }
            })();
        });
    }

    setupListeners(): void {
        if (!this._running) return;

        const handler = (t: string): any => {
            return (g: Gift | Guard | Storm | PK | Anchor): void => {
                if (this._history.has(g) === false) {
                    this._emitter.emit(t, g);
                    this._history.add(g);
                }
            };
        };
        const controllers = [
            this._dynamicController,
            this._fixedController,
            this._raffleController,
        ];
        controllers.forEach((controller: AbstractRoomController): void => {
            (controller
                .on('guard', handler('guard'))
                .on('gift', handler('gift'))
                .on('pk', handler('pk'))
                .on('storm', handler('storm'))
                .on('anchor', handler('anchor'))
                .on('add_to_db', (roomid: number): void => { this._db.add(roomid) })
                .on('to_fixed', (roomid: number): void => { this._fixedController.add(roomid) }));
        });
        (this._emitter
            .on('guard', (g: Guard): void => {
                this.printGift(g);
                this._wsServer.broadcast(this._wsServer.parseMessage(g));
                this._biliveServer.broadcast(this._biliveServer.parseMessage(g));
            })
            .on('gift', (g: Gift): void => {
                this.printGift(g);
                const gift: any = Object.assign(new Object(), g);
                delete gift['wait'];
                this._wsServer.broadcast(this._wsServer.parseMessage(gift));
                this._biliveServer.broadcast(this._biliveServer.parseMessage(gift));
            })
            .on('pk', (g: PK): void => {
                this.printGift(g);
                this._wsServer.broadcast(this._wsServer.parseMessage(g));
                this._biliveServer.broadcast(this._biliveServer.parseMessage(g));
            })
            .on('storm', (g: Storm): void => {
                this.printGift(g);
                this._wsServer.broadcast(this._wsServer.parseMessage(g));
                this._biliveServer.broadcast(this._biliveServer.parseMessage(g));
            })
            .on('anchor', (g: Anchor): void => {
                this.printGift(g);
                // this._wsServer.broadcast(this._wsServer.parseMessage(g));
            }));
    }

    setupServer(): void {
        this._httpServer.mountGetter('gift', this._history.retrieveGetter('gift') as () => Gift[]);
        this._httpServer.mountGetter('guard', this._history.retrieveGetter('guard') as () => Guard[]);
        this._httpServer.mountGetter('anchor', this._history.retrieveGetter('anchor') as () => Anchor[]);
    }

    start(): void {
        if (this._running === false) {
            this._running = true;
            this.setupListeners();
            this.setupServer();
            this._wsServer.start();
            this._biliveServer.start();
            this._httpServer.start();
            this._raffleController.start();
            const fixedTask = this._roomCollector.getFixedRooms();
            const dynamicTask = this._roomCollector.getDynamicRooms();
            (async () => {
                const fixedRooms: number[] = await fixedTask;
                const dynamicRooms: number[] = await dynamicTask;
                const filtered = dynamicRooms.filter((roomid: number): boolean => fixedRooms.includes(roomid) === false);
                this._fixedController.add(fixedRooms);
                this._dynamicController.add(filtered);
                this._dynamicRefreshTask.start();
            })();
        }
    }

    stop(): void {
        if (this._running === true) {
            this._wsServer.stop();
            this._httpServer.stop();
            this._biliveServer.stop();
            this._db.stop();
            this._history.stop();
            this._fixedController.removeAllListeners();
            this._dynamicController.removeAllListeners();
            this._raffleController.removeAllListeners();
            this._fixedController.stop();
            this._dynamicController.stop();
            this._raffleController.stop();
            this._emitter.removeAllListeners();
            this._wsServer.stop();
            this._dynamicRefreshTask.stop();
            this._running = false;
        }
    }

    printGift(g: Gift | Guard | Storm | PK): void {
        let msg = '';
        const id = `${g.id}`;
        const roomid = `${g.roomid}`;
        const t = `${g.type}`;
        const category = `${g.category}`;
        const name = `${g.name}`;

        switch (category) {
            case 'gift':
                msg = `${id.padEnd(13)}@${roomid.padEnd(13)}${t.padEnd(13)}${name}`;
                break;
            case 'guard':
                msg = `${id.padEnd(13)}@${roomid.padEnd(13)}${t.padEnd(13)}${name}`;
                break;
            case 'storm':
                let sid = `${id.slice(0,7)}`;
                msg = `${sid.padEnd(13)}@${roomid.padEnd(13)}${t.padEnd(13)}${name.padEnd(13)}${id}`;
                break;
            case 'pk':
                msg = `${id.padEnd(13)}@${roomid.padEnd(13)}${t.padEnd(13)}${name}`;
                break;
            case 'anchor':
                const anchor: Anchor = (g as Anchor);
                const award_num = `${anchor.award_num}`;
                const gift_num = `${anchor.gift_num}`;
                const gift_name = `${anchor.gift_name}`;
                const gift_price = `${anchor.gift_price}`;
                const requirement = `${anchor.requirement}`;
                const danmu = `${anchor.danmu}`;
                const dataTable = [
                    [ '奖品名称', name ],
                    [ '奖品数量', award_num ],
                    [ '弹幕', danmu ],
                    [ '限制条件', requirement ],
                    [ '投喂', `${gift_num}个${gift_name}(${gift_price}金瓜子)` ],
                ];
                msg = (`${id.padEnd(13)}@${roomid.padEnd(13)}${t.padEnd(13)}`
                    + `\n${table(dataTable)}`);
                break;
            case '':
                return;
            default:
                return;
        }

        cprint(msg, chalk.cyan);
    }

}
