# PreparationAI - AI-Driven Mock Interview Platform

An intelligent mock interview platform that provides personalized interview experiences tailored to specific job requirements and technical skills. Built with modern web technologies and deployed using cloud-native infrastructure.

## 🚀 Features

- **AI-Powered Questions**: Generate interview questions based on role, skills, and experience level using OpenAI GPT-4
- **Real-time Evaluation**: Get instant feedback on technical depth, communication, and problem-solving
- **Multiple Session Types**: Quick drills (15 min), Standard (30 min), and Deep dive (60 min)
- **Audio Recording**: Record and transcribe voice responses for comprehensive analysis
- **Progress Tracking**: Monitor improvement over time with detailed analytics
- **Payment Integration**: Secure payment processing with Stripe
- **WebSocket Support**: Real-time communication during interviews
- **Responsive Design**: Modern UI built with React and Tailwind CSS

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Tailwind CSS** for modern styling
- **Heroicons** for consistent iconography
- **Zustand** for state management
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Go Fiber** for high-performance HTTP server
- **PostgreSQL** for data persistence
- **Redis** for caching and sessions
- **JWT** for authentication
- **OpenAI GPT-4** for AI-powered features
- **Stripe** for payment processing
- **WebSocket** for real-time communication

### Infrastructure
- **Docker** for containerization
- **Docker Compose** for development environment
- **Nginx** for production serving
- **GitHub Actions** for CI/CD
- **Multi-cloud support** (AWS, GCP, Azure, Kubernetes)

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
├── k8s/                    # Kubernetes deployment manifests
├── infrastructure/         # Infrastructure as code
├── scripts/               # Deployment and setup scripts
├── .github/workflows/      # GitHub Actions CI/CD
└── docker-compose.yml      # Development environment
```

## 🛠️ Prerequisites

### Required Software
- **Node.js** 18+ and npm
- **Go** 1.21+
- **Docker** and Docker Compose
- **Git** for version control

### Required Accounts
- **OpenAI** account for AI features
- **Stripe** account for payments
- **Cloud Provider** account (AWS, GCP, Azure, or Kubernetes cluster)

### Optional Tools
- **Terraform** for infrastructure as code
- **kubectl** for Kubernetes deployments
- **Cloud CLI tools** (AWS CLI, gcloud, az)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd PreparationAI

# Run automated setup
./scripts/init.sh
```

### 2. Configure Environment

The setup script will generate a secure JWT secret. Edit `.env` file with your API keys:

```bash
# Copy environment template
cp env.example .env

# Edit with your values
nano .env
```

**Required API Keys:**
```env
# OpenAI API (required for AI features)
OPENAI_API_KEY=your-openai-api-key

# Stripe (required for payments)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### 3. Start Development Environment

```bash
# Start all services with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 🎨 User Flow

The application follows a 7-screen wireframe flow:

1. **Landing Page** - Role input and sample question preview
2. **Onboarding** - User authentication and registration
3. **Role Setup** - Skill tags and industry/role selection
4. **Warmup** - Experience level and preference calibration
5. **Payment** - Session type selection and pricing
6. **Interview Dashboard** - Real-time interview with timer
7. **Feedback** - Detailed scoring and recommendations
8. **Dashboard** - Progress tracking and session history

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

### WebSocket
- `WS /ws` - Real-time communication during interviews

## 🐳 Docker Development

### Development Mode
```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

### Production Mode
```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d
```

## ☁️ Cloud Deployment

### Supported Platforms
- **AWS** (ECS, RDS, ElastiCache)
- **Google Cloud** (Cloud Run, Cloud SQL, Memorystore)
- **Azure** (Container Instances, Database, Cache)
- **Kubernetes** (Any K8s cluster)

### Deploy to Cloud
```bash
# AWS
./scripts/deploy.sh -e staging -p aws

# Google Cloud
./scripts/deploy.sh -e staging -p gcp

# Azure
./scripts/deploy.sh -e staging -p azure

# Kubernetes
./scripts/deploy.sh -e staging -p k8s
```

### GitHub Actions CI/CD
The project includes automated CI/CD pipelines:
- **Automatic testing** on pull requests
- **Docker image building** and pushing
- **Multi-environment deployment**
- **Database migrations**
- **Health checks**

## 🗄️ Database Setup

### Local Development
```bash
# PostgreSQL is automatically started with Docker Compose
# Database schema and seed data are applied automatically
```

### Production Database
- **AWS**: Use RDS PostgreSQL
- **GCP**: Use Cloud SQL PostgreSQL
- **Azure**: Use Azure Database for PostgreSQL

### Database Schema
- **Users** - User accounts and authentication
- **User Profiles** - User preferences and skills
- **Interview Sessions** - Session management
- **Questions** - Generated interview questions
- **Responses** - User responses and audio
- **Feedback** - AI-generated feedback
- **Subscriptions** - Payment and subscription management

## 🔒 Security Features

- **JWT Authentication** with secure token management
- **Password Hashing** using bcrypt
- **Rate Limiting** to prevent abuse
- **CORS Configuration** for secure cross-origin requests
- **Input Validation** and sanitization
- **SQL Injection Protection** with parameterized queries
- **XSS Protection** with proper content encoding
- **HTTPS Enforcement** in production

## 📊 Monitoring and Logging

### Health Checks
```bash
# Application health
curl http://localhost:8080/health

# Database health
curl http://localhost:8080/health/db

# Redis health
curl http://localhost:8080/health/redis
```

### Logging
- **Structured JSON logging** in production
- **Request/response logging** for debugging
- **Error tracking** with stack traces
- **Performance metrics** collection

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
npm run lint
npm run build
```

### Backend Tests
```bash
cd backend
go test -v ./...
go test -race ./...
go test -cover ./...
```

### Integration Tests
```bash
# Start test environment
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 🚨 Troubleshooting

### Common Issues

#### Frontend Won't Start
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Backend Compilation Errors
```bash
cd backend
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

# Check logs
docker logs preparation-ai-postgres
```

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :8080  # Backend port
lsof -i :5173  # Frontend port

# Kill processes using ports
kill -9 <PID>
```

## 📈 Performance Optimization

### Frontend
- **Code splitting** with React.lazy()
- **Image optimization** with WebP format
- **Bundle analysis** and optimization
- **CDN integration** for static assets

### Backend
- **Connection pooling** for database
- **Redis caching** for frequently accessed data
- **Gzip compression** for API responses
- **Horizontal scaling** with load balancing

### Database
- **Index optimization** for query performance
- **Query optimization** and monitoring
- **Read replicas** for read-heavy workloads
- **Connection pooling** configuration

## 🔄 Development Workflow

### Git Workflow
1. Create feature branch from `main`
2. Make changes and test locally
3. Push branch and create pull request
4. Automated CI/CD pipeline runs tests
5. Code review and merge to `main`
6. Automatic deployment to staging/production

### Code Quality
- **ESLint** for frontend code quality
- **Go vet** and **gofmt** for backend
- **TypeScript** strict mode enabled
- **Pre-commit hooks** for code formatting

## 📞 Support

### Getting Help
1. **Check logs** for error messages
2. **Review documentation** in this README
3. **Create GitHub issue** with error details
4. **Check cloud provider status** pages

### Emergency Procedures
```bash
# Rollback deployment
docker-compose down
docker-compose up -d --scale backend=1

# Database recovery
psql -h $DB_HOST -U $DB_USER $DB_NAME < backup_file.sql
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Video interview support
- [ ] Advanced analytics dashboard
- [ ] Company-specific interview templates
- [ ] Integration with job boards
- [ ] Multi-language support
- [ ] AI-powered resume analysis
- [ ] Interview scheduling system

---

**Ready to ace your interviews! 🎯**