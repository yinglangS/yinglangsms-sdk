# 银狼接码 API 参考

> 在线版文档：<https://doc.yljm.cc/> · 官网注册：<https://yljm.cc/register>

## 基础信息

- **基础地址**：`https://a.yljm.cc`
- **鉴权**：请求头 `Authorization: 你的API_KEY`（在 [个人中心 → 开发者 API](https://yljm.cc) 生成；兼容 `Bearer` 前缀与 `X-API-Key` 头）
- **格式**：请求体 JSON（`Content-Type: application/json`），返回统一包裹：

```json
{ "code": 1, "msg": "success", "data": {} }
```

| HTTP 状态 | code | 含义 |
|-----------|------|------|
| 200 | 1 | 成功 |
| 200 | 0 | 业务失败（余额不足、暂无短信等，见 msg） |
| 401 | 401 | 缺少或无效的 API Key |
| 403 | 403 | 账户停用或 IP 封禁 |

### 限流

| 场景 | 限制 |
|------|------|
| 常规接口（每 IP） | 120 次 / 60 秒 |
| `POST /api/v1/orders` | 10 次 / 60 秒 |
| `POST /api/v1/online/orders` | 20 次 / 60 秒 |
| `GET /api/v1/sms` | 30 次 / 10 秒 |

---

## 账户

### 余额查询

```
GET /api/v1/user/info
```

**响应** `data`：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | 用户 ID |
| username | string | 用户名 |
| balance | float | 余额（USDT） |

---

## 长效号码

典型流程：选项目 →（可选）选前缀 → 购买下单 → 用号码令牌轮询短信。

### 获取项目分类

```
GET /api/v1/app/categories
```

**响应** `data`：`[{ "id": 1, "name": "社交" }]`

### 获取项目列表

```
GET /api/v1/apps?page=1&limit=40&keyword=&cate_id=0
```

| 参数 | 必填 | 说明 |
|------|------|------|
| page / limit | 否 | 分页，默认 1 / 40 |
| keyword | 否 | 项目名称关键词 |
| cate_id | 否 | 分类 ID，0 为全部 |

**响应** `data.list[]`：

| 字段 | 说明 |
|------|------|
| id | 项目 ID |
| name | 项目名称 |
| icon | 图标 URL |
| cate_id | 分类 ID |
| price | 单价（USDT） |
| stock | 库存 |
| success_rate | 成功率 %，无数据为 null |

### 获取号码前缀

```
GET /api/v1/apps/{id}/prefixes?type=1&expiry=0
```

**响应** `data`：`{ "list": [{ "prefix": "1440", "num": 3500 }], "total": 4700 }`

### 购买号码

```
POST /api/v1/orders
```

**请求体**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| app_id | int | 是 | 项目 ID |
| num | int | 是 | 数量 1～50000 |
| type | int | 否 | 固定 1 |
| expiry | int | 否 | 有效期档位 0-5 |
| prefix | string | 否 | 指定号段前缀 |
| exclude_prefix | string | 否 | 排除号段前缀 |

> 下单即扣款。响应 `data.order` 为订单信息，`data.phones[]` 为号码清单，每个号码含短信查询令牌 `token` 与直连地址 `proxy_url`。

### 订单列表

```
GET /api/v1/orders?page=1&limit=20&order_id=&app_name=
```

### 号码列表

```
GET /api/v1/phones?page=1&limit=20&order_id=&app_name=&tel=
```

**响应** `data.list[]`：`order_no` / `app_name` / `tel` / `token` / `end_time` / `created_at`

### 查询短信（无需 API Key）

```
GET /api/v1/sms?token=号码令牌
```

```json
// 已收到
{ "code": 1, "msg": "success", "data": { "msg": "[Telegram] Your code is 88888" } }
// 未收到
{ "code": 0, "msg": "暂无短信" }
```

建议 3～5 秒轮询一次。

---

## 在线接码

典型流程：选应用 → 选国家 → 取号（扣款）→ 轮询取码。未收码可释放**即时退款**，超时（约 10 分钟）**自动退款**。

**会话状态**：`1` 等待接码 · `2` 已收码 · `3` 已释放（退款） · `4` 超时（退款）

### 获取应用列表

```
GET /api/v1/online/apps?keyword=
```

**响应** `data.list[]`：`{ "id": "1001", "name": "WhatsApp", "icon": "..." }`

### 获取国家报价

```
GET /api/v1/online/countries?app_id=1001&keyword=
```

**响应** `data.list[]`：

| 字段 | 说明 |
|------|------|
| country_id | 国家 ID（取号时传入） |
| title / iso / dial_code | 国家名 / ISO 码 / 区号 |
| price | 单价（USDT） |
| available | 是否有货 |
| success_rate | 成功率 %，无数据为 null |

### 购买取号

```
POST /api/v1/online/orders
```

**请求体**：`{ "app_id": "1001", "country": "52", "quantity": 1 }`（quantity 1～10）

**响应** `data.list[]` 会话对象：

| 字段 | 说明 |
|------|------|
| session_no | 会话号（取码/释放凭证） |
| project_name / country_title / iso | 应用 / 国家 |
| tel | 含区号的完整号码 |
| unit_price | 单价（USDT） |
| status | 会话状态 1-4 |
| code / sms_content | 验证码 / 短信原文 |
| expire_at | 过期时间 |

### 轮询取码

```
GET /api/v1/online/orders/{session_no}/code
```

`status=2` 时 `code` 为验证码。建议 3～5 秒轮询一次。

### 释放退款（取消激活）

```
POST /api/v1/online/orders/{session_no}/release
```

未收码时可释放，费用即时退回余额；已收码会话不可释放。

### 接码记录

```
GET /api/v1/online/orders?page=1&limit=10&status=&tel=
```

返回最近 1 小时内的会话记录。

---

## SDK

官方提供 Node.js / Python / Go / Java / 浏览器 JS 五种 SDK，见仓库 `sdk/` 目录与 [SDK 使用指南](https://doc.yljm.cc/sdk.html)。

© [银狼接码](https://yljm.cc)
