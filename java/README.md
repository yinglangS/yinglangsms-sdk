# yinglangsms-sdk — 银狼接码官方 Java SDK

[银狼接码](https://yljm.cc) 开放 API 的 Java 封装：程序化购买海外手机号码、接收短信验证码。Java 11+（原生 HttpClient），仅依赖 Gson。

- 📖 API 文档：<https://doc.yljm.cc/>
- 🔑 获取 API Key：登录 [yljm.cc](https://yljm.cc) → 个人中心 → 开发者 API

## 引入

Maven 发布前，可直接把 `src/main/java/cc/yljm/sms` 两个类复制进项目（记得引入 Gson）：

```xml
<dependency>
  <groupId>com.google.code.gson</groupId>
  <artifactId>gson</artifactId>
  <version>2.11.0</version>
</dependency>
```

## 快速开始

```java
import cc.yljm.sms.YinglangSmsClient;
import cc.yljm.sms.YinglangSmsException;
import com.google.gson.JsonObject;

YinglangSmsClient client = new YinglangSmsClient("你的API_KEY");

// 余额
JsonObject me = client.getUserInfo();
System.out.println(me.get("username").getAsString() + " " + me.get("balance").getAsDouble());
```

## 在线接码（取号 → 等验证码 → 未收到释放退款）

```java
JsonObject buy = client.onlineBuy("1001", "52", 1);
JsonObject session = buy.getAsJsonArray("list").get(0).getAsJsonObject();
String sessionNo = session.get("session_no").getAsString();
System.out.println("号码: " + session.get("tel").getAsString());

try {
    JsonObject done = client.onlineWaitCode(sessionNo, 300);
    System.out.println("验证码: " + done.get("code").getAsString());
} catch (YinglangSmsException e) {
    client.onlineRelease(sessionNo);
    System.out.println("未收到验证码，已释放退款: " + e.getMessage());
}
```

## 长效号码（批量购买 → 轮询短信）

```java
JsonObject result = client.createOrder(123, 10);
JsonObject order = result.getAsJsonObject("order");
String token = result.getAsJsonArray("phones").get(0).getAsJsonObject()
        .get("token").getAsString();
System.out.println("订单: " + order.get("order_id").getAsString());

String sms = client.waitForSms(token, 300);
System.out.println("收到短信: " + sms);
```

## 错误处理

业务失败（`code != 1`）抛出非受检异常 `YinglangSmsException`：

```java
try {
    client.createOrder(123, 1);
} catch (YinglangSmsException e) {
    System.out.println("业务失败: " + e.getMessage()
            + " code=" + e.getCode() + " http=" + e.getHttpStatus());
}
```

## 全部方法

| 方法 | 说明 |
|------|------|
| `getUserInfo()` | 余额查询 |
| `getCategories()` | 项目分类 |
| `getApps(page, limit, keyword, cateId)` | 项目列表 |
| `getPrefixes(appId, expiry)` | 号码前缀 |
| `createOrder(appId, num[, expiry, prefix, excludePrefix])` | 购买号码 |
| `listOrders(page, limit, orderId, appName)` | 订单列表 |
| `listPhones(page, limit, orderId, appName, tel)` | 号码列表 |
| `getSms(token)` | 查询短信（未收到返回 `null`） |
| `waitForSms(token, timeoutSeconds)` | 轮询等短信 |
| `onlineApps(keyword)` | 在线接码应用列表 |
| `onlineCountries(appId, keyword)` | 国家报价 |
| `onlineBuy(appId, country, quantity)` | 购买取号 |
| `onlineGetCode(sessionNo)` | 查询会话/取码 |
| `onlineWaitCode(sessionNo, timeoutSeconds)` | 轮询等验证码 |
| `onlineRelease(sessionNo)` | 释放退款 |
| `onlineOrders(page, limit, status, tel)` | 接码记录 |

## 链接

- 官网：<https://yljm.cc>
- 在线文档：<https://doc.yljm.cc/>

MIT License · © [银狼接码](https://yljm.cc)
