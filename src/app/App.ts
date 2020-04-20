import * as chalk from 'chalk';
import * as settings from '../settings.json';
import { table } from 'table';
import { EventEmitter } from 'events';
import { sleep } from '../async/index';
import { cprint } from '../fmt/index';
import { Database } from '../db/index';
import { Bilibili } from '../bilibili/index';
import { AppConfig } from '../global/index';
import { DelayedTask } from '../task/index';
import { TCPClientLK } from '../client/index';
import {
    WsServer,
    WsServerBilive,
    TCPServerBiliHelper,
    HttpServer, } from '../server/index';
import {
    RaffleCategory,
    Raffle,
    Anchor,
    History,
    DanmuTCP,
    RoomCrawler,
    RoomCollector,
    RoomidHandler,
    SimpleLoadBalancingRoomDistributor,
    AbstractRoomController,
    DynamicGuardController,
    FixedGuardController,
    RaffleController, } from '../danmu/index';

export class App {

    private _db:                    Database;
    private _history:               History;
    private _emitter:               EventEmitter;
    private _running:               boolean;

    private _roomidHandler:         RoomidHandler;
    private _roomCrawler:           RoomCrawler;
    private _roomCollector:         RoomCollector;
    private _raffleController:      RaffleController;
    private _fixedController:       FixedGuardController;
    private _dynamicController:     DynamicGuardController;
    private _lkclient:              TCPClientLK;

    private _wsServer:              WsServer;
    private _biliveServer:          WsServerBilive;
    private _bilihelperServer:      TCPServerBiliHelper;
    private _httpServer:            HttpServer;

    private _appConfig:             AppConfig;

    private _dynamicRefreshTask:    DelayedTask;

    public constructor() {
        this._appConfig = new AppConfig();
        this._appConfig.init();
        this._db = new Database({ expiry: this._appConfig.roomCollectorStrategy.fixedRoomExpiry });
        this._history = new History();
        this._emitter = new EventEmitter();

        this._wsServer = new WsServer(this._appConfig.wsAddr);
        this._biliveServer = new WsServerBilive(this._appConfig.biliveAddr);
        this._bilihelperServer = new TCPServerBiliHelper(this._appConfig.bilihelperAddr);
        this._httpServer = new HttpServer(this._appConfig.httpAddr);

        this._roomCollector = (this._appConfig.loadBalancing.totalServers > 1
            ? new SimpleLoadBalancingRoomDistributor(this._appConfig.loadBalancing)
            : new RoomCollector());
        this._roomidHandler = new RoomidHandler();
        this._roomCrawler = new RoomCrawler(this._roomCollector);
        this._fixedController = new FixedGuardController();
        this._raffleController = new RaffleController(this._roomCollector);
        this._dynamicController = new DynamicGuardController();
        this._lkclient = new TCPClientLK();

        this._dynamicRefreshTask = new DelayedTask();
        this._running = false;

        const dynRefreshInterval = this._appConfig.roomCollectorStrategy.dynamicRoomsQueryInterval * 1000;
        this._dynamicRefreshTask.withTime(dynRefreshInterval).withCallback((): void => {
            const dynamicTask = this._roomCollector.getDynamicRooms();
            (async () => {
                try {
                    const roomidSet: Set<number> = await dynamicTask;
                    const establishedFix: Map<number, DanmuTCP> = this._fixedController.connections;
                    const establishedDyn: Map<number, DanmuTCP> = this._dynamicController.connections;
                    cprint(`Monitoring (静态) ${establishedFix.size} + (动态) ${establishedDyn.size}`, chalk.green);

                    const roomids: number[] = Array.from(roomidSet).filter((roomid: number): boolean => {
                        return !establishedFix.has(roomid);
                    });
                    const tasks = this._dynamicController.add(roomids);
                    await Promise.all(tasks);
                    this._dynamicRefreshTask.start();
                }
                catch (error) {
                    cprint(`(Dynamic) - ${error.message}`, chalk.red);
                    this._dynamicRefreshTask.start();
                }
            })();
        });
    }

    private setupListeners(): void {
        if (!this._running) return;

        const handler = (t: string): any => {
            return (g: Raffle): void => {
                if (this._history.has(g) === false) {
                    this._emitter.emit(t, g);
                    this._history.add(g);
                }
            };
        };
        this._roomCrawler.on('done', (): void => {
            if (this._running) {
                this._roomCrawler.query();
            }
        });
        const emitters = [
            this._dynamicController,
            this._fixedController,
            this._raffleController,
            this._roomidHandler,
            this._roomCrawler,
            this._lkclient,
        ];
        this._lkclient.on('close', (): void => {
            const info = settings['clients']['lk-tcp-client'];
            this._lkclient.connect({ host: info['host'], port: info['port'] });
        });
        for (const emt of emitters) {
            emt.
                on('add_to_db', (roomid: number): void => { this._db.add(roomid) }).
                on('to_fixed', (roomid: number): void => {
                    cprint(`Adding ${roomid} to fixed`, chalk.green);
                    this._fixedController.add(roomid);
                }).
                on('roomid', (roomid: number): void => {
                    this._roomidHandler.add(roomid);
                });
                /**
                on('to_dynamic', (roomid: number): void => {
                    if (!this._fixedController.connections.has(roomid) && !this._dynamicController.connections.has(roomid)) {
                        cprint(`Adding ${roomid} to dynamic`, chalk.green);
                        this._dynamicController.add(roomid);
                    }
                });
                // */
            for (const category in RaffleCategory) {
                emt.on(category, handler(category));
            }
        }

        const processGift = (g: Raffle): void => {
            this.printGift(g);
            this._wsServer.broadcast(g);
            this._biliveServer.broadcast(g);
            this._bilihelperServer.broadcast(g);
        };

        for (const category in RaffleCategory) {
            if (category === RaffleCategory.gift) {
                this._emitter.on(category, (g: Raffle): void => {
                    if (g.wait <= 0) {
                        processGift(g);
                        return;
                    } else {
                        const t = new DelayedTask();
                        t.withTime(g.wait * 1000);
                        t.withCallback((): void => {
                            processGift(g);
                        });
                        t.start();
                    }
                });
            } else {
                this._emitter.on(category, (g: Raffle): void => {
                    processGift(g);
                });
            }
        }
    }

    private setupHttp(): void {
        for (const category in RaffleCategory) {
            this._httpServer.mountGetter(category, this._history.retrieveGetter(category));
        }
    }

    public start(): void {
        if (this._running === false) {
            this._running = true;
            this.setupListeners();
            this.setupHttp();
            this.startServers();
            this._db.start();
            this._raffleController.start();

            if (settings['clients']['bilibili-http']['enable'] === true) {
                this._roomCrawler.query();
            }

            if (settings['clients']['lk-tcp-client']['enable'] === true) {
                const info = settings['clients']['lk-tcp-client'];
                this._lkclient.connect({ host: info['host'], port: info['port'] });
            }

            if (settings['clients']['bilibili-tcp']['enable'] === true) {
                this._fixedController.start();
                this._dynamicController.start();
                const fixedTask = this._roomCollector.getFixedRooms();
                const dynamicTask = this._roomCollector.getDynamicRooms();
                (async () => {
                    const fixedRooms: Set<number> = await fixedTask;
                    this._fixedController.add(Array.from(fixedRooms));
                    const dynamicRooms: number[] = Array.from(await dynamicTask);
                    const filtered: number[] = dynamicRooms.filter((roomid: number): boolean => !fixedRooms.has(roomid));
                    const tasks = this._dynamicController.add(filtered);
                    await Promise.all([ ...tasks, sleep(10 * 1000) ]);
                    while (this._running) {
                        try {
                            const dynamicTask = this._roomCollector.getDynamicRooms();
                            const roomidSet: Set<number> = await dynamicTask;
                            const establishedFix: Map<number, DanmuTCP> = this._fixedController.connections;
                            const establishedDyn: Map<number, DanmuTCP> = this._dynamicController.connections;
                            cprint(`Monitoring (静态) ${establishedFix.size} + (动态) ${establishedDyn.size}`, chalk.green);

                            const roomids: number[] = Array.from(roomidSet).filter((roomid: number): boolean => {
                                return !establishedFix.has(roomid);
                            });
                            const tasks = this._dynamicController.add(roomids);
                            await Promise.all([ ...tasks, sleep(10 * 1000) ]);
                            this._dynamicRefreshTask.start();
                        }
                        catch (error) {
                            cprint(`(Dynamic) - ${error.message}`, chalk.red);
                            this._dynamicRefreshTask.start();
                        }
                    }
                })();
            }
        }
    }

    public stop(): void {
        if (this._running === true) {
            this._wsServer.stop();
            this._httpServer.stop();
            this._biliveServer.stop();
            this._bilihelperServer.stop();
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

    private startServers(): void {
        if (this._appConfig.wsAddr.enable === true) {
            this._wsServer.start();
        }
        if (this._appConfig.biliveAddr.enable === true) {
            this._biliveServer.start();
        }
        if (this._appConfig.bilihelperAddr.enable === true) {
            this._bilihelperServer.start();
        }
        if (this._appConfig.httpAddr.enable === true) {
            this._httpServer.start();
        }
    }

    private printGift(g: Raffle): void {
        let msg: string = '';
        const id = `${g.id}`;
        const roomid = `${g.roomid}`;
        const t = `${g.type}`;
        const category = `${g.category}`;
        const name = `${g.name}`;

        switch (category) {
            case 'gift':
            case 'guard':
            case 'pk':
                msg = `${id.padEnd(13)}@${roomid.padEnd(13)}${t.padEnd(13)}${name}`;
                break;
            case 'storm':
                let sid = `${id.slice(0,7)}`;
                msg = `${sid.padEnd(13)}@${roomid.padEnd(13)}${t.padEnd(13)}${name.padEnd(13)}${id}`;
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
            default:
                return;
        }

        cprint(msg, chalk.cyan);
    }

}
