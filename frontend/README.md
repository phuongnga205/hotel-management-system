# Frontend — Hotel Management System

React + TypeScript + Vite. Stack đã setup:

- **Tailwind CSS v4** (qua `@tailwindcss/vite`, không cần `tailwind.config.js`)
- **Ant Design** (`antd`)
- **Axios** với interceptor tự gắn JWT token + tự xử lý 401 — xem
  [`src/api/axiosClient.ts`](src/api/axiosClient.ts)
- **i18n** (vi/en) bằng `react-i18next`, text lưu trong file JSON — xem hướng
  dẫn chi tiết tại [`docs/HUONG_DAN_I18N.md`](docs/HUONG_DAN_I18N.md)


## Chạy dự án

```bash
npm install
cp .env.example .env   # rồi chỉnh VITE_API_BASE_URL nếu cần
npm run dev
```

## Cấu trúc thư mục chính

```
src/
  api/            # axios client, các hàm gọi API
  i18n/           # cấu hình i18next + locales (vi/en)
  assets/
  App.tsx
  main.tsx
```



---

<details>
<summary>Ghi chú gốc từ Vite template (ESLint, React Compiler...)</summary>

The React Compiler is not enabled on this template because of its impact on
dev & build performances. To add it, see
[this documentation](https://react.dev/learn/react-compiler/installation).

If you are developing a production application, we recommend updating the
lint configuration to enable type-aware rules — see the
[typescript-eslint docs](https://typescript-eslint.io/getting-started/typed-linting).

</details>
