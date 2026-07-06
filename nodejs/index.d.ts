export interface ClientOptions {
  /** API 基础地址，默认 https://a.yljm.cc */
  baseUrl?: string;
  /** 单次请求超时（毫秒），默认 15000 */
  timeout?: number;
}

export interface UserInfo {
  id: number;
  username: string;
  balance: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface App {
  id: number;
  name: string;
  icon: string;
  cate_id: number;
  price: number;
  stock: number;
  success_rate: number | null;
}

export interface Prefix {
  prefix: string;
  num: number;
}

export interface Order {
  order_id: string;
  app_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: number;
  created_at: string;
}

export interface Phone {
  order_no?: string;
  app_name: string;
  tel: string;
  token: string;
  proxy_url?: string;
  end_time: string;
  created_at: string;
}

export interface OnlineApp {
  id: string;
  name: string;
  icon: string;
}

export interface OnlineCountry {
  country_id: string;
  title: string;
  iso: string;
  dial_code: string;
  price: number;
  available: boolean;
  success_rate: number | null;
}

export interface OnlineSession {
  session_no: string;
  project_name: string;
  icon: string;
  country_title: string;
  iso: string;
  tel: string;
  unit_price: number;
  /** 1=等待接码 2=已收码 3=已释放退款 4=超时退款 */
  status: 1 | 2 | 3 | 4;
  code: string;
  sms_content: string;
  expire_at: string;
  created_at: string;
}

export interface PollOptions {
  /** 总等待秒数，默认 300 */
  timeout?: number;
  /** 轮询间隔秒数，默认 5 */
  interval?: number;
}

export declare class YinglangSMSError extends Error {
  code?: number;
  httpStatus?: number;
}

export declare class YinglangSMS {
  constructor(apiKey: string, opts?: ClientOptions);

  getUserInfo(): Promise<UserInfo>;

  getCategories(): Promise<Category[]>;
  getApps(query?: { page?: number; limit?: number; keyword?: string; cateId?: number }): Promise<{ list: App[]; total: number }>;
  getPrefixes(appId: number, query?: { type?: number; expiry?: number }): Promise<{ list: Prefix[]; total: number }>;
  createOrder(body: { appId: number; num: number; type?: number; expiry?: number; prefix?: string; excludePrefix?: string }): Promise<{ order: Order; phones: Phone[] }>;
  listOrders(query?: { page?: number; limit?: number; orderId?: string; appName?: string }): Promise<{ list: Order[]; total: number }>;
  listPhones(query?: { page?: number; limit?: number; orderId?: string; appName?: string; tel?: string }): Promise<{ list: Phone[]; total: number }>;
  getSms(token: string): Promise<string | null>;
  waitForSms(token: string, opts?: PollOptions): Promise<string>;

  onlineApps(keyword?: string): Promise<{ list: OnlineApp[] }>;
  onlineCountries(appId: string, keyword?: string): Promise<{ list: OnlineCountry[] }>;
  onlineBuy(body: { appId: string; country: string; quantity?: number }): Promise<{ list: OnlineSession[]; count: number }>;
  onlineGetCode(sessionNo: string): Promise<OnlineSession>;
  onlineWaitCode(sessionNo: string, opts?: PollOptions): Promise<OnlineSession>;
  onlineRelease(sessionNo: string): Promise<OnlineSession>;
  onlineOrders(query?: { page?: number; limit?: number; status?: number; tel?: string }): Promise<{ list: OnlineSession[]; total: number }>;
}
