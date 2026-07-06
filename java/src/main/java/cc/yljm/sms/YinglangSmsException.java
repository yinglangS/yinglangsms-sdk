package cc.yljm.sms;

/**
 * 业务失败（code != 1）或鉴权失败时抛出。
 */
public class YinglangSmsException extends RuntimeException {

    /** 业务 code：0=业务失败，401/403=鉴权失败；-1 表示无 code（如响应解析失败） */
    private final int code;
    private final int httpStatus;

    public YinglangSmsException(String message, int code, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public YinglangSmsException(String message) {
        this(message, -1, -1);
    }

    public int getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }
}
