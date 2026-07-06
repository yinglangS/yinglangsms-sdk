# -*- coding: utf-8 -*-
"""银狼接码官方 Python SDK（Python 3.8+）

文档: https://doc.yljm.cc/
获取 API Key: 登录 https://yljm.cc → 个人中心 → 开发者 API
"""
import time
from typing import Any, Dict, List, Optional

import requests

__all__ = ["YinglangSMS", "YinglangSMSError"]
__version__ = "1.0.0"

DEFAULT_BASE_URL = "https://a.yljm.cc"


class YinglangSMSError(Exception):
    """业务失败（code != 1）或鉴权失败时抛出。"""

    def __init__(self, message: str, code: Optional[int] = None, http_status: Optional[int] = None):
        super().__init__(message)
        self.code = code
        self.http_status = http_status


class YinglangSMS:
    def __init__(self, api_key: str, base_url: str = DEFAULT_BASE_URL, timeout: float = 15.0):
        if not api_key:
            raise YinglangSMSError("缺少 API Key")
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()

    def _request(self, method: str, path: str, *, params: Optional[dict] = None,
                 json_body: Optional[dict] = None, auth: bool = True) -> Any:
        headers = {"Content-Type": "application/json"}
        if auth:
            headers["Authorization"] = self.api_key
        if params:
            params = {k: v for k, v in params.items() if v not in (None, "")}
        resp = self._session.request(
            method, self.base_url + path,
            params=params, json=json_body, headers=headers, timeout=self.timeout,
        )
        try:
            data = resp.json()
        except ValueError:
            raise YinglangSMSError(f"响应解析失败（HTTP {resp.status_code}）", http_status=resp.status_code)
        if not resp.ok or data.get("code") != 1:
            raise YinglangSMSError(
                data.get("msg") or f"请求失败（HTTP {resp.status_code}）",
                code=data.get("code"), http_status=resp.status_code,
            )
        return data.get("data")

    # ---------- 账户 ----------

    def get_user_info(self) -> Dict[str, Any]:
        """余额查询 → {id, username, balance}"""
        return self._request("GET", "/api/v1/user/info")

    # ---------- 长效号码 ----------

    def get_categories(self) -> List[Dict[str, Any]]:
        """项目分类 → [{id, name}]"""
        return self._request("GET", "/api/v1/app/categories")

    def get_apps(self, page: int = 1, limit: int = 40,
                 keyword: str = "", cate_id: int = 0) -> Dict[str, Any]:
        """项目列表 → {list, total}"""
        return self._request("GET", "/api/v1/apps", params={
            "page": page, "limit": limit, "keyword": keyword, "cate_id": cate_id or None,
        })

    def get_prefixes(self, app_id: int, type: int = 1, expiry: int = 0) -> Dict[str, Any]:
        """号码前缀 → {list: [{prefix, num}], total}"""
        return self._request("GET", f"/api/v1/apps/{app_id}/prefixes",
                             params={"type": type, "expiry": expiry})

    def create_order(self, app_id: int, num: int, *, expiry: int = 0,
                     prefix: str = "", exclude_prefix: str = "") -> Dict[str, Any]:
        """购买号码（下单即扣款）→ {order, phones}"""
        return self._request("POST", "/api/v1/orders", json_body={
            "app_id": app_id, "num": num, "type": 1, "expiry": expiry,
            "prefix": prefix, "exclude_prefix": exclude_prefix,
        })

    def list_orders(self, page: int = 1, limit: int = 20,
                    order_id: str = "", app_name: str = "") -> Dict[str, Any]:
        """订单列表 → {list, total}"""
        return self._request("GET", "/api/v1/orders", params={
            "page": page, "limit": limit, "order_id": order_id, "app_name": app_name,
        })

    def list_phones(self, page: int = 1, limit: int = 20, order_id: str = "",
                    app_name: str = "", tel: str = "") -> Dict[str, Any]:
        """号码列表 → {list, total}"""
        return self._request("GET", "/api/v1/phones", params={
            "page": page, "limit": limit, "order_id": order_id,
            "app_name": app_name, "tel": tel,
        })

    def get_sms(self, token: str) -> Optional[str]:
        """查询短信（无需 API Key）。未收到返回 None。"""
        try:
            data = self._request("GET", "/api/v1/sms", params={"token": token}, auth=False)
            return data.get("msg")
        except YinglangSMSError as e:
            if e.code == 0:  # 暂无短信
                return None
            raise

    def wait_for_sms(self, token: str, timeout: float = 300, interval: float = 5) -> str:
        """轮询等待短信，超时抛 TimeoutError。"""
        deadline = time.time() + timeout
        while time.time() < deadline:
            sms = self.get_sms(token)
            if sms:
                return sms
            time.sleep(interval)
        raise TimeoutError("等待短信超时")

    # ---------- 在线接码 ----------

    def online_apps(self, keyword: str = "") -> Dict[str, Any]:
        """应用列表 → {list: [{id, name, icon}]}"""
        return self._request("GET", "/api/v1/online/apps", params={"keyword": keyword})

    def online_countries(self, app_id: str, keyword: str = "") -> Dict[str, Any]:
        """国家报价 → {list: [{country_id, title, iso, dial_code, price, available, success_rate}]}"""
        return self._request("GET", "/api/v1/online/countries",
                             params={"app_id": app_id, "keyword": keyword})

    def online_buy(self, app_id: str, country: str, quantity: int = 1) -> Dict[str, Any]:
        """购买取号（扣款，1~10 个）→ {list: [session], count}"""
        return self._request("POST", "/api/v1/online/orders", json_body={
            "app_id": app_id, "country": country, "quantity": quantity,
        })

    def online_get_code(self, session_no: str) -> Dict[str, Any]:
        """查询会话（status=2 时 code 为验证码）"""
        return self._request("GET", f"/api/v1/online/orders/{session_no}/code")

    def online_wait_code(self, session_no: str, timeout: float = 300,
                         interval: float = 5) -> Dict[str, Any]:
        """轮询等待验证码。status=2 返回会话；释放/超时抛 YinglangSMSError；等待超时抛 TimeoutError。"""
        deadline = time.time() + timeout
        while time.time() < deadline:
            s = self.online_get_code(session_no)
            status = s.get("status")
            if status == 2:
                return s
            if status == 3:
                raise YinglangSMSError("会话已释放（已退款）")
            if status == 4:
                raise YinglangSMSError("会话已超时（已自动退款）")
            time.sleep(interval)
        raise TimeoutError("等待验证码超时")

    def online_release(self, session_no: str) -> Dict[str, Any]:
        """释放退款（未收码时可用）"""
        return self._request("POST", f"/api/v1/online/orders/{session_no}/release")

    def online_orders(self, page: int = 1, limit: int = 10,
                      status: int = 0, tel: str = "") -> Dict[str, Any]:
        """接码记录（最近 1 小时）→ {list, total}"""
        return self._request("GET", "/api/v1/online/orders", params={
            "page": page, "limit": limit, "status": status or None, "tel": tel,
        })
