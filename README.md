# 银狼接码开放 API 文档 & SDK

[![官网](https://img.shields.io/badge/%E5%AE%98%E7%BD%91-yljm.cc-2563eb)](https://yljm.cc)
[![API 文档](https://img.shields.io/badge/API%20%E6%96%87%E6%A1%A3-yljm.cc%2Fdoc-16a34a)](https://doc.yljm.cc/)
[![SDK](https://img.shields.io/badge/SDK-5%20%E7%A7%8D%E8%AF%AD%E8%A8%80-d97706)](https://doc.yljm.cc/sdk.html)

[银狼接码](https://yljm.cc) 是一个短信验证码接收平台，支持通过标准 REST API 程序化购买海外手机号码、接收短信验证码。本仓库包含完整的 **API 接口文档** 与 **Node.js / Python / Go / Java / JavaScript 五种语言 SDK**。

> 📖 在线文档（推荐阅读）：**<https://doc.yljm.cc/>**

## 两种业务模式

| 模式 | 适用场景 | 计费方式 |
|------|---------|---------|
| **长效号码** | 批量购买（单次最多 50000 个）、长期持有、反复接收短信 | 按号码 × 有效期计费 |
| **在线接码** | 按次取号，收到验证码即完成 | 按次计费，未收码释放/超时**自动退款** |

## 快速开始

1. 前往 [yljm.cc 注册账号](https://yljm.cc/register) 并充值（支持 USDT TRC20/BEP20）；
2. 登录后进入 **个人中心 → 开发者 API**，生成 API Key；
3. 发起第一个请求：

```bash
curl "https://a.yljm.cc/api/v1/user/info" -H "Authorization: 你的API_KEY"
```

```json
{ "code": 1, "msg": "success", "data": { "id": 10001, "username": "demo", "balance": 88.5 } }
```

## 文档目录

- [完整 API 参考（本仓库）](./api-reference.md)
- [在线文档：概览与鉴权](https://doc.yljm.cc/)
- [在线文档：长效号码 API](https://doc.yljm.cc/longterm.html)
- [在线文档：在线接码 API](https://doc.yljm.cc/online.html)
- [在线文档：SDK 使用指南](https://doc.yljm.cc/sdk.html)

## SDK

| 语言 | 目录 | 要求 |
|------|------|------|
| Node.js | [`nodejs`](/nodejs) | Node 18+，零依赖 |
| Python | [`python`](/python) | Python 3.8+，requests |
| Go | [`go`](/sdk/go) | Go 1.20+，零依赖 |
| Java | [`java`](/sdk/java) | Java 11+，零依赖 |
| JavaScript (浏览器) | [`js`](/sdk/js) | 现代浏览器 ESM |

### Python 30 秒上手

```python
from yinglangsms import YinglangSMS

client = YinglangSMS("你的API_KEY")

# 在线接码：取号 → 等验证码 → 未收到自动释放退款
session = client.online_buy(app_id="1001", country="52")["list"][0]
try:
    done = client.online_wait_code(session["session_no"], timeout=300)
    print("验证码:", done["code"])
except TimeoutError:
    client.online_release(session["session_no"])
```

### Node.js 30 秒上手

```js
const { YinglangSMS } = require("yinglangsms");
const client = new YinglangSMS("你的API_KEY");

const { order, phones } = await client.createOrder({ appId: 123, num: 1 });
const sms = await client.waitForSms(phones[0].token, { timeout: 300 });
console.log("收到短信:", sms);
```

## 鉴权与通用约定

- 请求头：`Authorization: 你的API_KEY`（兼容 `Bearer` 前缀与 `X-API-Key` 头）
- 返回统一包裹：`{"code": 1, "msg": "success", "data": {...}}`，`code=1` 成功、`0` 业务失败
- 金额单位 USDT，分页参数 `page` / `limit`
- 查询短信接口（`GET /api/v1/sms?token=`）无需 API Key，号码令牌即凭证

## 链接

- 官网：<https://yljm.cc>
- 在线 API 文档：<https://doc.yljm.cc/>
- 注册：<https://yljm.cc/register>

---

© [银狼接码](https://yljm.cc) — 稳定的短信验证码接收平台 · 海外号码 · 在线接码 · 批量长效号码
