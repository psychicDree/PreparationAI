# 🚀 Deployment Guide

## 📦 Project Cleanup Completed

The project has been cleaned up for deployment. The following files and folders have been removed:

### ✅ Removed Files/Folders:
- **`frontend/node_modules/`** (143MB) - Node.js dependencies
- **`.git/`** (7.3MB) - Git repository history
- **`frontend/dist/`** - Build artifacts
- **`.env`** - Environment variables with sensitive data
- **Temporary files** - Logs, cache, and backup files

### 📊 Final Project Size: 13MB

## 🛠️ Deployment Instructions

### 1. **Environment Setup**
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 2. **Frontend Dependencies**
```bash
cd frontend
npm install
```

### 3. **Docker Deployment**
```bash
# Build and start all services
docker-compose up --build -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. **Production Build (Optional)**
```bash
cd frontend
npm run build
```

## 🔧 Required Environment Variables

Create a `.env` file with the following variables:

```env
# Database
POSTGRES_DB=preparation_ai
POSTGRES_USER=preparation_ai
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your_jwt_secret_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Server
PORT=8080
```

## 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📁 Project Structure

```
PreparationAI/
├── backend/                 # Go backend service
│   ├── cmd/                # Application entry points
│   ├── internal/           # Internal packages
│   │   ├── config/         # Configuration
│   │   ├── database/       # Database connection
│   │   ├── handlers/       # HTTP handlers
│   │   ├── middleware/     # Middleware
│   │   ├── models/         # Data models
│   │   └── services/       # Business logic
│   ├── Dockerfile          # Backend Docker image
│   └── go.mod              # Go dependencies
├── frontend/               # React frontend
│   ├── src/                # Source code
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   └── types/          # TypeScript types
│   ├── Dockerfile          # Frontend Docker image
│   └── package.json        # Node.js dependencies
├── database/               # Database files
│   ├── schema.sql          # Database schema
│   └── subscription_plans_seed.sql
├── docker-compose.yml      # Docker orchestration
├── env.example            # Environment template
└── README.md              # Project documentation
```

## 🔒 Security Notes

- **Never commit `.env` files** - They contain sensitive information
- **Use strong passwords** for database and JWT secrets
- **Rotate API keys** regularly
- **Use HTTPS** in production
- **Set up proper firewall rules**

## 🚨 Troubleshooting

### Common Issues:

1. **Port conflicts**: Change ports in `docker-compose.yml`
2. **Permission issues**: Use `sudo` for Docker commands
3. **Build failures**: Check Docker logs with `docker-compose logs`
4. **Database connection**: Ensure PostgreSQL is running
5. **Frontend not loading**: Check if `npm install` was run

### Useful Commands:

```bash
# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up --build -d

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Remove all containers and volumes
docker-compose down -v
```

## 📞 Support

For deployment issues, check:
1. Docker and Docker Compose are installed
2. All required ports are available
3. Environment variables are correctly set
4. Sufficient disk space and memory

---

**Ready for deployment! 🎉**
