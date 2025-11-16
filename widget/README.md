# S5.AI Chat Widget

Plugin chat AI nhúng có thể tích hợp vào bất kỳ website nào với một icon chat nổi ở góc dưới phải.

## Tính năng

- 🎯 **Dễ nhúng**: Chỉ cần thêm một script tag
- 🎨 **Tùy chỉnh**: Màu sắc, vị trí, theme
- 🔒 **Bảo mật**: CORS proxy để tránh vấn đề cross-domain
- 📱 **Responsive**: Hoạt động tốt trên mobile và desktop
- 🌙 **Dark mode**: Tự động theo theme của hệ thống
- ⚡ **Nhanh**: Bundle tối ưu, load nhanh

## Cài đặt

### 1. Build widget

```bash
cd widget
npm install
npm run build
```

### 2. Deploy files

Upload các file sau lên server của bạn:

- `dist/widget.js`
- `dist/widget.css`
- `public/embed.js`

### 3. Nhúng vào website

Thêm script sau vào cuối thẻ `<body>` của website bạn:

```html
<script
  src="https://your-domain.com/embed.js"
  data-api-url="https://your-domain.com/api/widget/chat"
  data-api-key="your-brave-api-key"
  data-theme="auto"
  data-position="bottom-right"
  data-primary-color="#ff4d00"
></script>
```

## Cấu hình

### Data Attributes

| Attribute            | Mặc định           | Mô tả                                     |
| -------------------- | ------------------ | ----------------------------------------- |
| `data-api-url`       | `/api/widget/chat` | URL của API endpoint                      |
| `data-api-key`       | `""`               | Brave Search API key (tùy chọn)           |
| `data-theme`         | `"auto"`           | Theme: `"light"`, `"dark"`, `"auto"`      |
| `data-position`      | `"bottom-right"`   | Vị trí: `"bottom-right"`, `"bottom-left"` |
| `data-primary-color` | `"#ff4d00"`        | Màu chính (hex color)                     |

### Ví dụ tùy chỉnh

```html
<!-- Widget với màu xanh, vị trí trái, theme tối -->
<script src="https://your-domain.com/embed.js" data-theme="dark" data-position="bottom-left" data-primary-color="#3b82f6"></script>
```

## API

Widget sử dụng API endpoint `/api/widget/chat` với format:

```javascript
POST /api/widget/chat
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "braveApiKey": "your-api-key" // optional
}
```

## Phát triển

### Cấu trúc thư mục

```
widget/
├── components/
│   ├── ChatWidget.tsx      # Component chính
│   └── ui/                 # UI components
├── styles/
│   └── widget.css          # CSS riêng
├── public/
│   └── embed.js           # Script nhúng
├── index.tsx              # Entry point
├── webpack.config.js      # Build config
├── package.json
└── tsconfig.json
```

### Chạy development

```bash
cd widget
npm run dev
```

### Build production

```bash
cd widget
npm run build
```

## Tùy chỉnh nâng cao

### Thay đổi style

Sửa file `styles/widget.css` để tùy chỉnh giao diện. Tất cả class đều có prefix `s5-widget-` để tránh conflict.

### Thay đổi API endpoint

Sửa `apiUrl` trong `ChatWidget.tsx` để sử dụng API khác.

### Thêm tính năng mới

1. Thêm props mới vào `ChatWidgetProps`
2. Cập nhật `getOptionsFromScript` trong `embed.js`
3. Thêm logic xử lý trong component

## Troubleshooting

### Widget không hiện

- Kiểm tra console browser có lỗi không
- Đảm bảo đã build và deploy đúng files
- Kiểm tra CORS headers

### API không hoạt động

- Kiểm tra endpoint `/api/widget/chat` có hoạt động
- Đảm bảo Brave API key hợp lệ
- Kiểm tra network tab trong dev tools

### Style bị conflict

- Widget sử dụng CSS riêng với prefix `s5-widget-`
- Nếu vẫn conflict, tăng specificity hoặc dùng `!important`

## License

MIT License - sử dụng tự do cho mục đích thương mại và phi thương mại.
