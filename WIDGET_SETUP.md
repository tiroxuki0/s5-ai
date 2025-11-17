# 🚀 S5 Assistant Chat Widget Setup Guide

Hướng dẫn đầy đủ để phát triển và deploy S5 Assistant Chat Widget - một plugin chat AI có thể nhúng vào bất kỳ website nào.

## 📋 Tổng quan

Widget bao gồm:

- **Chat Interface**: Giao diện chat đơn giản với floating button
- **Embed Script**: Script tự động load và khởi tạo widget
- **API Proxy**: Endpoint CORS-enabled cho cross-domain requests
- **Build System**: Webpack config để build bundle tối ưu

## 🛠️ Cài đặt và Build

### 1. Build Widget

```bash
# Chạy script build tự động
./build-widget.sh

# Hoặc build thủ công
cd widget
npm install
npm run build
```

### 2. Files được tạo

Sau khi build, các files sau sẽ được copy vào `public/`:

```
public/
├── embed.js              # Script nhúng chính
└── widget/
    ├── widget.js         # Bundle React component
    └── widget.css        # Styles riêng
```

### 3. Test locally

```bash
# Chạy Next.js app
npm run dev

# Mở demo page
# http://localhost:3000/widget/demo.html
```

## 🌐 Nhúng vào Website

### Code cơ bản

```html
<!DOCTYPE html>
<html>
  <body>
    <!-- Nội dung website của bạn -->

    <!-- S5 Assistant Chat Widget -->
    <script src="https://your-domain.com/embed.js"></script>
  </body>
</html>
```

### Với tùy chỉnh

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

## ⚙️ Cấu hình

### Environment Variables

Thêm vào `.env.local`:

```env
# Brave Search API (tùy chọn - user có thể tự cung cấp)
BRAVE_API_KEY=your_brave_api_key_here
```

### API Endpoint

Widget gọi đến `/api/widget/chat` - một proxy CORS-enabled:

```typescript
POST /api/widget/chat
{
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "braveApiKey": "optional"
}
```

## 🎨 Tùy chỉnh giao diện

### Thay đổi màu sắc

Sửa `data-primary-color` attribute hoặc CSS variables trong `widget/styles/widget.css`.

### Thay đổi vị trí

- `bottom-right` (mặc định)
- `bottom-left`

### Theme

- `auto`: Theo system preference
- `light`: Luôn sáng
- `dark`: Luôn tối

## 🔧 Phát triển nâng cao

### Thêm tính năng mới

1. **Thay đổi ChatWidget component** (`widget/components/ChatWidget.tsx`)
2. **Cập nhật embed script** (`widget/public/embed.js`)
3. **Rebuild widget** (`npm run build`)
4. **Test changes** (mở `widget/demo.html`)

### API Response Format

Widget expect response format tương tự main app:

```json
{
  "content": "AI response text",
  // hoặc
  "parts": [
    {"type": "text", "content": "Response"},
    {"type": "data-sources", "data": {...}}
  ]
}
```

## 🚀 Deploy

### 1. Build cho production

```bash
./build-widget.sh
```

### 2. Deploy files

Upload các files sau lên CDN/hosting:

- `public/embed.js`
- `public/widget/widget.js`
- `public/widget/widget.css`

### 3. Update domain

Thay `https://your-domain.com` trong documentation bằng domain thực.

## 🐛 Troubleshooting

### Widget không hiện

```javascript
// Check console errors
console.log("Checking widget...")

// Verify files are accessible
fetch("https://your-domain.com/embed.js").then((r) => console.log("Embed script:", r.status))
```

### API calls fail

```javascript
// Check CORS headers
fetch("https://your-domain.com/api/widget/chat", {
  method: "OPTIONS"
}).then((r) => console.log("CORS check:", r.headers))
```

### Styles conflict

Widget sử dụng prefix `s5-widget-` cho tất cả CSS classes để tránh conflict.

## 📱 Demo và Examples

### Demo page

- File: `public/demo.html`
- URL: `http://localhost:3000/demo.html`

### Example implementations

```html
<!-- Basic embed -->
<script src="https://your-domain.com/embed.js"></script>

<!-- Custom styling -->
<script src="https://your-domain.com/embed.js" data-theme="dark" data-position="bottom-left" data-primary-color="#3b82f6"></script>
```

## 🔄 Update Process

Khi có thay đổi:

1. **Code changes** → Edit files in `widget/`
2. **Build** → `./build-widget.sh`
3. **Test** → Check `widget/demo.html`
4. **Deploy** → Upload new files to CDN
5. **Update websites** → No changes needed (files auto-update)

## 📊 Performance

### Bundle size

- **widget.js**: ~150KB (gzipped: ~45KB)
- **widget.css**: ~8KB (gzipped: ~2KB)
- **embed.js**: ~4KB (gzipped: ~1.5KB)

### Load time

- **First load**: ~200-500ms
- **Cached**: ~50-100ms

## 🎯 Best Practices

### 1. Security

- Luôn validate API keys server-side
- Sử dụng HTTPS cho tất cả requests
- Rate limiting cho API calls

### 2. Performance

- Enable gzip compression
- Set proper cache headers (1 hour for static files)
- Use CDN for global distribution

### 3. UX

- Test trên mobile devices
- Ensure accessibility (ARIA labels)
- Provide loading states

### 4. Monitoring

- Track widget usage với analytics
- Monitor API error rates
- Set up alerts for downtime

## 📞 Support

Nếu gặp vấn đề:

1. Check browser console errors
2. Verify all files are accessible
3. Test với demo page
4. Check network requests in dev tools
5. Review CORS configuration

## 🎉 Success!

Widget đã sẵn sàng để nhúng vào bất kỳ website nào! 🚀

```html
<!-- Just add this line -->
<script src="https://your-domain.com/embed.js"></script>
```
