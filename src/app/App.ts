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
    TCPServerBiliHelper,
    HttpServer, } from '../server/index';
import {
    Raffle,
    Anchor,
    RaffleCategory,
    History,
    DanmuTCP,
    RoomCollector,
    SimpleLoadBalancingRoomDistributor,
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
    private _bilihelperServer:      TCPServerBiliHelper;
    private _httpServer:            HttpServer;
    private _appConfig:             AppConfig;
    private _dynamicRefreshTask:    DelayedTask;
    private _running:               boolean;

    public constructor() {
        this._appConfig = new AppConfig();
        this._appConfig.init();
        this._db = new Database(this._appConfig.roomCollectorStrategy.roomExpiry);
        this._history = new History();
        this._emitter = new EventEmitter();
        this._wsServer = new WsServer(this._appConfig.wsAddr);
        this._biliveServer = new WsServerBilive(this._appConfig.biliveAddr);
        this._bilihelperServer = new TCPServerBiliHelper(this._appConfig.bilihelperAddr);
        this._httpServer = new HttpServer(this._appConfig.httpAddr);
        this._roomCollector = this._appConfig.loadBalancing.totalServers > 1
            ? new SimpleLoadBalancingRoomDistributor(this._appConfig.loadBalancing, this._appConfig.roomCollectorStrategy)
            : new RoomCollector(this._appConfig.roomCollectorStrategy);
        this._fixedController = new FixedGuardController();
        this._raffleController = new RaffleController(this._roomCollector);
            this._dynamicController = new DynamicGuardController();
        this._dynamicRefreshTask = new DelayedTask();
        this._running = false;

        this._dynamicRefreshTask.withTime(this._appConfig.roomCollectorStrategy.dynamicRoomsQueryInterval * 1000).withCallback((): void => {
            const dynamicTask = this._roomCollector.getDynamicRooms();
            (async () => {
                try {
                    const roomids: number[] = await dynamicTask;
                    const establishedFix: Map<number, DanmuTCP> = this._fixedController.connections;
                    const establishedDyn: Map<number, DanmuTCP> = this._dynamicController.connections;
                    const newIds: number[] = roomids.filter((roomid: number): boolean => {
                        return (
                            !establishedFix.has(roomid)
                            && !establishedDyn.has(roomid)
                        );
                    });
                    cprint(`Monitoring (静态) ${establishedFix.size} + (动态) ${establishedDyn.size}`, chalk.green);
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
        const controllers = [
            this._dynamicController,
            this._fixedController,
            this._raffleController,
        ];
        controllers.forEach((controller: AbstractRoomController): void => {
            controller
                .on('add_to_db', (roomid: number): void => { this._db.add(roomid) })
                .on('to_fixed', (roomid: number): void => { this._fixedController.add(roomid) });
            for (const category in RaffleCategory) {
                controller.on(category, handler(category));
            }
        });
        for (const category in RaffleCategory) {
            this._emitter.on(category, (g: Raffle): void => {
                this.printGift(g);
                this._wsServer.broadcast(g);
                this._biliveServer.broadcast(g);
                this._bilihelperServer.broadcast(g);
            });
        }
    }

    private setupServer(): void {
        for (const category in RaffleCategory) {
            this._httpServer.mountGetter(category, this._history.retrieveGetter(category));
        }
    }

    public start(): void {
        if (this._running === false) {
            this._running = true;
            this.setupListeners();
            this.setupServer();
            this._wsServer.start();
            this._biliveServer.start();
            this._bilihelperServer.start();
            this._httpServer.start();
            this._raffleController.start();
            const fixedTask = this._roomCollector.getFixedRooms();
            const dynamicTask = this._roomCollector.getDynamicRooms();
            (async () => {
                const fixedRooms: Set<number> = await fixedTask;
                this._fixedController.add(Array.from(fixedRooms));
                const dynamicRooms: number[] = await dynamicTask;
                const filtered = dynamicRooms.filter((roomid: number): boolean => !fixedRooms.has(roomid));
                this._dynamicController.add(filtered);
                this._dynamicRefreshTask.start();
            })();
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

    private printGift(g: Raffle): void {
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
