/**
 * 银狼接码官方 JavaScript SDK（ESM，浏览器 / Deno / Bun / Node 18+ 通用）
 * 文档：https://doc.yljm.cc/
 *
 * ⚠️ API Key 等同账户权限，请勿在公开网页中明文使用，
 *    建议仅在内部工具 / Electron / 油猴脚本等可控环境使用。
 */

const DEFAULT_BASE_URL = "https://a.yljm.cc";

export class YinglangSMSError extends Error {
  constructor(message, code, httpStatus) {
    super(message);
    this.name = "YinglangSMSError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class YinglangSMS {
  /**
   * @param {string} apiKey 个人中心 → 开发者 API 生成的 API Key
   * @param {{ baseUrl?: string, timeout?: number }} [opts]
   */
  constructor(apiKey, opts = {}) {
    if (!apiKey) throw new YinglangSMSError("缺少 API Key");
    this.apiKey = apiKey;
    this.baseUrl = (opts.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeout = opts.timeout || 15000;
  }

  async _request(method, path, { query, body, auth = true } = {}) {
    const url = new URL(this.baseUrl + path);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
      }
    }
    const headers = { "Content-Type": "application/json" };
    if (auth) headers.Authorization = this.apiKey;

    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    });
    let data;
    try {
      data = await resp.json();
    } catch {
      throw new YinglangSMSError(`响应解析失败（HTTP ${resp.status}）`, undefined, resp.status);
    }
    if (!resp.ok || data.code !== 1) {
      throw new YinglangSMSError(data.msg || `请求失败（HTTP ${resp.status}）`, data.code, resp.status);
    }
    return data.data;
  }

  // ---------- 账户 ----------

  /** 余额查询 → { id, username, balance } */
  getUserInfo() {
    return this._request("GET", "/api/v1/user/info");
  }

  // ---------- 长效号码 ----------

  /** 项目分类 → [{ id, name }] */
  getCategories() {
    return this._request("GET", "/api/v1/app/categories");
  }

  /** 项目列表 → { list, total } */
  getApps({ page = 1, limit = 40, keyword, cateId } = {}) {
    return this._request("GET", "/api/v1/apps", { query: { page, limit, keyword, cate_id: cateId } });
  }

  /** 号码前缀 → { list: [{ prefix, num }], total } */
  getPrefixes(appId, { type = 1, expiry = 0 } = {}) {
    return this._request("GET", `/api/v1/apps/${appId}/prefixes`, { query: { type, expiry } });
  }

  /** 购买号码（下单即扣款）→ { order, phones } */
  createOrder({ appId, num, type = 1, expiry = 0, prefix, excludePrefix } = {}) {
    return this._request("POST", "/api/v1/orders", {
      body: { app_id: appId, num, type, expiry, prefix, exclude_prefix: excludePrefix },
    });
  }

  /** 订单列表 → { list, total } */
  listOrders({ page = 1, limit = 20, orderId, appName } = {}) {
    return this._request("GET", "/api/v1/orders", {
      query: { page, limit, order_id: orderId, app_name: appName },
    });
  }

  /** 号码列表 → { list, total } */
  listPhones({ page = 1, limit = 20, orderId, appName, tel } = {}) {
    return this._request("GET", "/api/v1/phones", {
      query: { page, limit, order_id: orderId, app_name: appName, tel },
    });
  }

  /** 查询短信（无需 API Key）。未收到返回 null。 */
  async getSms(token) {
    try {
      const data = await this._request("GET", "/api/v1/sms", { query: { token }, auth: false });
      return data.msg;
    } catch (e) {
      if (e instanceof YinglangSMSError && e.code === 0) return null; // 暂无短信
      throw e;
    }
  }

  /** 轮询等待短信（秒），超时抛 YinglangSMSError。 */
  async waitForSms(token, { timeout = 300, interval = 5 } = {}) {
    const deadline = Date.now() + timeout * 1000;
    while (Date.now() < deadline) {
      const sms = await this.getSms(token);
      if (sms) return sms;
      await sleep(interval * 1000);
    }
    throw new YinglangSMSError("等待短信超时");
  }

  // ---------- 在线接码 ----------

  /** 应用列表 → { list: [{ id, name, icon }] } */
  onlineApps(keyword) {
    return this._request("GET", "/api/v1/online/apps", { query: { keyword } });
  }

  /** 国家报价 → { list } */
  onlineCountries(appId, keyword) {
    return this._request("GET", "/api/v1/online/countries", { query: { app_id: appId, keyword } });
  }

  /** 购买取号（扣款，1~10 个）→ { list: [session], count } */
  onlineBuy({ appId, country, quantity = 1 } = {}) {
    return this._request("POST", "/api/v1/online/orders", {
      body: { app_id: appId, country, quantity },
    });
  }

  /** 查询会话（status=2 时 code 为验证码） */
  onlineGetCode(sessionNo) {
    return this._request("GET", `/api/v1/online/orders/${sessionNo}/code`);
  }

  /** 轮询等待验证码（秒）。status=2 返回会话；释放/超时或等待超时抛错。 */
  async onlineWaitCode(sessionNo, { timeout = 300, interval = 5 } = {}) {
    const deadline = Date.now() + timeout * 1000;
    while (Date.now() < deadline) {
      const s = await this.onlineGetCode(sessionNo);
      if (s.status === 2) return s;
      if (s.status === 3) throw new YinglangSMSError("会话已释放（已退款）");
      if (s.status === 4) throw new YinglangSMSError("会话已超时（已自动退款）");
      await sleep(interval * 1000);
    }
    throw new YinglangSMSError("等待验证码超时");
  }

  /** 释放退款（未收码时可用） */
  onlineRelease(sessionNo) {
    return this._request("POST", `/api/v1/online/orders/${sessionNo}/release`);
  }

  /** 接码记录（最近 1 小时）→ { list, total } */
  onlineOrders({ page = 1, limit = 10, status, tel } = {}) {
    return this._request("GET", "/api/v1/online/orders", { query: { page, limit, status, tel } });
  }
}

export default YinglangSMS;
