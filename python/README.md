# yinglangsms — 银狼接码官方 Python SDK

[银狼接码](https://yljm.cc) 开放 API 的 Python 封装：程序化购买海外手机号码、接收短信验证码。Python 3.8+，仅依赖 requests。

- 📖 API 文档：<https://doc.yljm.cc/>
- 🔑 获取 API Key：登录 [yljm.cc](https://yljm.cc) → 个人中心 → 开发者 API

## 安装

```bash
pip install yinglangsms
# 或直接把 yinglangsms/ 目录复制进你的项目
```

## 快速开始

```python
from yinglangsms import YinglangSMS, YinglangSMSError

client = YinglangSMS("你的API_KEY")

me = client.get_user_info()
print(me["username"], me["balance"])
```

## 在线接码（取号 → 等验证码 → 未收到自动释放退款）

```python
result = client.online_buy(app_id="1001", country="52", quantity=1)
session = result["list"][0]
print("号码:", session["tel"])

try:
    done = client.online_wait_code(session["session_no"], timeout=300, interval=5)
    print("验证码:", done["code"], "短信:", done["sms_content"])
except TimeoutError:
    client.online_release(session["session_no"])
    print("未收到验证码，已释放退款")
```

## 长效号码（批量购买 → 轮询短信）

```python
result = client.create_order(app_id=123, num=10, prefix="1440")
print("订单:", result["order"]["order_id"], "号码数:", len(result["phones"]))

sms = client.wait_for_sms(result["phones"][0]["token"], timeout=300)
print("收到短信:", sms)
```

## 错误处理

```python
try:
    client.create_order(app_id=123, num=1)
except YinglangSMSError as e:
    print("业务失败:", e, "code:", e.code, "http:", e.http_status)
```

## 全部方法

| 方法 | 说明 |
|------|------|
| `get_user_info()` | 余额查询 |
| `get_categories()` | 项目分类 |
| `get_apps(page, limit, keyword, cate_id)` | 项目列表 |
| `get_prefixes(app_id, type, expiry)` | 号码前缀 |
| `create_order(app_id, num, expiry, prefix, exclude_prefix)` | 购买号码 |
| `list_orders(page, limit, order_id, app_name)` | 订单列表 |
| `list_phones(page, limit, order_id, app_name, tel)` | 号码列表 |
| `get_sms(token)` | 查询短信（未收到返回 `None`） |
| `wait_for_sms(token, timeout, interval)` | 轮询等短信 |
| `online_apps(keyword)` | 在线接码应用列表 |
| `online_countries(app_id, keyword)` | 国家报价 |
| `online_buy(app_id, country, quantity)` | 购买取号 |
| `online_get_code(session_no)` | 查询会话/取码 |
| `online_wait_code(session_no, timeout, interval)` | 轮询等验证码 |
| `online_release(session_no)` | 释放退款 |
| `online_orders(page, limit, status, tel)` | 接码记录 |

## 链接

- 官网：<https://yljm.cc>
- 在线文档：<https://doc.yljm.cc/>

MIT License · © [银狼接码](https://yljm.cc)
