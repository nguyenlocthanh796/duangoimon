"""Lightweight i18n for API messages.

Usage:
    from app.core.i18n import t, set_language
    set_language("vi")
    msg = t("order.created")  # "Đơn hàng đã tạo"

Add translations to TRANSLATIONS dict.
Defaults to Vietnamese. Falls back to English key if missing.
"""

TRANSLATIONS: dict[str, dict[str, str]] = {
    "vi": {
        # Auth
        "auth.invalid_credentials": "Sai tên đăng nhập hoặc mật khẩu",
        "auth.token_expired": "Phiên đăng nhập hết hạn",
        "auth.token_invalid": "Token không hợp lệ",
        "auth.too_many_attempts": "Quá nhiều lần thử. Vui lòng thử lại sau.",
        "auth.forbidden": "Không có quyền truy cập",
        # Orders
        "order.created": "Đơn hàng đã tạo",
        "order.not_found": "Không tìm thấy đơn hàng",
        "order.paid": "Đơn hàng đã thanh toán",
        "order.cancelled": "Đơn hàng đã hủy",
        # Tables
        "table.not_found": "Không tìm thấy bàn",
        "table.occupied": "Bàn đang có khách",
        # Inventory
        "inventory.low_stock": "Tồn kho thấp: {name} chỉ còn {qty}",
        "inventory.not_found": "Không tìm thấy nguyên liệu",
        # General
        "common.success": "Thành công",
        "common.error": "Có lỗi xảy ra",
        "common.not_found": "Không tìm thấy dữ liệu",
        "common.validation_error": "Dữ liệu không hợp lệ",
        # Booking
        "booking.not_found": "Không tìm thấy đặt chỗ",
        "booking.confirmed": "Đặt chỗ đã xác nhận",
        # Payment
        "payment.success": "Thanh toán thành công",
        "payment.failed": "Thanh toán thất bại",
        "payment.partial": "Thanh toán một phần: {amount}",
        # CRM
        "customer.not_found": "Không tìm thấy khách hàng",
        "customer.created": "Khách hàng mới đã tạo",
    },
    "en": {
        "auth.invalid_credentials": "Invalid username or password",
        "auth.token_expired": "Session expired",
        "auth.token_invalid": "Invalid token",
        "auth.too_many_attempts": "Too many attempts. Try again later.",
        "auth.forbidden": "Access denied",
        "order.created": "Order created",
        "order.not_found": "Order not found",
        "order.paid": "Order paid",
        "order.cancelled": "Order cancelled",
        "table.not_found": "Table not found",
        "table.occupied": "Table is occupied",
        "inventory.low_stock": "Low stock: {name} has {qty} left",
        "inventory.not_found": "Ingredient not found",
        "common.success": "Success",
        "common.error": "An error occurred",
        "common.not_found": "Data not found",
        "common.validation_error": "Invalid data",
        "booking.not_found": "Booking not found",
        "booking.confirmed": "Booking confirmed",
        "payment.success": "Payment successful",
        "payment.failed": "Payment failed",
        "payment.partial": "Partial payment: {amount}",
        "customer.not_found": "Customer not found",
        "customer.created": "New customer created",
    },
}

_current_lang = "vi"


def set_language(lang: str) -> None:
    """Set current language. Use 'vi' or 'en'."""
    global _current_lang
    if lang in TRANSLATIONS:
        _current_lang = lang


def get_language() -> str:
    return _current_lang


def t(key: str, **kwargs) -> str:
    """Translate a key to current language. Supports {kwargs} formatting."""
    msg = TRANSLATIONS.get(_current_lang, {}).get(key)
    if msg is None:
        # Fallback: try English
        msg = TRANSLATIONS.get("en", {}).get(key, key)
    if kwargs:
        try:
            msg = msg.format(**kwargs)
        except KeyError:
            pass
    return msg
