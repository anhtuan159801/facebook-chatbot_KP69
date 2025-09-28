# 🚀 Quick Start Guide - Chatbot Load Balancer

## ⚡ Khởi động nhanh

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Setup hệ thống
```bash
npm run setup
```

### 3. Cấu hình .env
Copy `.env.template` thành `.env` và cập nhật các giá trị:
```bash
cp .env.template .env
# Sau đó edit .env với các API keys thực tế
```

### 4. Khởi động hệ thống

#### Cách 1: Sử dụng script tự quản lý
```bash
# Khởi động tất cả
npm run start:all

# Kiểm tra trạng thái
npm run status

# Dừng tất cả
npm run stop:all
```

#### Cách 2: Sử dụng PM2 (Khuyến nghị)
```bash
# Khởi động với PM2
npm run pm2:start

# Xem trạng thái
npm run pm2:status

# Xem logs
npm run pm2:logs

# Dừng
npm run pm2:stop
```

## 🔧 Cấu hình Facebook Webhook

**Webhook URL**: `https://your-domain.com/webhook`
**Verify Token**: Giá trị `VERIFY_TOKEN` trong file `.env`

## 📊 Monitoring

### Kiểm tra trạng thái hệ thống
```bash
curl http://localhost:3000/status
```

### Health check
```bash
curl http://localhost:3000/health
```

### Chuyển đổi hệ thống thủ công
```bash
# Chuyển sang Router Hug
curl -X POST http://localhost:3000/force-switch \
  -H "Content-Type: application/json" \
  -d '{"system": "router_hug", "adminKey": "your_admin_key"}'

# Chuyển về Gemini
curl -X POST http://localhost:3000/force-switch \
  -H "Content-Type: application/json" \
  -d '{"system": "gemini", "adminKey": "your_admin_key"}'
```

## 🏗️ Kiến trúc

```
Facebook Messenger
       ↓
Load Balancer (Port 3000)
       ↓
┌─────────────────┬─────────────────┐
│   Gemini Bot    │  Router Hug Bot │
│   (Port 3001)   │   (Port 3002)   │
│   [PRIMARY]     │   [BACKUP]      │
└─────────────────┴─────────────────┘
```

## 🔄 Cơ chế hoạt động

1. **Gemini** là hệ thống chính
2. Khi Gemini lỗi → Tự động chuyển sang **Router Hug**
3. Sau 12 giờ → Tự động thử chuyển về **Gemini**
4. Nếu cả 2 lỗi → Chế độ bảo trì

## 🚨 Troubleshooting

### Lỗi thường gặp

1. **Port đã được sử dụng**
   ```bash
   # Kiểm tra port
   netstat -tulpn | grep :3000
   
   # Kill process
   kill -9 <PID>
   ```

2. **Database connection error**
   - Kiểm tra thông tin DB trong `.env`
   - Đảm bảo database đang chạy

3. **API keys không hợp lệ**
   - Kiểm tra các API keys trong `.env`
   - Đảm bảo có đủ quota

### Logs
```bash
# PM2 logs
pm2 logs

# Specific service
pm2 logs gemini-bot
pm2 logs router-hug-bot
pm2 logs load-balancer
```

## 📱 Test với Facebook

1. Gửi tin nhắn test đến Facebook Page
2. Kiểm tra logs để xem request được route đến hệ thống nào
3. Test failover bằng cách dừng Gemini bot

## 🔧 Customization

### Thay đổi thời gian recovery
Sửa trong `load_balancer.js`:
```javascript
RECOVERY_TIME: 12 * 60 * 60 * 1000, // 12 giờ
```

### Thay đổi hệ thống chính
Sửa trong `load_balancer.js`:
```javascript
PRIMARY_SYSTEM: 'router_hug', // Đổi thành router_hug
BACKUP_SYSTEM: 'gemini',      // Đổi thành gemini
```

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Logs của từng service
2. Trạng thái hệ thống qua `/status`
3. Cấu hình `.env`
4. Kết nối database

---

**Lưu ý**: Đảm bảo tất cả 3 services (Load Balancer, Gemini, Router Hug) đều chạy để hệ thống hoạt động bình thường.
