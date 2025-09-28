# 🤖 Chatbot Load Balancer System

Hệ thống Load Balancer quản lý 2 chatbot với cơ chế failover tự động và auto-recovery.

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Facebook      │    │  Load Balancer   │    │   Gemini Bot    │
│   Messenger     │◄──►│   (Port 3000)    │◄──►│   (Port 3001)   │
│                 │    │                  │    │   [PRIMARY]     │
└─────────────────┘    │                  │    └─────────────────┘
                       │                  │
                       │                  │    ┌─────────────────┐
                       │                  │◄──►│  Router Hug Bot │
                       │                  │    │   (Port 3002)   │
                       │                  │    │   [BACKUP]      │
                       └──────────────────┘    └─────────────────┘
```

## 🚀 Cách khởi động

### 1. Khởi động thủ công
```bash
# Khởi động tất cả services
node start_system.js start

# Kiểm tra trạng thái
node start_system.js status

# Dừng tất cả services
node start_system.js stop

# Khởi động lại
node start_system.js restart
```

### 2. Sử dụng PM2 (Khuyến nghị cho production)
```bash
# Cài đặt PM2
npm install -g pm2

# Khởi động tất cả services
pm2 start ecosystem.config.js

# Kiểm tra trạng thái
pm2 status

# Xem logs
pm2 logs

# Dừng tất cả
pm2 stop all

# Khởi động lại
pm2 restart all
```

## ⚙️ Cấu hình

### Environment Variables
Tạo file `.env` với các biến sau:

```env
# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# Facebook
VERIFY_TOKEN=your_verify_token
PAGE_ACCESS_TOKEN=your_page_access_token

# APIs
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Admin
ADMIN_KEY=your_admin_key

# Site Info
YOUR_SITE_URL=https://your-site.com
YOUR_SITE_NAME=YourBotName
```

### Port Configuration
- **Load Balancer**: Port 3000 (Facebook webhook endpoint)
- **Gemini Bot**: Port 3001 (Internal)
- **Router Hug Bot**: Port 3002 (Internal)

## 🔄 Cơ chế hoạt động

### 1. Primary System (Gemini)
- Hệ thống chính xử lý tất cả requests
- Được ưu tiên cao nhất
- Tự động chuyển sang backup khi lỗi

### 2. Backup System (Router Hug)
- Hệ thống dự phòng khi Gemini lỗi
- Tự động chuyển về Gemini sau 12 giờ
- Chỉ hoạt động khi Gemini không khả dụng

### 3. Health Check
- Kiểm tra sức khỏe mỗi 30 giây
- Tự động phát hiện lỗi và chuyển đổi
- Theo dõi số lần lỗi liên tiếp

### 4. Auto Recovery
- Sau 12 giờ, hệ thống sẽ thử chuyển về Gemini
- Nếu Gemini vẫn lỗi, tiếp tục dùng Router Hug
- Luân phiên giữa 2 hệ thống khi cần thiết

### 5. Maintenance Mode
- Khi cả 2 hệ thống đều lỗi
- Trả về thông báo "Hệ thống đang được bảo trì"
- Tự động thoát khỏi chế độ bảo trì khi có hệ thống khỏe

## 📊 Monitoring & Management

### Endpoints
- `GET /webhook` - Facebook webhook verification
- `POST /webhook` - Facebook webhook (route to active system)
- `GET /status` - Chi tiết trạng thái hệ thống
- `GET /health` - Health check endpoint
- `POST /force-switch` - Chuyển đổi hệ thống thủ công

### Status Information
```json
{
  "loadBalancer": {
    "currentSystem": "gemini",
    "maintenanceMode": false,
    "lastSwitchTime": "2024-01-01T00:00:00.000Z"
  },
  "systems": {
    "gemini": {
      "status": "healthy",
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "consecutiveFailures": 0,
      "isRecovering": false
    },
    "router_hug": {
      "status": "healthy",
      "lastCheck": "2024-01-01T00:00:00.000Z",
      "consecutiveFailures": 0,
      "isRecovering": false
    }
  },
  "statistics": {
    "totalRequests": 1000,
    "successfulRequests": 995,
    "failedRequests": 5,
    "successRate": "99.50%"
  }
}
```

## 🛠️ Troubleshooting

### 1. Kiểm tra logs
```bash
# PM2 logs
pm2 logs

# Specific service logs
pm2 logs gemini-bot
pm2 logs router-hug-bot
pm2 logs load-balancer
```

### 2. Kiểm tra trạng thái
```bash
# System status
curl http://localhost:3000/status

# Health check
curl http://localhost:3000/health
```

### 3. Chuyển đổi thủ công
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

## 🔧 Customization

### Thay đổi thời gian recovery
Sửa trong `load_balancer.js`:
```javascript
const LOAD_BALANCER_CONFIG = {
    RECOVERY_TIME: 12 * 60 * 60 * 1000, // 12 giờ
    HEALTH_CHECK_INTERVAL: 30 * 1000,   // 30 giây
    // ...
};
```

### Thay đổi hệ thống chính
Sửa trong `load_balancer.js`:
```javascript
const LOAD_BALANCER_CONFIG = {
    PRIMARY_SYSTEM: 'router_hug',    // Đổi thành router_hug
    BACKUP_SYSTEM: 'gemini',         // Đổi thành gemini
    // ...
};
```

## 📈 Performance

### Tối ưu hóa
- Health check interval: 30 giây (có thể điều chỉnh)
- Max retry attempts: 3 lần
- Retry delay: 5 giây
- Graceful shutdown: 10 giây timeout

### Monitoring
- Theo dõi success rate
- Log tất cả chuyển đổi hệ thống
- Thống kê request/response time
- Alert khi vào maintenance mode

## 🚨 Alerts & Notifications

Hệ thống sẽ log các sự kiện quan trọng:
- ✅ Chuyển đổi hệ thống thành công
- ❌ Hệ thống lỗi
- 🚨 Vào chế độ bảo trì
- 🔄 Thử recovery
- 📊 Thống kê hiệu suất

## 📝 Notes

1. **Facebook Webhook**: Chỉ cần cấu hình webhook URL trỏ đến Load Balancer (port 3000)
2. **Database**: Cả 2 chatbot sử dụng chung database
3. **Logs**: Tất cả logs được lưu trong thư mục `./logs/`
4. **Backup**: Nên backup database và cấu hình thường xuyên
5. **Updates**: Cập nhật từng service riêng biệt để tránh downtime
