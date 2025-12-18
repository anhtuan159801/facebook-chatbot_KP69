# Facebook Chatbot Admin Dashboard

This is the administrative dashboard for the Facebook Chatbot system, providing monitoring, management, and analytics capabilities.

## Features

- **Dashboard**: Overview of system statistics and health
- **Conversations**: View and manage conversation history
- **Model Management**: Activate/deactivate AI models
- **API Key Management**: Manage API keys for different providers
- **Feedback**: Review user feedback and ratings
- **Analytics**: View performance metrics and usage statistics

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```env
REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_ADMIN_TOKEN=your_admin_token_here
```

3. Start the development server:
```bash
npm start
```

## Environment Variables

- `REACT_APP_API_BASE_URL`: The base URL for the chatbot API
- `REACT_APP_ADMIN_TOKEN`: The admin token for authentication

## API Endpoints Used

The dashboard communicates with these admin API endpoints:
- `/admin/stats/system` - System statistics
- `/admin/conversations` - Conversation history
- `/admin/models` - AI model management
- `/admin/api-keys` - API key management
- `/admin/feedback` - User feedback

## Security

Access to the admin dashboard requires a valid admin token. Make sure to:
1. Use a strong, unique admin token
2. Keep the token secure and never commit it to version control
3. Use HTTPS in production