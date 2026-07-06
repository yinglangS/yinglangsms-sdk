"use strict";

/**
 * 银狼接码官方 Node.js SDK（Node 18+，零依赖）
 * 文档：https://doc.yljm.cc/
 */

const DEFAULT_BASE_URL = "https://a.yljm.cc";

class YinglangSMSError extends Error {
  /**
   * @param {string} message 错误信息
   * @param {number} [code] 业务 code（0=业务失败，401/403=鉴权失败）
   * @param {number} [httpStatus] HTTP 状态码
   */
  constructor(message, code, httpStatus) {
    super(message);
    this.name = "YinglangSMSError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class YinglangSMS {
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

  /** 获取项目分类 → [{ id, name }] */
  getCategories() {
    return this._request("GET", "/api/v1/app/categories");
  }

  /** 获取项目列表 → { list, total } */
  getApps({ page = 1, limit = 40, keyword, cateId } = {}) {
    return this._request("GET", "/api/v1/apps", {
      query: { page, limit, keyword, cate_id: cateId },
    });
  }

  /** 获取号码前缀 → { list: [{ prefix, num }], total } */
  getPrefixes(appId, { type = 1, expiry = 0 } = {}) {
    return this._request("GET", `/api/v1/apps/${appId}/prefixes`, {
      query: { type, expiry },
    });
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

  /**
   * 查询短信（无需 API Key）。
   * @returns {Promise<string|null>} 短信内容；尚未收到返回 null
   */
  async getSms(token) {
    try {
      const data = await this._request("GET", "/api/v1/sms", {
        query: { token },
        auth: false,
      });
      return data.msg;
    } catch (e) {
      if (e instanceof YinglangSMSError && e.code === 0) return null; // 暂无短信
      throw e;
    }
  }

  /**
   * 轮询等待短信。
   * @param {string} token 号码令牌
   * @param {{ timeout?: number, interval?: number }} [opts] 单位秒，默认 300 / 5
   * @returns {Promise<string>} 短信内容；超时抛 YinglangSMSError
   */
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

  /** 获取应用列表 → { list: [{ id, name, icon }] } */
  onlineApps(keyword) {
    return this._request("GET", "/api/v1/online/apps", { query: { keyword } });
  }

  /** 获取国家报价 → { list: [{ country_id, title, iso, dial_code, price, available, success_rate }] } */
  onlineCountries(appId, keyword) {
    return this._request("GET", "/api/v1/online/countries", {
      query: { app_id: appId, keyword },
    });
  }

  /** 购买取号（扣款，1~10 个）→ { list: [session], count } */
  onlineBuy({ appId, country, quantity = 1 } = {}) {
    return this._request("POST", "/api/v1/online/orders", {
      body: { app_id: appId, country, quantity },
    });
  }

  /** 查询会话（轮询取码）→ session（status=2 时 code 为验证码） */
  onlineGetCode(sessionNo) {
    return this._request("GET", `/api/v1/online/orders/${sessionNo}/code`);
  }

  /**
   * 轮询等待验证码，status=2 返回会话；释放/超时（status=3/4）或等待超时抛错。
   * @param {{ timeout?: number, interval?: number }} [opts] 单位秒，默认 300 / 5
   */
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

  /** 释放退款（未收码时可用）→ session */
  onlineRelease(sessionNo) {
    return this._request("POST", `/api/v1/online/orders/${sessionNo}/release`);
  }

  /** 接码记录（最近 1 小时）→ { list, total } */
  onlineOrders({ page = 1, limit = 10, status, tel } = {}) {
    return this._request("GET", "/api/v1/online/orders", {
      query: { page, limit, status, tel },
    });
  }
}

module.exports = { YinglangSMS, YinglangSMSError };
