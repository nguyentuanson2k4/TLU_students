export const SERVICE_REQUEST_MESSAGES = {
  CREATE: {
    SUCCESS: 'Yêu cầu dịch vụ được tạo thành công',
    INVALID_DOCUMENT_TYPE: 'Loại tài liệu không hợp lệ',
    INVALID_ATTACHMENT_SIZE: 'Kích thước tập tin vượt quá giới hạn tối đa',
    INVALID_ATTACHMENT_TYPE: 'Định dạng tập tin không được phép',
  },
  UPDATE: {
    SUCCESS: 'Yêu cầu dịch vụ được cập nhật thành công',
    NOT_FOUND: 'Yêu cầu dịch vụ không tìm thấy',
    FORBIDDEN: 'Bạn không có quyền cập nhật yêu cầu này',
    INVALID_STATUS_TRANSITION: 'Chuyển trạng thái không hợp lệ',
  },
  DELETE: {
    SUCCESS: 'Yêu cầu dịch vụ được xóa thành công',
    NOT_FOUND: 'Yêu cầu dịch vụ không tìm thấy',
    FORBIDDEN: 'Bạn không có quyền xóa yêu cầu này',
  },
  GET: {
    NOT_FOUND: 'Yêu cầu dịch vụ không tìm thấy',
    FORBIDDEN: 'Bạn không có quyền xem yêu cầu này',
  },
  INVALID_STATUS: 'Trạng thái yêu cầu không hợp lệ',
  ALREADY_EXISTS: 'Yêu cầu dịch vụ đã tồn tại',
};

export const DOCUMENT_TYPE_MESSAGES = {
  CREATE: {
    SUCCESS: 'Loại tài liệu được tạo thành công',
    ALREADY_EXISTS: 'Loại tài liệu đã tồn tại',
  },
  UPDATE: {
    SUCCESS: 'Loại tài liệu được cập nhật thành công',
    NOT_FOUND: 'Loại tài liệu không tìm thấy',
  },
  DELETE: {
    SUCCESS: 'Loại tài liệu được xóa thành công',
    NOT_FOUND: 'Loại tài liệu không tìm thấy',
    IN_USE: 'Không thể xóa loại tài liệu đang được sử dụng',
  },
  GET: {
    NOT_FOUND: 'Loại tài liệu không tìm thấy',
  },
};
