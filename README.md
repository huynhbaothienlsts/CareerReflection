# Đánh giá lại quá trình đưa ra lựa chọn nghề nghiệp

Website tương tác dành cho học sinh THPT. Dữ liệu chỉ được lưu trong trình duyệt trên thiết bị hiện tại, không có tài khoản và không đồng bộ giữa các thiết bị.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

## Kiểm thử và đóng gói

```bash
npm test
npm run build
```

## Triển khai GitHub Pages

Đẩy thư mục này lên nhánh `main` của một repository GitHub. Trong **Settings → Pages**, chọn **Source: GitHub Actions**. Quy trình có sẵn sẽ kiểm thử, đóng gói và xuất bản website sau mỗi lần đẩy mã.

## Cập nhật dữ liệu

- `app/data/tasks.json`: 25 nhiệm vụ và nội dung nền.
- `app/data/rules.json`: 225 quy tắc theo nhiệm vụ và trạng thái A–I.
- `app/lib/engine.ts`: ghép trạng thái, chọn ưu tiên và tạo phản hồi.

Khi thay dữ liệu, hãy tăng `RULE_VERSION` trong `app/lib/engine.ts` để quản lý phiên bản kết quả đã lưu.
