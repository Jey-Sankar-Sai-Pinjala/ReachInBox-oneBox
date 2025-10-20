# ReachInbox Onebox - AI-Powered Email Management System

A comprehensive email management system with real-time IMAP synchronization, AI-powered categorization, and intelligent reply suggestions using RAG (Retrieval-Augmented Generation).

## 🚀 Features

### ✅ Implemented Features

1. **Real-Time Email Synchronization**
   - IMAP IDLE mode for real-time email updates (no polling!)
   - Support for multiple email accounts
   - Automatic reconnection and connection maintenance
   - 30-day historical email sync

2. **Searchable Storage with Elasticsearch**
   - Full-text search across email content
   - Advanced filtering by account, folder, category
   - Real-time indexing of new emails
   - Scalable search infrastructure

3. **AI-Based Email Categorization**
   - Powered by Google Gemini API
   - 5 categories: Interested, Meeting Booked, Not Interested, Spam, Out of Office
   - Automatic categorization of incoming emails
   - Batch processing capabilities

4. **Slack & Webhook Integration**
   - Real-time Slack notifications for "Interested" emails
   - External webhook triggers for automation
   - Configurable notification templates
   - Error handling and retry logic

5. **Frontend Interface**
   - React-based modern UI
   - Email search and filtering
   - Real-time statistics dashboard
   - Responsive design

6. **AI-Powered Suggested Replies (RAG)**
   - Vector database integration with Qdrant
   - Context-aware reply generation
   - Product knowledge base integration
   - Retrieval-Augmented Generation pipeline

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   IMAP Service  │    │  Elasticsearch │    │   Qdrant Vector │
│   (Real-time)   │───▶│   (Search)     │    │   (RAG Context) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js/TypeScript API                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   IMAP     │ │     AI     │ │  Webhook   │ │    RAG     ││
│  │  Service   │ │Categorizer │ │  Service   │ │  Service   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   Email    │ │   Search    │ │   Filter    │ │   Stats     ││
│  │    List    │ │     Bar     │ │     Bar     │ │  Dashboard  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

- **Backend**: Node.js, TypeScript, Express
- **Database**: Elasticsearch (search), Qdrant (vector DB)
- **AI/ML**: Google Gemini API, Embeddings
- **Email**: IMAP with IDLE mode
- **Frontend**: React, TypeScript, Tailwind CSS
- **Infrastructure**: Docker, Docker Compose

## 📋 Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Google Gemini API key
- IMAP email accounts (Gmail recommended)
- Slack webhook URL (optional)
- Webhook.site URL (optional)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd reachinbox-onebox
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# IMAP Account 1 (Gmail recommended)
IMAP_HOST_1=imap.gmail.com
IMAP_PORT_1=993
IMAP_USER_1=your-email1@gmail.com
IMAP_PASS_1=your-app-password1
IMAP_SSL_1=true

# IMAP Account 2
IMAP_HOST_2=imap.gmail.com
IMAP_PORT_2=993
IMAP_USER_2=your-email2@gmail.com
IMAP_PASS_2=your-app-password2
IMAP_SSL_2=true

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# Slack Integration (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Webhook Integration (optional)
WEBHOOK_SITE_URL=https://webhook.site/your-unique-url
```

### 3. Start Infrastructure

```bash
# Start Elasticsearch and Qdrant
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
docker-compose ps
```

### 4. Initialize Database

```bash
# Create Elasticsearch index
npm run setup:index

# Seed vector database with product data
npm run setup:vectors
```

### 5. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### 6. Access the Application

- **API**: http://localhost:3000/api
- **Frontend**: http://localhost:3001 (if running frontend)
- **Health Check**: http://localhost:3000/api/health

## 📚 API Endpoints

### Email Management

```bash
# Search emails
GET /api/emails/search?q=search_term&account=account1&category=Interested

# Get email by ID
GET /api/emails/:id

# Update email category
PUT /api/emails/:id/category
{
  "category": "Interested"
}

# Get email statistics
GET /api/emails/stats

# Suggest AI reply
POST /api/emails/:id/suggest-reply
```

### Account Management

```bash
# Get all accounts
GET /api/accounts

# Get account status
GET /api/accounts/:id

# Reconnect account
POST /api/accounts/:id/reconnect

# Connect all accounts
POST /api/accounts/connect-all
```

## 🔧 Configuration

### IMAP Setup (Gmail)

1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in your `.env` file

### Gemini API Setup

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to your `.env` file

### Slack Integration

1. Create a Slack App
2. Enable Incoming Webhooks
3. Get webhook URL and add to `.env`

## 🧪 Testing

### Manual Testing with Postman

1. **Test IMAP Connection**:
   ```bash
   POST /api/accounts/connect-all
   ```

2. **Search Emails**:
   ```bash
   GET /api/emails/search?q=test
   ```

3. **Test AI Categorization**:
   ```bash
   GET /api/emails/stats
   ```

4. **Test RAG Reply Suggestion**:
   ```bash
   POST /api/emails/{email-id}/suggest-reply
   ```

### Automated Testing

```bash
npm test
```

## 📊 Monitoring

### Health Checks

- **API Health**: `GET /api/health`
- **Elasticsearch**: `GET http://localhost:9200/_cluster/health`
- **Qdrant**: `GET http://localhost:6333/health`

### Logs

```bash
# View application logs
tail -f logs/combined.log

# View error logs
tail -f logs/error.log
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
ELASTICSEARCH_URL=http://elasticsearch:9200
QDRANT_URL=http://qdrant:6333
```

## 🔍 Troubleshooting

### Common Issues

1. **IMAP Connection Failed**
   - Check email credentials
   - Verify App Password for Gmail
   - Check firewall settings

2. **Elasticsearch Connection Failed**
   - Ensure Docker container is running
   - Check port 9200 is available
   - Verify memory allocation

3. **Gemini API Errors**
   - Verify API key is correct
   - Check API quota limits
   - Ensure internet connectivity

4. **Vector Database Issues**
   - Check Qdrant container status
   - Verify port 6333 is available
   - Check collection creation

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev
```

## 📈 Performance

### Optimization Tips

1. **Elasticsearch**:
   - Adjust heap size in `docker-compose.yml`
   - Use SSD storage for better performance
   - Monitor index size and optimize mappings

2. **IMAP Connections**:
   - Use connection pooling
   - Implement exponential backoff
   - Monitor connection health

3. **AI Processing**:
   - Batch process emails for categorization
   - Cache embeddings for similar content
   - Use rate limiting for API calls

## 🔒 Security

### Best Practices

1. **Environment Variables**:
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate API keys regularly

2. **IMAP Security**:
   - Use SSL/TLS connections
   - Store credentials securely
   - Monitor connection logs

3. **API Security**:
   - Implement rate limiting
   - Use HTTPS in production
   - Validate all inputs

## 📝 Development

### Project Structure

```
reachinbox-onebox/
├── src/
│   ├── config/          # Configuration files
│   ├── services/        # Core business logic
│   ├── controllers/     # API controllers
│   ├── routes/          # API routes
│   ├── models/          # TypeScript interfaces
│   ├── utils/           # Utility functions
│   ├── middlewares/     # Express middlewares
│   └── scripts/         # Setup scripts
├── frontend/            # React frontend
├── tests/               # Test files
└── docker-compose.yml   # Infrastructure
```

### Adding New Features

1. **New Service**: Add to `src/services/`
2. **New API Endpoint**: Add to `src/routes/` and `src/controllers/`
3. **New Frontend Component**: Add to `frontend/src/components/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Create an issue with detailed information

---

**Built with ❤️ for the ReachInbox Assessment**

