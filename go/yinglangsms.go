// Package yinglangsms 银狼接码官方 Go SDK（Go 1.20+，零依赖）。
//
// 文档: https://doc.yljm.cc/
// 获取 API Key: 登录 https://yljm.cc → 个人中心 → 开发者 API
package yinglangsms

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const DefaultBaseURL = "https://a.yljm.cc"

// Error 业务失败（code != 1）或鉴权失败。
type Error struct {
	Msg        string
	Code       int
	HTTPStatus int
}

func (e *Error) Error() string { return e.Msg }

// Client 银狼接码 API 客户端。
type Client struct {
	APIKey     string
	BaseURL    string
	HTTPClient *http.Client
}

// New 创建客户端。
func New(apiKey string) *Client {
	return &Client{
		APIKey:     apiKey,
		BaseURL:    DefaultBaseURL,
		HTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

type envelope struct {
	Code int             `json:"code"`
	Msg  string          `json:"msg"`
	Data json.RawMessage `json:"data"`
}

func (c *Client) request(ctx context.Context, method, path string, query url.Values, body any, auth bool, out any) error {
	u := strings.TrimRight(c.BaseURL, "/") + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}
	var reader *bytes.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(b)
	} else {
		reader = bytes.NewReader(nil)
	}
	req, err := http.NewRequestWithContext(ctx, method, u, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if auth {
		req.Header.Set("Authorization", c.APIKey)
	}
	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var env envelope
	if err := json.NewDecoder(resp.Body).Decode(&env); err != nil {
		return &Error{Msg: fmt.Sprintf("响应解析失败（HTTP %d）", resp.StatusCode), HTTPStatus: resp.StatusCode}
	}
	if resp.StatusCode != http.StatusOK || env.Code != 1 {
		msg := env.Msg
		if msg == "" {
			msg = fmt.Sprintf("请求失败（HTTP %d）", resp.StatusCode)
		}
		return &Error{Msg: msg, Code: env.Code, HTTPStatus: resp.StatusCode}
	}
	if out != nil && len(env.Data) > 0 {
		return json.Unmarshal(env.Data, out)
	}
	return nil
}

// ---------- 账户 ----------

// UserInfo 账户信息。
type UserInfo struct {
	ID       uint64  `json:"id"`
	Username string  `json:"username"`
	Balance  float64 `json:"balance"`
}

// GetUserInfo 余额查询。
func (c *Client) GetUserInfo(ctx context.Context) (*UserInfo, error) {
	var out UserInfo
	err := c.request(ctx, "GET", "/api/v1/user/info", nil, nil, true, &out)
	return &out, err
}

// ---------- 长效号码 ----------

type Category struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// GetCategories 项目分类。
func (c *Client) GetCategories(ctx context.Context) ([]Category, error) {
	var out []Category
	err := c.request(ctx, "GET", "/api/v1/app/categories", nil, nil, true, &out)
	return out, err
}

type App struct {
	ID          uint64   `json:"id"`
	Name        string   `json:"name"`
	Icon        string   `json:"icon"`
	CateID      int      `json:"cate_id"`
	Price       float64  `json:"price"`
	Stock       int      `json:"stock"`
	SuccessRate *float64 `json:"success_rate"`
}

type AppsQuery struct {
	Page    int
	Limit   int
	Keyword string
	CateID  int
}

type AppList struct {
	List  []App `json:"list"`
	Total int64 `json:"total"`
}

// GetApps 项目列表。
func (c *Client) GetApps(ctx context.Context, q AppsQuery) (*AppList, error) {
	v := url.Values{}
	if q.Page > 0 {
		v.Set("page", fmt.Sprint(q.Page))
	}
	if q.Limit > 0 {
		v.Set("limit", fmt.Sprint(q.Limit))
	}
	if q.Keyword != "" {
		v.Set("keyword", q.Keyword)
	}
	if q.CateID > 0 {
		v.Set("cate_id", fmt.Sprint(q.CateID))
	}
	var out AppList
	err := c.request(ctx, "GET", "/api/v1/apps", v, nil, true, &out)
	return &out, err
}

type Prefix struct {
	Prefix string `json:"prefix"`
	Num    int    `json:"num"`
}

type PrefixList struct {
	List  []Prefix `json:"list"`
	Total int      `json:"total"`
}

// GetPrefixes 号码前缀。expiry 传 0 使用默认档位。
func (c *Client) GetPrefixes(ctx context.Context, appID uint64, expiry int) (*PrefixList, error) {
	v := url.Values{"type": {"1"}, "expiry": {fmt.Sprint(expiry)}}
	var out PrefixList
	err := c.request(ctx, "GET", fmt.Sprintf("/api/v1/apps/%d/prefixes", appID), v, nil, true, &out)
	return &out, err
}

type CreateOrderReq struct {
	AppID         uint64 `json:"app_id"`
	Num           int    `json:"num"`
	Type          int    `json:"type"`
	Expiry        int    `json:"expiry"`
	Prefix        string `json:"prefix,omitempty"`
	ExcludePrefix string `json:"exclude_prefix,omitempty"`
}

type Order struct {
	OrderID     string  `json:"order_id"`
	AppName     string  `json:"app_name"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	TotalAmount float64 `json:"total_amount"`
	Status      int8    `json:"status"`
	CreatedAt   string  `json:"created_at"`
}

type Phone struct {
	OrderNo   string `json:"order_no"`
	AppName   string `json:"app_name"`
	Tel       string `json:"tel"`
	Token     string `json:"token"`
	ProxyURL  string `json:"proxy_url"`
	EndTime   string `json:"end_time"`
	CreatedAt string `json:"created_at"`
}

type CreateOrderResp struct {
	Order  Order   `json:"order"`
	Phones []Phone `json:"phones"`
}

// CreateOrder 购买号码（下单即扣款）。
func (c *Client) CreateOrder(ctx context.Context, req CreateOrderReq) (*CreateOrderResp, error) {
	if req.Type == 0 {
		req.Type = 1
	}
	var out CreateOrderResp
	err := c.request(ctx, "POST", "/api/v1/orders", nil, req, true, &out)
	return &out, err
}

type OrderList struct {
	List  []Order `json:"list"`
	Total int64   `json:"total"`
}

// ListOrders 订单列表。
func (c *Client) ListOrders(ctx context.Context, page, limit int, orderID, appName string) (*OrderList, error) {
	v := url.Values{}
	if page > 0 {
		v.Set("page", fmt.Sprint(page))
	}
	if limit > 0 {
		v.Set("limit", fmt.Sprint(limit))
	}
	if orderID != "" {
		v.Set("order_id", orderID)
	}
	if appName != "" {
		v.Set("app_name", appName)
	}
	var out OrderList
	err := c.request(ctx, "GET", "/api/v1/orders", v, nil, true, &out)
	return &out, err
}

type PhoneList struct {
	List  []Phone `json:"list"`
	Total int64   `json:"total"`
}

// ListPhones 号码列表。
func (c *Client) ListPhones(ctx context.Context, page, limit int, orderID, appName, tel string) (*PhoneList, error) {
	v := url.Values{}
	if page > 0 {
		v.Set("page", fmt.Sprint(page))
	}
	if limit > 0 {
		v.Set("limit", fmt.Sprint(limit))
	}
	if orderID != "" {
		v.Set("order_id", orderID)
	}
	if appName != "" {
		v.Set("app_name", appName)
	}
	if tel != "" {
		v.Set("tel", tel)
	}
	var out PhoneList
	err := c.request(ctx, "GET", "/api/v1/phones", v, nil, true, &out)
	return &out, err
}

// GetSms 查询短信（无需 API Key）。尚未收到返回 ("", nil)。
func (c *Client) GetSms(ctx context.Context, token string) (string, error) {
	var out struct {
		Msg string `json:"msg"`
	}
	err := c.request(ctx, "GET", "/api/v1/sms", url.Values{"token": {token}}, nil, false, &out)
	if err != nil {
		var apiErr *Error
		if errors.As(err, &apiErr) && apiErr.Code == 0 {
			return "", nil // 暂无短信
		}
		return "", err
	}
	return out.Msg, nil
}

// WaitForSms 轮询等待短信（interval 建议 3~5 秒），超时返回错误。
func (c *Client) WaitForSms(ctx context.Context, token string, timeout, interval time.Duration) (string, error) {
	if interval <= 0 {
		interval = 5 * time.Second
	}
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		sms, err := c.GetSms(ctx, token)
		if err != nil {
			return "", err
		}
		if sms != "" {
			return sms, nil
		}
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(interval):
		}
	}
	return "", &Error{Msg: "等待短信超时"}
}

// ---------- 在线接码 ----------

type OnlineApp struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon"`
}

// OnlineApps 在线接码应用列表。
func (c *Client) OnlineApps(ctx context.Context, keyword string) ([]OnlineApp, error) {
	v := url.Values{}
	if keyword != "" {
		v.Set("keyword", keyword)
	}
	var out struct {
		List []OnlineApp `json:"list"`
	}
	err := c.request(ctx, "GET", "/api/v1/online/apps", v, nil, true, &out)
	return out.List, err
}

type OnlineCountry struct {
	CountryID   string   `json:"country_id"`
	Title       string   `json:"title"`
	ISO         string   `json:"iso"`
	DialCode    string   `json:"dial_code"`
	Price       float64  `json:"price"`
	Available   bool     `json:"available"`
	SuccessRate *float64 `json:"success_rate"`
}

// OnlineCountries 国家报价。
func (c *Client) OnlineCountries(ctx context.Context, appID, keyword string) ([]OnlineCountry, error) {
	v := url.Values{"app_id": {appID}}
	if keyword != "" {
		v.Set("keyword", keyword)
	}
	var out struct {
		List []OnlineCountry `json:"list"`
	}
	err := c.request(ctx, "GET", "/api/v1/online/countries", v, nil, true, &out)
	return out.List, err
}

// OnlineSession 接码会话。Status: 1=等待接码 2=已收码 3=已释放退款 4=超时退款。
type OnlineSession struct {
	SessionNo    string  `json:"session_no"`
	ProjectName  string  `json:"project_name"`
	Icon         string  `json:"icon"`
	CountryTitle string  `json:"country_title"`
	ISO          string  `json:"iso"`
	Tel          string  `json:"tel"`
	UnitPrice    float64 `json:"unit_price"`
	Status       int     `json:"status"`
	Code         string  `json:"code"`
	SmsContent   string  `json:"sms_content"`
	ExpireAt     string  `json:"expire_at"`
	CreatedAt    string  `json:"created_at"`
}

type OnlineBuyReq struct {
	AppID    string `json:"app_id"`
	Country  string `json:"country"`
	Quantity int    `json:"quantity"`
}

type OnlineBuyResp struct {
	List  []OnlineSession `json:"list"`
	Count int             `json:"count"`
}

// OnlineBuy 购买取号（扣款，1~10 个）。
func (c *Client) OnlineBuy(ctx context.Context, req OnlineBuyReq) (*OnlineBuyResp, error) {
	if req.Quantity == 0 {
		req.Quantity = 1
	}
	var out OnlineBuyResp
	err := c.request(ctx, "POST", "/api/v1/online/orders", nil, req, true, &out)
	return &out, err
}

// OnlineGetCode 查询会话（Status=2 时 Code 为验证码）。
func (c *Client) OnlineGetCode(ctx context.Context, sessionNo string) (*OnlineSession, error) {
	var out OnlineSession
	err := c.request(ctx, "GET", "/api/v1/online/orders/"+url.PathEscape(sessionNo)+"/code", nil, nil, true, &out)
	return &out, err
}

// OnlineWaitCode 轮询等待验证码（默认 5 秒间隔）。会话被释放/超时或等待超时返回错误。
func (c *Client) OnlineWaitCode(ctx context.Context, sessionNo string, timeout time.Duration) (*OnlineSession, error) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		s, err := c.OnlineGetCode(ctx, sessionNo)
		if err != nil {
			return nil, err
		}
		switch s.Status {
		case 2:
			return s, nil
		case 3:
			return nil, &Error{Msg: "会话已释放（已退款）"}
		case 4:
			return nil, &Error{Msg: "会话已超时（已自动退款）"}
		}
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(5 * time.Second):
		}
	}
	return nil, &Error{Msg: "等待验证码超时"}
}

// OnlineRelease 释放退款（未收码时可用）。
func (c *Client) OnlineRelease(ctx context.Context, sessionNo string) (*OnlineSession, error) {
	var out OnlineSession
	err := c.request(ctx, "POST", "/api/v1/online/orders/"+url.PathEscape(sessionNo)+"/release", nil, nil, true, &out)
	return &out, err
}

type OnlineOrderList struct {
	List  []OnlineSession `json:"list"`
	Total int64           `json:"total"`
}

// OnlineOrders 接码记录（最近 1 小时）。status 传 0 表示全部。
func (c *Client) OnlineOrders(ctx context.Context, page, limit, status int, tel string) (*OnlineOrderList, error) {
	v := url.Values{}
	if page > 0 {
		v.Set("page", fmt.Sprint(page))
	}
	if limit > 0 {
		v.Set("limit", fmt.Sprint(limit))
	}
	if status > 0 {
		v.Set("status", fmt.Sprint(status))
	}
	if tel != "" {
		v.Set("tel", tel)
	}
	var out OnlineOrderList
	err := c.request(ctx, "GET", "/api/v1/online/orders", v, nil, true, &out)
	return &out, err
}
