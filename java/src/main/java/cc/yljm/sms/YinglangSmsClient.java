package cc.yljm.sms;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonSyntaxException;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 银狼接码官方 Java SDK（Java 11+，仅依赖 Gson）。
 *
 * <p>文档: <a href="https://doc.yljm.cc/">https://doc.yljm.cc/</a>
 * <p>获取 API Key: 登录 <a href="https://yljm.cc">yljm.cc</a> → 个人中心 → 开发者 API
 */
public class YinglangSmsClient {

    public static final String DEFAULT_BASE_URL = "https://a.yljm.cc";

    private final String apiKey;
    private final String baseUrl;
    private final HttpClient http;
    private final Gson gson = new Gson();
    private final Duration requestTimeout;

    public YinglangSmsClient(String apiKey) {
        this(apiKey, DEFAULT_BASE_URL, Duration.ofSeconds(15));
    }

    public YinglangSmsClient(String apiKey, String baseUrl, Duration requestTimeout) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new YinglangSmsException("缺少 API Key");
        }
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.requestTimeout = requestTimeout;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    // ---------- 账户 ----------

    /** 余额查询 → {id, username, balance} */
    public JsonObject getUserInfo() {
        return request("GET", "/api/v1/user/info", null, null, true).getAsJsonObject();
    }

    // ---------- 长效号码 ----------

    /** 项目分类 → [{id, name}] */
    public JsonElement getCategories() {
        return request("GET", "/api/v1/app/categories", null, null, true);
    }

    /** 项目列表 → {list, total} */
    public JsonObject getApps(int page, int limit, String keyword, int cateId) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("page", String.valueOf(page));
        q.put("limit", String.valueOf(limit));
        if (keyword != null && !keyword.isEmpty()) q.put("keyword", keyword);
        if (cateId > 0) q.put("cate_id", String.valueOf(cateId));
        return request("GET", "/api/v1/apps", q, null, true).getAsJsonObject();
    }

    /** 号码前缀 → {list: [{prefix, num}], total} */
    public JsonObject getPrefixes(long appId, int expiry) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("type", "1");
        q.put("expiry", String.valueOf(expiry));
        return request("GET", "/api/v1/apps/" + appId + "/prefixes", q, null, true).getAsJsonObject();
    }

    /** 购买号码（下单即扣款）→ {order, phones} */
    public JsonObject createOrder(long appId, int num, int expiry, String prefix, String excludePrefix) {
        JsonObject body = new JsonObject();
        body.addProperty("app_id", appId);
        body.addProperty("num", num);
        body.addProperty("type", 1);
        body.addProperty("expiry", expiry);
        if (prefix != null && !prefix.isEmpty()) body.addProperty("prefix", prefix);
        if (excludePrefix != null && !excludePrefix.isEmpty()) body.addProperty("exclude_prefix", excludePrefix);
        return request("POST", "/api/v1/orders", null, body, true).getAsJsonObject();
    }

    public JsonObject createOrder(long appId, int num) {
        return createOrder(appId, num, 0, null, null);
    }

    /** 订单列表 → {list, total} */
    public JsonObject listOrders(int page, int limit, String orderId, String appName) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("page", String.valueOf(page));
        q.put("limit", String.valueOf(limit));
        if (orderId != null && !orderId.isEmpty()) q.put("order_id", orderId);
        if (appName != null && !appName.isEmpty()) q.put("app_name", appName);
        return request("GET", "/api/v1/orders", q, null, true).getAsJsonObject();
    }

    /** 号码列表 → {list, total} */
    public JsonObject listPhones(int page, int limit, String orderId, String appName, String tel) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("page", String.valueOf(page));
        q.put("limit", String.valueOf(limit));
        if (orderId != null && !orderId.isEmpty()) q.put("order_id", orderId);
        if (appName != null && !appName.isEmpty()) q.put("app_name", appName);
        if (tel != null && !tel.isEmpty()) q.put("tel", tel);
        return request("GET", "/api/v1/phones", q, null, true).getAsJsonObject();
    }

    /**
     * 查询短信（无需 API Key）。
     *
     * @return 短信内容；尚未收到返回 null
     */
    public String getSms(String token) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("token", token);
        try {
            JsonObject data = request("GET", "/api/v1/sms", q, null, false).getAsJsonObject();
            return data.get("msg").getAsString();
        } catch (YinglangSmsException e) {
            if (e.getCode() == 0) return null; // 暂无短信
            throw e;
        }
    }

    /** 轮询等待短信（秒），超时抛 YinglangSmsException。 */
    public String waitForSms(String token, long timeoutSeconds) {
        long deadline = System.currentTimeMillis() + timeoutSeconds * 1000;
        while (System.currentTimeMillis() < deadline) {
            String sms = getSms(token);
            if (sms != null && !sms.isEmpty()) return sms;
            sleep(5000);
        }
        throw new YinglangSmsException("等待短信超时");
    }

    // ---------- 在线接码 ----------

    /** 应用列表 → {list: [{id, name, icon}]} */
    public JsonObject onlineApps(String keyword) {
        Map<String, String> q = new LinkedHashMap<>();
        if (keyword != null && !keyword.isEmpty()) q.put("keyword", keyword);
        return request("GET", "/api/v1/online/apps", q, null, true).getAsJsonObject();
    }

    /** 国家报价 → {list: [{country_id, title, iso, dial_code, price, available, success_rate}]} */
    public JsonObject onlineCountries(String appId, String keyword) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("app_id", appId);
        if (keyword != null && !keyword.isEmpty()) q.put("keyword", keyword);
        return request("GET", "/api/v1/online/countries", q, null, true).getAsJsonObject();
    }

    /** 购买取号（扣款，1~10 个）→ {list: [session], count} */
    public JsonObject onlineBuy(String appId, String country, int quantity) {
        JsonObject body = new JsonObject();
        body.addProperty("app_id", appId);
        body.addProperty("country", country);
        body.addProperty("quantity", Math.max(quantity, 1));
        return request("POST", "/api/v1/online/orders", null, body, true).getAsJsonObject();
    }

    /** 查询会话（status=2 时 code 为验证码） */
    public JsonObject onlineGetCode(String sessionNo) {
        return request("GET", "/api/v1/online/orders/" + encode(sessionNo) + "/code", null, null, true)
                .getAsJsonObject();
    }

    /**
     * 轮询等待验证码（秒）。status=2 返回会话；会话被释放/超时或等待超时抛 YinglangSmsException。
     */
    public JsonObject onlineWaitCode(String sessionNo, long timeoutSeconds) {
        long deadline = System.currentTimeMillis() + timeoutSeconds * 1000;
        while (System.currentTimeMillis() < deadline) {
            JsonObject s = onlineGetCode(sessionNo);
            int status = s.get("status").getAsInt();
            if (status == 2) return s;
            if (status == 3) throw new YinglangSmsException("会话已释放（已退款）");
            if (status == 4) throw new YinglangSmsException("会话已超时（已自动退款）");
            sleep(5000);
        }
        throw new YinglangSmsException("等待验证码超时");
    }

    /** 释放退款（未收码时可用） */
    public JsonObject onlineRelease(String sessionNo) {
        return request("POST", "/api/v1/online/orders/" + encode(sessionNo) + "/release", null, null, true)
                .getAsJsonObject();
    }

    /** 接码记录（最近 1 小时）→ {list, total}。status 传 0 表示全部。 */
    public JsonObject onlineOrders(int page, int limit, int status, String tel) {
        Map<String, String> q = new LinkedHashMap<>();
        q.put("page", String.valueOf(page));
        q.put("limit", String.valueOf(limit));
        if (status > 0) q.put("status", String.valueOf(status));
        if (tel != null && !tel.isEmpty()) q.put("tel", tel);
        return request("GET", "/api/v1/online/orders", q, null, true).getAsJsonObject();
    }

    // ---------- 内部 ----------

    private JsonElement request(String method, String path, Map<String, String> query,
                                JsonObject body, boolean auth) {
        StringBuilder url = new StringBuilder(baseUrl).append(path);
        if (query != null && !query.isEmpty()) {
            url.append('?');
            boolean first = true;
            for (Map.Entry<String, String> e : query.entrySet()) {
                if (!first) url.append('&');
                url.append(encode(e.getKey())).append('=').append(encode(e.getValue()));
                first = false;
            }
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url.toString()))
                .timeout(requestTimeout)
                .header("Content-Type", "application/json");
        if (auth) builder.header("Authorization", apiKey);
        if (body != null) {
            builder.method(method, HttpRequest.BodyPublishers.ofString(gson.toJson(body), StandardCharsets.UTF_8));
        } else {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        }

        HttpResponse<String> resp;
        try {
            resp = http.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new YinglangSmsException("请求失败: " + e.getMessage());
        }

        JsonObject env;
        try {
            env = gson.fromJson(resp.body(), JsonObject.class);
        } catch (JsonSyntaxException e) {
            throw new YinglangSmsException("响应解析失败（HTTP " + resp.statusCode() + "）", -1, resp.statusCode());
        }
        if (env == null || !env.has("code")) {
            throw new YinglangSmsException("响应解析失败（HTTP " + resp.statusCode() + "）", -1, resp.statusCode());
        }
        int code = env.get("code").getAsInt();
        if (resp.statusCode() != 200 || code != 1) {
            String msg = env.has("msg") ? env.get("msg").getAsString() : "请求失败（HTTP " + resp.statusCode() + "）";
            throw new YinglangSmsException(msg, code, resp.statusCode());
        }
        return env.has("data") ? env.get("data") : new JsonObject();
    }

    private static String encode(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new YinglangSmsException("等待被中断");
        }
    }
}
