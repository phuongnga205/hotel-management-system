# Hướng dẫn đa ngôn ngữ (i18n) cho Frontend

> Tài liệu dành cho các thành viên trong team FE. Đọc trước khi thêm text mới lên UI.

## 1. Vì sao phải làm vậy?

Hệ thống hỗ trợ 2 ngôn ngữ: **Tiếng Việt (vi)** và **Tiếng Anh (en)**. Để sau này
đổi/thêm ngôn ngữ không phải sửa lại code React, **toàn bộ text hiển thị cho
người dùng phải được viết trong file JSON**, không hard-code thẳng trong JSX.

## 2. Cấu trúc thư mục

```
src/i18n/
  index.ts                # nơi khởi tạo i18next, import các resource
  locales/
    en/
      common.json
    vi/
      common.json
```

- Mỗi ngôn ngữ là 1 thư mục con (`en`, `vi`).
- Mỗi "namespace" (nhóm chức năng) là 1 file JSON, ví dụ `common.json`,
  `auth.json`, `booking.json`... Khi 1 module lớn dần, tách namespace riêng
  thay vì nhồi hết vào `common.json`.
- **Key giữa các file `en` và `vi` phải giống hệt nhau** (chỉ khác value).

## 3. Cách thêm text mới

Bước 1: Thêm key vào **cả 2 file** `en` và `vi`, dùng cấu trúc lồng nhau theo
chức năng:

```json
// locales/vi/common.json
{
  "auth": {
    "login": "Đăng nhập"
  }
}
```

```json
// locales/en/common.json
{
  "auth": {
    "login": "Log in"
  }
}
```

Bước 2: Dùng hook `useTranslation` trong component:

```tsx
import { useTranslation } from 'react-i18next'

function LoginButton() {
  const { t } = useTranslation()
  return <button>{t('auth.login')}</button>
}
```

**Không được** viết thẳng `<button>Đăng nhập</button>` — bắt buộc phải qua `t(...)`.

## 4. Đặt tên key

- Dùng `camelCase`, nhóm theo domain: `auth.login`, `booking.createTitle`,
  `common.save`, `common.cancel`.
- Không đặt tên theo vị trí UI (ví dụ tránh `page1.button2`) — khó maintain.
- Nếu text dùng ở nhiều nơi (Lưu, Huỷ, Xác nhận...) thì để trong `common.json`.

## 5. Đổi ngôn ngữ

```tsx
const { i18n } = useTranslation()
i18n.changeLanguage('en') // hoặc 'vi'
```

Ngôn ngữ được lưu tự động vào `localStorage` (key `i18nextLng`) nên user quay
lại sẽ giữ nguyên lựa chọn trước đó.

## 6. Checklist trước khi mở PR

- [ ] Không có chuỗi text tiếng Việt/Anh hard-code trong JSX (trừ text kỹ
      thuật như class name, id...).
- [ ] Key đã có mặt ở **cả** `en/*.json` và `vi/*.json`.
- [ ] Text đã kiểm tra hiển thị ổn ở cả 2 ngôn ngữ (không bị tràn layout khi
      tiếng Anh dài hơn/ngắn hơn tiếng Việt).

## 7. Ghi chú

- Style guide UI và routing chưa được chốt, sẽ cập nhật tài liệu riêng khi có.
- Nếu cần thêm ngôn ngữ thứ 3 sau này: chỉ cần thêm thư mục locale mới +
  đăng ký trong `src/i18n/index.ts`, không cần sửa component nào đã dùng `t()`.
