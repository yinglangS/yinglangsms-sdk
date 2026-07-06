# yinglangsms.esm.js — 银狼接码 JavaScript SDK（浏览器 ESM）

[银狼接码](https://yljm.cc) 开放 API 的原生 ESM 封装，单文件零依赖，浏览器 / Deno / Bun / Node 18+ 通用。

- 📖 API 文档：<https://doc.yljm.cc/>
- 🔑 获取 API Key：登录 [yljm.cc](https://yljm.cc) → 个人中心 → 开发者 API

> ⚠️ **安全提醒**：API Key 等同账户操作权限。请勿在公开网页中明文使用本 SDK，建议仅用于内部工具、Electron 应用、油猴脚本等可控环境；跨域调用还需服务端允许你的来源（CORS）。公网产品请把 Key 放在你自己的服务端，使用 Node.js SDK。

## 使用

```html
<script type="module">
import { YinglangSMS, YinglangSMSError } from "./yinglangsms.esm.js";

const client = new YinglangSMS("你的API_KEY");

// 余额
const me = await client.getUserInfo();
console.log(me.username, me.balance);

// 在线接码：取号 → 等验证码
const { list } = await client.onlineBuy({ appId: "1001", country: "52" });
try {
  const done = await client.onlineWaitCode(list[0].session_no, { timeout: 300 });
  console.log("验证码:", done.code);
} catch (e) {
  await client.onlineRelease(list[0].session_no).catch(() => {});
}
</script>
```

方法列表与 [Node.js SDK](../nodejs/README.md) 完全一致（`getUserInfo` / `getApps` / `createOrder` / `waitForSms` / `onlineBuy` / `onlineWaitCode` / `onlineRelease` 等）。

## 链接

- 官网：<https://yljm.cc>
- 在线文档：<https://doc.yljm.cc/>

MIT License · © [银狼接码](https://yljm.cc)
