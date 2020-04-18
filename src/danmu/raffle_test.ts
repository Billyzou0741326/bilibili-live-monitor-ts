import {
    Gift,
    Guard,
    Anchor,
    PK, } from './index';

// ---------------------------AppGetLottery---------------------------
Gift.parse({
    "raffleId": 588783,
    "title": "小电视图抽奖抽奖",
    "type": "GIFT_30406",
    "payflow_id": 1,
    "from_user": {
        "uname": "Asaki大人",
        "face": "http://i2.hdslb.com/bfs/face/1aca1fcfa08a88d9748834d0127b36bbbed44f2c.jpg"
    },
    "time_wait": -16,
    "time": 44,
    "max_time": 180,
    "status": 1,
    "asset_animation_pic": "https://i0.hdslb.com/bfs/live/86e7913ad7252d8456a89c80bb6e311070397d38.gif",
    "asset_tips_pic": "http://s1.hdslb.com/bfs/live/157193dea0f7f8f558c35d7aece2d54fbee20c34.png",
    "sender_type": 1
});
Guard.parse({
    "id": 1778301,
    "sender": {
        "uid": 474657357,
        "uname": "",
        "face": ""
    },
    "keyword": "guard",
    "privilege_type": 3,
    "time": 720,
    "status": 1,
    "payflow_id": "gds_b53dc8dc5ef3a94a93_201912"
});
PK.parse({
    "id": 647682,
    "pk_id": 647682,
    "room_id": 2982247,
    "time": 86,
    "status": 1,
    "asset_icon": "https://i0.hdslb.com/bfs/vc/44c367b09a8271afa22853785849e65797e085a1.png",
    "asset_animation_pic": "https://i0.hdslb.com/bfs/vc/03be4c2912a4bd9f29eca3dac059c0e3e3fc69ce.gif",
    "title": "恭喜主播大乱斗胜利",
    "max_time": 120
});
// ---------------------------AppGetLottery--------------------------- */

// ---------------------------DanmuLottery---------------------------
Gift.parse(({
    "cmd": "RAFFLE_START",
    "data": {
        "asset_animation_pic": "http://i0.hdslb.com/bfs/live/d7303a91bf00446b2bc53b8726844b4ad813b9ed.gif",
        "asset_icon": "http://s1.hdslb.com/bfs/live/28c2f3dd68170391d173ca2efd02bdabc917df26.png",
        "asset_tips_pic": "http://s1.hdslb.com/bfs/live/28c2f3dd68170391d173ca2efd02bdabc917df26.png",
        "dtime": 180,
        "from": "沈秋い",
        "from_user": {
            "face": "http://i2.hdslb.com/bfs/face/1ec02326a9819d5f58b1ddf4ab1bfd30ad533ec4.jpg",
            "uname": "沈秋い"
        },
        "gift_id": 30035,
        "id": "610686",
        "max_time": 180,
        "msg": "",
        "payflow_id": "0",
        "raffleId": 610686,
        "sender_type": 1,
        "thank_text": "感谢<%沈秋い%>赠送的任意门",
        "time": 180,
        "time_wait": 120,
        "title": "任意门抽奖",
        "type": "GIFT_30035",
        "weight": 0
    }
})['data']);
Gift.parse(({
    "cmd": "TV_START",
    "data": {
        "asset_animation_pic": "http://i0.hdslb.com/bfs/live/746a8db0702740ec63106581825667ae525bb11a.gif",
        "asset_icon": "http://s1.hdslb.com/bfs/live/fae67831221cfc2d0576ff0201d3609b4671bcdb.png",
        "asset_tips_pic": "http://s1.hdslb.com/bfs/live/fae67831221cfc2d0576ff0201d3609b4671bcdb.png",
        "dtime": 180,
        "from": "阿局的甜甜甜豆冰",
        "from_user": {
            "face": "http://i2.hdslb.com/bfs/face/f6017b8f89dd7b10fbf69892629c3f2a151dcc46.jpg",
            "uname": "阿局的甜甜甜豆冰"
        },
        "gift_id": 25,
        "id": "610689",
        "max_time": 180,
        "msg": "",
        "payflow_id": "1577532898111600001",
        "raffleId": 610689,
        "sender_type": 0,
        "thank_text": "感谢<%阿局的甜甜甜豆冰%>赠送的小电视飞船",
        "time": 180,
        "time_wait": 120,
        "title": "小电视飞船抽奖",
        "type": "small_tv",
        "weight": 0
    }
})['data']);
Guard.parse(({
    "cmd": "GUARD_LOTTERY_START",
    "data": {
        "id": 1806074,
        "link": "https://live.bilibili.com/66436",
        "lottery": {
            "asset_animation_pic": "https://i0.hdslb.com/bfs/vc/ff2a28492970850ce73df0cc144f1766b222d471.gif",
            "asset_icon": "https://i0.hdslb.com/bfs/vc/43f488e7c4dca5ba6fbdcb88f40052d56bf777d8.png",
            "id": 1806074,
            "keyword": "guard",
            "mobile_animation_asset": "",
            "mobile_display_mode": 2,
            "mobile_static_asset": "",
            "privilege_type": 3,
            "sender": {
                "face": "http://static.hdslb.com/images/member/noface.gif",
                "uid": 6647225,
                "uname": "Stephen107"
            },
            "status": 1,
            "thank_text": "恭喜<%Stephen107%>上任舰长",
            "time": 1200,
            "time_wait": 0,
            "weight": 0
        },
        "payflow_id": "gds_909909b78e1b9d88a1_201912",
        "privilege_type": 3,
        "roomid": 66436,
        "type": "guard"
    }
})['data']['lottery']);
PK.parse(({
    "cmd": "PK_LOTTERY_START",
    "data": {
        "asset_animation_pic": "https://i0.hdslb.com/bfs/vc/03be4c2912a4bd9f29eca3dac059c0e3e3fc69ce.gif",
        "asset_icon": "https://i0.hdslb.com/bfs/vc/44c367b09a8271afa22853785849e65797e085a1.png",
        "from_user": {
            "face": "http://i2.hdslb.com/bfs/face/305bce7ab726c004fcbc208dce40de97b4c7eb80.jpg",
            "uid": 77240366,
            "uname": "Ichbin鱼宝宝"
        },
        "id": 681513,
        "max_time": 120,
        "pk_id": 681513,
        "room_id": 21673618,
        "thank_text": "恭喜<%Ichbin鱼宝宝%>赢得大乱斗PK胜利",
        "time": 120,
        "time_wait": 0,
        "title": "恭喜主播大乱斗胜利",
        "weight": 0
    }
})['data']);
// ---------------------------DanmuLottery--------------------------- */

// ---------------------------WebGetLottery---------------------------
Gift.parse({
    "raffleId": 427839,
    "type": "small_tv",
    "from_user": {
        "uid": 0,
        "uname": "大鹅在敬老院给你留锅",
        "face": "http://i1.hdslb.com/bfs/face/***.jpg"
    },
    "time_wait": 6,
    "time": 66,
    "max_time": 180,
    "status": 1,
    "sender_type": 0,
    "asset_icon": "http://s1.hdslb.com/bfs/live/***.png",
    "asset_animation_pic": "http://i0.hdslb.com/bfs/live/***.gif",
    "thank_text": "感谢\u003c%大鹅在敬老院给你留锅%\u003e 赠送的小电视飞船",
    "weight": 0,
    "gift_id": 25
});
Guard.parse({
    "id": 1495083,
    "sender": {
        "uid": 15258616,
        "uname": "卿茶酒以歌",
        "face": "http://i1.hdslb.com/bfs/face/***.jpg"},
    "keyword": "guard",
    "privilege_type": 2,
    "time": 7075,
    "status": 1,
    "time_wait": 0,
    "asset_icon": "https://i0.hdslb.com/bfs/vc/***.png",
    "asset_animation_pic": "https://i0.hdslb.com/bfs/vc/***.gif",
    "thank_text": "恭喜\u003c%卿茶酒以歌%\u003e上任提督",
    "weight": 0
});
PK.parse({
    "id":480011,
    "pk_id":480011,
    "room_id":4960254,
    "time":48,
    "status":1,
    "asset_icon":"https://i0.hdslb.com/bfs/vc/***.png",
    "asset_animation_pic":"https://i0.hdslb.com/bfs/vc/***.gif",
    "max_time":120,
    "time_wait":0,
    "from_user":{
        "uid":29312803,
        "uname":"幽螟蛉",
        "face":"http://i0.hdslb.com/bfs/face/***.jpg"},
    "thank_text":"恭喜\u003c%幽螟蛉%\u003e赢得大乱斗PK胜利",
    "weight":0
});
// ---------------------------WebGetLottery--------------------------- */
