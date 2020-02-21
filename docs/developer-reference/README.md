# Broadcast Format (http, ws)

 - 以category区分类别 可能是`gift`, `guard`, `storm`, `pk`, `anchor`

## /storm (风暴) --http/ws--
```javascript
{
    "id": "1909565617562",
    "roomid": 3974839,
    "category": "storm",
    "type": "storm",
    "name": "节奏风暴",
    "expireAt": "1579832000"
}
```

## /guard (大航海) --http/ws--
```javascript
{
    "id": 1909418,
    "roomid": 11771685,
    "category": "guard",
    "type": "guard",
    "name": "提督",
    "expireAt": 1579832000
}
```

## /gift (高能) --http/ws--
```javascript
{
    "id": 662502,
    "roomid": 21175464,
    "category": "gift",
    "type": "GIFT_30405",
    "name": "33地图抽奖抽奖",
    "expireAt": 1579828602
}
```

## /pk (大乱斗) --http/ws--
```javascript
{
    "id": 739365,
    "roomid": 21742849,
    "category": "pk",
    "type": "pk",
    "name": "大乱斗",
    "expireAt": 1581869287
}
```

## /anchor (天选) --仅http--
```javascript
{
    "id": 65248,
    "roomid": 11437906,
    "category": "anchor",
    "type": "anchor",
    "expireAt": 1579828373,
    "name": "小主播比较穷只能抽0.5元的奖",
    "award_num": 1,
    "gift_name": "",
    "gift_num": 1,
    "gift_price": 0,
    "requirement": "关注主播",
    "danmu": "小主播点个关注吧，关注了就别取消惹，谢谢"
}
```

