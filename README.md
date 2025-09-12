# PreparationAI - AI-Driven Mock Interview Platform

An intelligent mock interview platform that provides personalized interview experiences tailored to specific job requirements and technical skills.

## 🚀 Features

- **AI-Powered Questions**: Generate interview questions based on role, skills, and experience level
- **Real-time Evaluation**: Get instant feedback on technical depth, communication, and problem-solving
- **Multiple Session Types**: Quick drills (15 min), Standard (30 min), and Deep dive (60 min)
- **Audio Recording**: Record and transcribe voice responses
- **Progress Tracking**: Monitor improvement over time with detailed analytics
- **Payment Integration**: Secure payment processing with Stripe

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Heroicons** for consistent iconography
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **Go Fiber** for high-performance HTTP server
- **PostgreSQL** for data persistence
- **Redis** for caching and sessions
- **JWT** for authentication
- **OpenAI GPT-4** for AI-powered features
- **Stripe** for payment processing

### Infrastructure
- **Docker** for containerization
- **Docker Compose** for development environment
- **Nginx** for production serving

## 📁 Project Structure

```
PreparationAI/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Screen components (7 main screens)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API calls and external services
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper functions
│   ├── public/             # Static assets
│   └── package.json        # Dependencies
├── backend/                 # Go Fiber API
│   ├── cmd/                # Application entry points
│   ├── internal/
│   │   ├── handlers/       # HTTP request handlers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic
│   │   └── database/       # Database connections
│   ├── pkg/                # Shared packages
│   └── go.mod              # Go dependencies
├── database/               # Database migrations and seeds
├── docs/                   # Project documentation
└── docker-compose.yml      # Development environment
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Go** 1.21+
- **Docker** and Docker Compose
- **PostgreSQL** 15+ (or use Docker)
- **Redis** (or use Docker)

### 1. Clone and Setup

```bash
git clone <repository-url>
cd PreparationAI

# Setup environment
./scripts/setup-env.sh  # Automated setup
# OR manually:
cp env.example .env
```

### 2. Configure Environment

The setup script will generate a secure JWT secret. Edit `.env` file with your API keys:

```bash
# Database (already configured)
DB_HOST=localhost
DB_PASSWORD=password

# OpenAI API (required)
OPENAI_API_KEY=your-openai-api-key

# Stripe (required for payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### 3. Start Database

```bash
# Start PostgreSQL with Docker
docker run --name preparation-ai-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Create database
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE preparation_ai;"
```

### 4. Start Development Servers

#### Backend (Terminal 1)
```bash
cd backend
go mod download
go run cmd/main.go
# Server runs on http://localhost:8080
```

#### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 5. Verify Setup

```bash
# Test backend
curl http://localhost:8080/health

# Test frontend
open http://localhost:5173

# Test database connection
cd backend
go run cmd/validate-config.go
```

## 🌐 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout

### User Management
- `GET /api/v1/profile` - Get user profile
- `PUT /api/v1/profile` - Update user profile

### Interview Sessions
- `POST /api/v1/sessions` - Create new session
- `GET /api/v1/sessions` - Get user sessions
- `GET /api/v1/sessions/:id` - Get specific session
- `POST /api/v1/sessions/:id/questions` - Generate questions
- `POST /api/v1/sessions/:id/responses` - Submit response
- `GET /api/v1/sessions/:id/feedback` - Get session feedback

### Payments
- `POST /api/v1/payments/create-intent` - Create payment intent
- `POST /api/v1/payments/confirm` - Confirm payment

## 🎨 UI Flow

The application follows a 7-screen wireframe flow:

1. **Landing Page** - Role input and sample question preview
2. **Role/Tag Setup** - Skill tags and filters
3. **Warmup & Calibration** - Experience and preference questions
4. **Session Purchase** - Choose session type and payment
5. **Interview Dashboard** - Real-time interview with timer
6. **End-of-Session Feedback** - Detailed scoring and recommendations
7. **Dashboard/Retention** - Progress tracking and session history

## 🛠️ Development

### Frontend Development
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Backend Development
```bash
cd backend
go mod download       # Download dependencies
go run cmd/main.go   # Start development server (http://localhost:8080)
go test ./...        # Run tests
go mod tidy          # Clean up dependencies
```

### Database Management
```bash
# Start PostgreSQL with Docker
docker run --name preparation-ai-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15

# Connect to database
psql -h localhost -U postgres -d postgres

# Create database
CREATE DATABASE preparation_ai;

# Run schema (if available)
psql -h localhost -U postgres -d preparation_ai < database/schema.sql

# Seed data (if available)
psql -h localhost -U postgres -d preparation_ai < database/seed.sql
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test             # Run unit tests
npm run test:coverage # Run tests with coverage
```

### Backend Tests
```bash
cd backend
go test ./...        # Run all tests
go test -v ./...     # Run tests with verbose output
go test -race ./...  # Run tests with race detection
go test -cover ./... # Run tests with coverage
```

### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Run API tests
cd backend
go test -tags=integration ./...
```

## 🐛 Debugging

### Frontend Debugging
```bash
cd frontend
npm run dev          # Start with source maps
# Open browser dev tools for debugging
# Check console for errors and network tab for API calls
```

### Backend Debugging
```bash
cd backend
# Run with debug flags
go run -race cmd/main.go

# Use Delve debugger
dlv debug cmd/main.go
# In debugger: break main.main, continue, step, etc.

# Check logs
tail -f logs/app.log  # If logging to file
```

### Database Debugging
```bash
# Connect to database
psql -h localhost -U postgres -d preparation_ai

# Check connections
SELECT * FROM pg_stat_activity;

# Check database size
SELECT pg_size_pretty(pg_database_size('preparation_ai'));

# Check table sizes
SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Common Issues & Solutions

#### Frontend Issues
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev

# Check for port conflicts
lsof -i :5173
kill -9 <PID>  # Kill process using port
```

#### Backend Issues
```bash
# Check Go version
go version

# Clean module cache
go clean -modcache
go mod download

# Check for compilation errors
go build ./...

# Check database connection
go run cmd/validate-config.go
```

#### Database Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker restart preparation-ai-postgres

# Check logs
docker logs preparation-ai-postgres

# Reset database
docker stop preparation-ai-postgres
docker rm preparation-ai-postgres
docker run --name preparation-ai-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:15
```

## 📦 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
go build -o main cmd/main.go
```

### Docker Production
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_USER` | Database user | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Database name | `preparation_ai` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `STRIPE_SECRET_KEY` | Stripe secret key | Required |
| `PORT` | Server port | `8080` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

#### Frontend Won't Start
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json .vite
npm install
npm run dev
```

#### Backend Compilation Errors
```bash
# Clean and rebuild
cd backend
go clean -modcache
go mod download
go mod tidy
go run cmd/main.go
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker restart preparation-ai-postgres

# Check connection
psql -h localhost -U postgres -d preparation_ai -c "SELECT 1;"
```

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :8080  # Backend port
lsof -i :5173  # Frontend port

# Kill processes using ports
kill -9 <PID>
```

#### Environment Issues
```bash
# Validate configuration
cd backend
go run cmd/validate-config.go

# Check environment variables
cat .env | grep -v "^#"
```

### Getting Help

- **Documentation**: Check this README and `/docs` folder
- **Issues**: Create a GitHub issue with error logs
- **Support**: Email support@preparationai.com

## 🆘 Support

For support, email support@preparationai.com or join our Slack channel.

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Video interview support
- [ ] Advanced analytics dashboard
- [ ] Company-specific interview templates
- [ ] Integration with job boards
- [ ] Multi-language support
- [ ] AI-powered resume analysis
- [ ] Interview scheduling system
