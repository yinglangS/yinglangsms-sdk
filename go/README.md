# yinglangsms-go — 银狼接码官方 Go SDK

[银狼接码](https://yljm.cc) 开放 API 的 Go 封装：程序化购买海外手机号码、接收短信验证码。Go 1.20+，零第三方依赖，全部方法支持 `context`。

- 📖 API 文档：<https://doc.yljm.cc/>
- 🔑 获取 API Key：登录 [yljm.cc](https://yljm.cc) → 个人中心 → 开发者 API

## 安装

```bash
go get github.com/yinglangS/yinglangsms-sdk/go
# 或直接把 yinglangsms.go 复制进你的项目
```

## 快速开始

```go
package main

import (
	"context"
	"fmt"
	"time"

	yinglangsms "github.com/yinglangS/yinglangsms-sdk/go"
)

func main() {
	ctx := context.Background()
	client := yinglangsms.New("你的API_KEY")

	// 余额
	info, err := client.GetUserInfo(ctx)
	if err != nil {
		panic(err)
	}
	fmt.Println(info.Username, info.Balance)

	// 在线接码：取号 → 等验证码 → 未收到释放退款
	buy, err := client.OnlineBuy(ctx, yinglangsms.OnlineBuyReq{AppID: "1001", Country: "52", Quantity: 1})
	if err != nil {
		panic(err)
	}
	session := buy.List[0]
	fmt.Println("号码:", session.Tel)

	done, err := client.OnlineWaitCode(ctx, session.SessionNo, 5*time.Minute)
	if err != nil {
		client.OnlineRelease(ctx, session.SessionNo)
		fmt.Println("未收到验证码，已释放退款:", err)
		return
	}
	fmt.Println("验证码:", done.Code)
}
```

## 长效号码（批量购买 → 轮询短信）

```go
resp, err := client.CreateOrder(ctx, yinglangsms.CreateOrderReq{
	AppID:  123,
	Num:    10,
	Prefix: "1440", // 可选：指定号段
})
if err != nil {
	panic(err)
}
fmt.Println("订单:", resp.Order.OrderID, "号码数:", len(resp.Phones))

sms, err := client.WaitForSms(ctx, resp.Phones[0].Token, 5*time.Minute, 5*time.Second)
if err == nil {
	fmt.Println("收到短信:", sms)
}
```

## 错误处理

业务失败返回 `*yinglangsms.Error`：

```go
if _, err := client.GetUserInfo(ctx); err != nil {
	var apiErr *yinglangsms.Error
	if errors.As(err, &apiErr) {
		fmt.Println("业务失败:", apiErr.Msg, "code:", apiErr.Code, "http:", apiErr.HTTPStatus)
	}
}
```

## 全部方法

| 方法 | 说明 |
|------|------|
| `GetUserInfo(ctx)` | 余额查询 |
| `GetCategories(ctx)` | 项目分类 |
| `GetApps(ctx, AppsQuery)` | 项目列表 |
| `GetPrefixes(ctx, appID, expiry)` | 号码前缀 |
| `CreateOrder(ctx, CreateOrderReq)` | 购买号码 |
| `ListOrders(ctx, page, limit, orderID, appName)` | 订单列表 |
| `ListPhones(ctx, page, limit, orderID, appName, tel)` | 号码列表 |
| `GetSms(ctx, token)` | 查询短信（未收到返回空串） |
| `WaitForSms(ctx, token, timeout, interval)` | 轮询等短信 |
| `OnlineApps(ctx, keyword)` | 在线接码应用列表 |
| `OnlineCountries(ctx, appID, keyword)` | 国家报价 |
| `OnlineBuy(ctx, OnlineBuyReq)` | 购买取号 |
| `OnlineGetCode(ctx, sessionNo)` | 查询会话/取码 |
| `OnlineWaitCode(ctx, sessionNo, timeout)` | 轮询等验证码 |
| `OnlineRelease(ctx, sessionNo)` | 释放退款 |
| `OnlineOrders(ctx, page, limit, status, tel)` | 接码记录 |

## 链接

- 官网：<https://yljm.cc>
- 在线文档：<https://doc.yljm.cc/>

MIT License · © [银狼接码](https://yljm.cc)
