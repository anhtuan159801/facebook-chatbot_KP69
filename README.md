# 🤖 Facebook Chatbot với Load Balancer System

## 🎯 Tổng Quan

Hệ thống Chatbot Messenger được xây dựng với Node.js, tích hợp **Load Balancer** thông minh để quản lý 2 hệ thống AI:
- **Gemini Bot** (Hệ thống chính) - Sử dụng Google Gemini AI
- **Router Hug Bot** (Hệ thống backup) - Sử dụng Grok API qua OpenRouter và Huggingface

Hệ thống có khả năng **tự động failover** và **auto-recovery** để đảm bảo uptime 99.9%.

### ✨ Tính Năng Chính

* 🔄 **Load Balancer**: Tự động chuyển đổi giữa 2 hệ thống AI
* 🧠 **Gemini Integration**: Sử dụng Google Gemini 2.5 Flash cho xử lý chính
* 🚀 **Grok Integration**: Sử dụng Grok API làm hệ thống backup
* 🎤 **Voice Support**: Hỗ trợ xử lý voice message với Whisper
* 📷 **Image Processing**: Phân tích hình ảnh lỗi và đưa ra hướng dẫn
* 🗃️ **Conversation History**: Lưu trữ lịch sử hội thoại với PostgreSQL
* ⚡ **Auto Recovery**: Tự động thử lại hệ thống chính sau 12 giờ
* 🛡️ **Health Monitoring**: Kiểm tra sức khỏe hệ thống mỗi 30 giây
* 📊 **Queue Management**: Quản lý hàng chờ với giới hạn 5 request đồng thời

## 🏗️ Kiến Trúc Hệ Thống

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

## 🛠️ Setup và Cài Đặt

### 1. Yêu Cầu Hệ Thống

* Node.js >= 18.0.0
* PostgreSQL Database
* Facebook Page và Facebook App
* Google Gemini API Key
* OpenRouter API Key
* Hugging Face API Key (cho Whisper)

### 2. Clone và Cài Đặt

```bash
# Clone repository
git clone https://github.com/anhtuan159801/facebook-chatbot.git
cd facebook-chatbot

# Cài đặt dependencies
npm install

# Setup hệ thống
npm run setup
```

### 3. Cấu Hình Environment

Tạo file `.env` với các biến sau:

```env
# Database Configuration
DB_HOST=your_postgresql_host
DB_PORT=5432
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=your_database_name

# Facebook Configuration
VERIFY_TOKEN=your_custom_verify_token
PAGE_ACCESS_TOKEN=your_facebook_page_access_token

# API Keys
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Admin Configuration
ADMIN_KEY=your_admin_key

# Site Information
YOUR_SITE_URL=https://your-domain.com
YOUR_SITE_NAME=YourBotName

# Server Configuration
PORT=3000
NODE_ENV=production
```

### 4. Chuẩn Bị Database

```sql
-- Tạo bảng conversations
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    message TEXT,
    bot_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng feedback
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    rating VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index để tối ưu query
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
```

## 🚀 Khởi Động

### Cách 1: Sử dụng System Manager (Khuyến nghị)

```bash
# Khởi động tất cả services
npm run start:all

# Kiểm tra trạng thái
npm run status

# Dừng tất cả services
npm run stop:all

# Khởi động lại
npm run restart:all
```

### Cách 2: Sử dụng PM2 (Production)

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

### Cách 3: Khởi động riêng lẻ

```bash
# Chỉ Load Balancer
npm start

# Chỉ Gemini Bot
npm run start:gemini

# Chỉ Router Hug Bot
npm run start:router
```

## 📊 API Endpoints

### Load Balancer (Port 3000)

| Method | Endpoint           | Mô Tả                                  |
|--------|-------------------|----------------------------------------|
| GET    | /webhook          | Facebook webhook verification          |
| POST   | /webhook          | Route requests to active system        |
| GET    | /status           | Chi tiết trạng thái hệ thống           |
| GET    | /health           | Health check endpoint                  |
| POST   | /force-switch     | Chuyển đổi hệ thống thủ công           |

### Gemini Bot (Port 3001)

| Method | Endpoint           | Mô Tả                                  |
|--------|-------------------|----------------------------------------|
| GET    | /webhook          | Facebook webhook verification          |
| POST   | /webhook          | Xử lý tin nhắn với Gemini AI          |
| GET    | /health           | Health check                           |
| GET    | /test             | Test endpoint                          |
| POST   | /test-message     | Test xử lý tin nhắn                    |

### Router Hug Bot (Port 3002)

| Method | Endpoint           | Mô Tả                                  |
|--------|-------------------|----------------------------------------|
| GET    | /webhook          | Facebook webhook verification          |
| POST   | /webhook          | Xử lý tin nhắn với Grok AI            |
| GET    | /health           | Health check                           |
| GET    | /queue-status     | Trạng thái queue system                |

## 🔄 Cơ Chế Hoạt Động

### 1. Primary System (Gemini)
- Hệ thống chính xử lý tất cả requests
- Sử dụng Google Gemini 2.5 Flash
- Hỗ trợ image và voice processing
- User journey với step-by-step guidance

### 2. Backup System (Router Hug)
- Hệ thống dự phòng khi Gemini lỗi
- Sử dụng Grok API qua OpenRouter
- Tự động chuyển về Gemini sau 12 giờ
- Whisper integration cho voice processing

### 3. Load Balancer
- Health check mỗi 30 giây
- Tự động failover khi hệ thống chính lỗi
- Auto recovery sau 12 giờ
- Maintenance mode khi cả 2 hệ thống lỗi

### 4. Queue Management
- Giới hạn 5 request đồng thời
- Delay 1 phút giữa các request
- Thông báo vị trí trong hàng chờ
- Timeout 5 phút cho mỗi request

## 🔧 Cách Sử Dụng

### 1. Tích hợp Facebook

1. Truy cập [Facebook Developers](https://developers.facebook.com) và tạo App
2. Thiết lập Messenger Platform, lấy `PAGE_ACCESS_TOKEN`
3. Cấu hình Webhook:
   * **Webhook URL**: `https://your-domain.com/webhook`
   * **Verify Token**: Giá trị `VERIFY_TOKEN` trong `.env`
   * **Subscribe to events**: `messages`, `messaging_postbacks`

### 2. Test Hệ Thống

```bash
# Test Load Balancer
curl http://localhost:3000/status

# Test Gemini Bot
curl http://localhost:3001/health

# Test Router Hug Bot
curl http://localhost:3002/health

# Test message processing
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": {"id": "test_user"},
        "message": {"text": "Xin chào"}
      }]
    }]
  }'
```

### 3. Monitoring

```bash
# Xem trạng thái chi tiết
curl http://localhost:3000/status

# Health check
curl http://localhost:3000/health

# Chuyển đổi thủ công
curl -X POST http://localhost:3000/force-switch \
  -H "Content-Type: application/json" \
  -d '{"system": "router_hug", "adminKey": "your_admin_key"}'
```

## 🚧 Deployment

### Render.com

```bash
# Build command
npm install

# Start command
node start_system.js start
```

**Environment Variables**: Cấu hình tất cả biến trong `.env`

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
EXPOSE 3000

CMD ["node", "start_system.js", "start"]
```

### VPS/Server

```bash
# Sử dụng PM2
npm install -g pm2
npm run pm2:start

# Hoặc systemd service
sudo systemctl start chatbot-load-balancer
```

## 📈 Performance & Monitoring

### Thống Kê Hệ Thống

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
      "consecutiveFailures": 0,
      "isRecovering": false
    },
    "router_hug": {
      "status": "healthy",
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

### Logs

```bash
# PM2 logs
pm2 logs

# Specific service
pm2 logs gemini-bot
pm2 logs router-hug-bot
pm2 logs load-balancer
```

## 🛠️ Troubleshooting

### Lỗi Thường Gặp

1. **Port đã được sử dụng**
   ```bash
   netstat -tulpn | grep :3000
   kill -9 <PID>
   ```

2. **Database connection error**
   - Kiểm tra thông tin DB trong `.env`
   - Đảm bảo database đang chạy

3. **API keys không hợp lệ**
   - Kiểm tra Gemini API key
   - Kiểm tra OpenRouter API key
   - Kiểm tra Hugging Face API key

4. **Load Balancer không chuyển đổi**
   - Kiểm tra health check endpoints
   - Xem logs của từng service
   - Test manual switch

### Debug Commands

```bash
# Kiểm tra trạng thái
npm run status

# Xem logs chi tiết
npm run pm2:logs

# Test từng service
curl http://localhost:3001/health
curl http://localhost:3002/health

# Force switch
curl -X POST http://localhost:3000/force-switch \
  -H "Content-Type: application/json" \
  -d '{"system": "gemini", "adminKey": "your_admin_key"}'
```

## 🔧 Customization

### Thay đổi thời gian recovery

```javascript
// Trong load_balancer.js
const LOAD_BALANCER_CONFIG = {
    RECOVERY_TIME: 12 * 60 * 60 * 1000, // 12 giờ
    HEALTH_CHECK_INTERVAL: 30 * 1000,   // 30 giây
};
```

### Thay đổi hệ thống chính

```javascript
// Trong load_balancer.js
const LOAD_BALANCER_CONFIG = {
    PRIMARY_SYSTEM: 'router_hug',    // Đổi thành router_hug
    BACKUP_SYSTEM: 'gemini',         // Đổi thành gemini
};
```

### Cấu hình Queue

```javascript
// Trong gemini.js và router_hug.js
const queueManager = new QueueManager(5, 60000); // 5 concurrent, 1 phút delay
```

## 📚 Documentation

- [📖 README_LOAD_BALANCER.md](README_LOAD_BALANCER.md) - Hướng dẫn chi tiết
- [⚡ QUICK_START.md](QUICK_START.md) - Hướng dẫn khởi động nhanh
- [🔧 ecosystem.config.js](ecosystem.config.js) - Cấu hình PM2

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Create Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🙋‍♂️ Support

* 📧 Email: anhtuan15082001@gmail.com
* 💬 Zalo: 0778649573 - Mr. Tuan
* 🐛 Issues: [GitHub Issues](https://github.com/anhtuan159801/facebook-chatbot/issues)
* 📖 Documentation: [Wiki](https://github.com/anhtuan159801/facebook-chatbot/wiki)

## 🎯 Roadmap

- [ ] Thêm support cho nhiều ngôn ngữ
- [ ] Tích hợp thêm AI models
- [ ] Dashboard monitoring
- [ ] Analytics và reporting
- [ ] Multi-tenant support
- [ ] API rate limiting
- [ ] Caching system

---

**⭐ Nếu project hữu ích, hãy star repository để ủng hộ!**
