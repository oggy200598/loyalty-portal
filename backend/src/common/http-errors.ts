import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

const statusMessages: Record<number, string> = {
  400: 'Thông tin gửi lên không hợp lệ.',
  401: 'Vui lòng đăng nhập lại để tiếp tục.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy thông tin yêu cầu.',
  405: 'Thao tác này không được hỗ trợ.',
  408: 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.',
  409: 'Dữ liệu đã thay đổi hoặc bị trùng. Vui lòng tải lại và kiểm tra.',
  413: 'Dữ liệu tải lên vượt quá dung lượng cho phép.',
  415: 'Định dạng dữ liệu không được hỗ trợ.',
  422: 'Không thể xử lý thông tin gửi lên.',
  429: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
  500: 'Hệ thống gặp lỗi. Vui lòng thử lại sau.',
  502: 'Dịch vụ tạm thời không phản hồi. Vui lòng thử lại.',
  503: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.',
  504: 'Dịch vụ phản hồi quá chậm. Vui lòng thử lại.',
};
const fields: Record<string, string> = {
  email: 'Email',
  password: 'Mật khẩu',
  currentPassword: 'Mật khẩu hiện tại',
  token: 'Mã khôi phục',
  name: 'Tên',
  fullName: 'Họ tên',
  customerName: 'Tên người nhận',
  receiverName: 'Tên người nhận',
  phone: 'Số điện thoại',
  address: 'Địa chỉ',
  addressDetail: 'Địa chỉ chi tiết',
  province: 'Tỉnh/thành phố',
  district: 'Quận/huyện',
  ward: 'Phường/xã',
  role: 'Vai trò',
  status: 'Trạng thái',
  expectedStatus: 'Trạng thái đã tải',
  paymentStatus: 'Trạng thái thanh toán',
  paymentMethod: 'Phương thức thanh toán',
  page: 'Số trang',
  limit: 'Số bản ghi mỗi trang',
  q: 'Từ khóa tìm kiếm',
  id: 'Mã định danh',
  userId: 'Mã tài khoản',
  memberId: 'Mã thành viên',
  productId: 'Mã sản phẩm',
  variantId: 'Mã phân loại',
  categoryId: 'Mã danh mục',
  shopId: 'Mã cửa hàng',
  parentId: 'Danh mục cha',
  orderId: 'Mã đơn hàng',
  quantity: 'Số lượng',
  stock: 'Tồn kho',
  stockQuantity: 'Số lượng tồn kho',
  price: 'Giá bán',
  items: 'Danh sách sản phẩm',
  variants: 'Danh sách phân loại',
  couponCode: 'Mã giảm giá',
  expectedTotal: 'Tổng tiền đã báo giá',
  imageUrl: 'Đường dẫn ảnh',
  description: 'Mô tả',
  message: 'Nội dung',
  reason: 'Lý do',
  note: 'Ghi chú',
  rating: 'Số sao đánh giá',
  comment: 'Nội dung đánh giá',
  type: 'Loại yêu cầu',
  decision: 'Quyết định',
  response: 'Phản hồi',
  reference: 'Mã biên nhận',
  points: 'Số điểm',
  pointsCost: 'Điểm đổi thưởng',
  rewardId: 'Mã phần thưởng',
  complaintId: 'Mã khiếu nại',
  idempotencyKey: 'Mã yêu cầu',
  effectiveAt: 'Thời điểm hiệu lực',
  expectedUpdatedAt: 'Thời điểm cập nhật đã tải',
  expectedVersion: 'Phiên bản đã tải',
  version: 'Phiên bản',
  isDefault: 'Địa chỉ mặc định',
  active: 'Trạng thái hoạt động',
  storeName: 'Tên cửa hàng',
  supportEmail: 'Email hỗ trợ',
  supportPhone: 'Điện thoại hỗ trợ',
  storeAddress: 'Địa chỉ cửa hàng',
  shippingFee: 'Phí giao hàng',
  freeShippingThreshold: 'Ngưỡng miễn phí giao hàng',
  discountValue: 'Mức giảm giá',
  minOrderValue: 'Giá trị đơn tối thiểu',
  minimumTierSpend: 'Chi tiêu tối thiểu',
  voucherDays: 'Hạn dùng ưu đãi',
  config: 'Cấu hình',
  tiers: 'Danh sách hạng',
  code: 'Mã hạng',
  minimumSpend: 'Ngưỡng chi tiêu',
  multiplierBps: 'Hệ số tích điểm',
  spendPerPoint: 'Số tiền cho mỗi điểm',
  expiryDays: 'Hạn điểm',
  tierPeriodDays: 'Chu kỳ hạng',
};
export function vietnameseHttpMessage(value: unknown, status: number): string {
  const fallback = statusMessages[status] ?? statusMessages[500];
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const raw = value.trim();
  if (/^Cannot (GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS)\b/i.test(raw))
    return 'Không tìm thấy đường dẫn yêu cầu.';
  const validation = raw.match(/^([\w.[\]]+) (.+)$/);
  if (validation) {
    const [, path, rule] = validation;
    const field = fields[path.split('.').at(-1)!] ?? 'Thông tin';
    const number = rule.match(
      /(?:than or equal to|than|contain at least|contain no more than) (\d+)/,
    )?.[1];
    if (/^should not exist/.test(rule))
      return `${field} không được hỗ trợ trong thao tác này.`;
    if (/^should not be empty|^should not be null or undefined/.test(rule))
      return `${field} không được để trống.`;
    if (/^must be an email/.test(rule))
      return `${field} không đúng định dạng email.`;
    if (/^must be longer than or equal to/.test(rule))
      return `${field} phải có ít nhất ${number} ký tự.`;
    if (/^must be shorter than or equal to/.test(rule))
      return `${field} không được vượt quá ${number} ký tự.`;
    if (/^must not be less than/.test(rule))
      return `${field} phải từ ${number} trở lên.`;
    if (/^must not be greater than/.test(rule))
      return `${field} không được vượt quá ${number}.`;
    if (/^must be an integer/.test(rule)) return `${field} phải là số nguyên.`;
    if (/^must be a number/.test(rule)) return `${field} phải là số hợp lệ.`;
    if (/^must be a boolean/.test(rule))
      return `${field} phải là giá trị có hoặc không.`;
    if (/^must be a string/.test(rule)) return `${field} phải là chuỗi ký tự.`;
    if (/^must be an array/.test(rule)) return `${field} phải là danh sách.`;
    if (/^must contain at least/.test(rule))
      return `${field} phải có ít nhất ${number} phần tử.`;
    if (/^must contain no more than/.test(rule))
      return `${field} không được vượt quá ${number} phần tử.`;
    if (/^must be a URL/.test(rule))
      return `${field} phải là đường dẫn hợp lệ.`;
    if (/^must be a valid ISO|^must be a valid date/.test(rule))
      return `${field} phải là ngày giờ hợp lệ.`;
    if (/^must |^should |^each value in |^nested property /.test(rule))
      return `${field} không hợp lệ.`;
  }
  // Chỉ giữ thông báo nghiệp vụ đã được Việt hóa; không trả nguyên lỗi thư viện/SQL.
  if (/[À-ỹĐđ]/u.test(raw)) return raw;
  return fallback;
}

@Catch()
export class VietnameseHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(VietnameseHttpExceptionFilter.name);
  constructor(private readonly adapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const body =
      exception instanceof HttpException ? exception.getResponse() : null;
    const raw: unknown =
      typeof body === 'string'
        ? body
        : body && typeof body === 'object' && 'message' in body
          ? body.message
          : null;
    const message = Array.isArray(raw)
      ? [...new Set(raw.map((value) => vietnameseHttpMessage(value, status)))]
      : vietnameseHttpMessage(raw, status);
    if (!(exception instanceof HttpException))
      this.logger.error(
        `Lỗi xử lý yêu cầu (${exception instanceof Error ? exception.name : 'không xác định'}).`,
      );
    const adapter = this.adapterHost.httpAdapter;
    if (adapter.isHeadersSent(http.getResponse())) {
      adapter.end(http.getResponse());
      return;
    }
    adapter.reply(
      http.getResponse(),
      {
        statusCode: status,
        message,
        error: statusMessages[status] ?? statusMessages[500],
      },
      status,
    );
  }
}
