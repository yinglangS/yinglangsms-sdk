# yinglangsms — 银狼接码官方 Node.js SDK

[银狼接码](https://yljm.cc) 开放 API 的 Node.js 封装：程序化购买海外手机号码、接收短信验证码。零依赖，需要 Node.js 18+。

- 📖 API 文档：<https://doc.yljm.cc/>
- 🔑 获取 API Key：登录 [yljm.cc](https://yljm.cc) → 个人中心 → 开发者 API

## 安装

```bash
npm install yinglangsms
# 或直接把本目录的 index.js 复制进你的项目
```

## 快速开始

```js
const { YinglangSMS, YinglangSMSError } = require("yinglangsms");

const client = new YinglangSMS("你的API_KEY");

// 余额
const me = await client.getUserInfo();
console.log(me.username, me.balance);
```

## 在线接码（取号 → 等验证码 → 未收到自动释放退款）

```js
const { list } = await client.onlineBuy({ appId: "1001", country: "52", quantity: 1 });
const session = list[0];
console.log("号码:", session.tel);

try {
  const done = await client.onlineWaitCode(session.session_no, { timeout: 300, interval: 5 });
  console.log("验证码:", done.code, "短信:", done.sms_content);
} catch (e) {
  await client.onlineRelease(session.session_no).catch(() => {});
  console.log("未收到验证码，已释放退款:", e.message);
}
```

## 长效号码（批量购买 → 轮询短信）

```js
const { order, phones } = await client.createOrder({
  appId: 123,
  num: 10,
  prefix: "1440", // 可选：指定号段
});
console.log("订单:", order.order_id, "共", phones.length, "个号码");

const sms = await client.waitForSms(phones[0].token, { timeout: 300 });
console.log("收到短信:", sms);
```

## 错误处理

所有业务失败（`code != 1`）抛出 `YinglangSMSError`：

```js
try {
  await client.createOrder({ appId: 123, num: 1 });
} catch (e) {
  if (e instanceof YinglangSMSError) {
    console.log("业务失败:", e.message, "code:", e.code, "http:", e.httpStatus);
  }
}
```

## 全部方法

| 方法 | 说明 |
|------|------|
| `getUserInfo()` | 余额查询 |
| `getCategories()` | 项目分类 |
| `getApps({page, limit, keyword, cateId})` | 项目列表 |
| `getPrefixes(appId, {type, expiry})` | 号码前缀 |
| `createOrder({appId, num, expiry, prefix, excludePrefix})` | 购买号码 |
| `listOrders({page, limit, orderId, appName})` | 订单列表 |
| `listPhones({page, limit, orderId, appName, tel})` | 号码列表 |
| `getSms(token)` | 查询短信（未收到返回 `null`） |
| `waitForSms(token, {timeout, interval})` | 轮询等短信 |
| `onlineApps(keyword)` | 在线接码应用列表 |
| `onlineCountries(appId, keyword)` | 国家报价 |
| `onlineBuy({appId, country, quantity})` | 购买取号 |
| `onlineGetCode(sessionNo)` | 查询会话/取码 |
| `onlineWaitCode(sessionNo, {timeout, interval})` | 轮询等验证码 |
| `onlineRelease(sessionNo)` | 释放退款 |
| `onlineOrders({page, limit, status, tel})` | 接码记录 |

## 链接

- 官网：<https://yljm.cc>
- 在线文档：<https://doc.yljm.cc/>

MIT License · © [银狼接码](https://yljm.cc)
