# Configuration Management Guide

This guide explains how to manage environment variables, configuration, and secrets for the PreparationAI platform.

## 🏗️ Architecture Overview

The configuration system is designed with the following principles:

- **Centralized Management**: All configuration is managed from a single source
- **Environment-Specific**: Different configurations for development, staging, and production
- **Security-First**: Sensitive data is properly protected and validated
- **Type-Safe**: Configuration is validated and typed in both frontend and backend
- **Developer-Friendly**: Easy setup and validation tools

## 📁 Configuration Structure

```
PreparationAI/
├── .env                    # Local environment variables (not committed)
├── env.example            # Template for environment variables
├── scripts/
│   └── setup-env.sh       # Environment setup script
├── backend/
│   ├── internal/config/   # Backend configuration management
│   └── cmd/
│       └── validate-config.go  # Configuration validation tool
└── frontend/
    └── src/config/        # Frontend configuration management
```

## 🔧 Backend Configuration

### Configuration Structure

The backend uses a centralized configuration system in `internal/config/config.go`:

```go
type Config struct {
    Server   ServerConfig   `json:"server"`
    Database DatabaseConfig `json:"database"`
    Redis    RedisConfig    `json:"redis"`
    JWT      JWTConfig      `json:"jwt"`
    OpenAI   OpenAIConfig   `json:"openai"`
    Stripe   StripeConfig   `json:"stripe"`
    Environment string      `json:"environment"`
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `PORT` | Server port | `8080` | No |
| `SERVER_HOST` | Server host | `0.0.0.0` | No |
| `DB_HOST` | Database host | `localhost` | No |
| `DB_PORT` | Database port | `5432` | No |
| `DB_USER` | Database user | `postgres` | No |
| `DB_PASSWORD` | Database password | `password` | **Yes** |
| `DB_NAME` | Database name | `preparation_ai` | No |
| `DB_SSLMODE` | SSL mode | `disable` | No |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` | **Yes** |
| `OPENAI_API_KEY` | OpenAI API key | - | **Yes** |
| `STRIPE_SECRET_KEY` | Stripe secret key | - | **Yes** |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | - | **Yes** |

### Usage in Code

```go
import "preparation-ai/internal/config"

// Load configuration
cfg, err := config.LoadConfig()
if err != nil {
    log.Fatal("Failed to load configuration:", err)
}

// Use configuration
db, err := sql.Open("postgres", cfg.GetDatabaseDSN())
stripe.Key = cfg.Stripe.SecretKey
```

## 🎨 Frontend Configuration

### Configuration Structure

The frontend uses a TypeScript configuration system in `src/config/index.ts`:

```typescript
interface Config {
  api: {
    baseUrl: string;
    timeout: number;
  };
  stripe: {
    publishableKey: string;
  };
  app: {
    name: string;
    version: string;
    environment: string;
    debug: boolean;
  };
  features: {
    enableAudioRecording: boolean;
    enablePayments: boolean;
    enableAnalytics: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
  };
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8080/api/v1` | **Yes** |
| `VITE_API_TIMEOUT` | API timeout in ms | `10000` | No |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | - | **Yes** |
| `VITE_NODE_ENV` | Environment mode | `development` | No |
| `VITE_DEBUG` | Debug mode | `true` (dev) | No |
| `VITE_ENABLE_AUDIO_RECORDING` | Enable audio features | `true` | No |
| `VITE_ENABLE_PAYMENTS` | Enable payment features | `true` | No |
| `VITE_ENABLE_ANALYTICS` | Enable analytics | `false` | No |

### Usage in Code

```typescript
import { config, getApiUrl, isFeatureEnabled } from '../config';

// Use configuration
const apiUrl = getApiUrl('/auth/login');
const isDebug = config.app.debug;
const canRecord = isFeatureEnabled('enableAudioRecording');
```

## 🚀 Quick Setup

### 1. Automated Setup

Use the setup script for quick configuration:

```bash
# Complete setup
./scripts/setup-env.sh --all

# Environment only
./scripts/setup-env.sh --env

# Validate existing configuration
./scripts/setup-env.sh --validate
```

### 2. Manual Setup

```bash
# Copy environment template
cp env.example .env

# Edit configuration
nano .env

# Validate configuration
cd backend && go run cmd/validate-config.go
```

## 🔐 Security Best Practices

### Environment Variables

1. **Never commit `.env` files** to version control
2. **Use strong secrets** for JWT and API keys
3. **Rotate secrets regularly** in production
4. **Use different secrets** for each environment

### Production Security

```bash
# Generate secure JWT secret
openssl rand -base64 32

# Use environment-specific secrets
JWT_SECRET=your-production-secret-here
DB_PASSWORD=your-secure-db-password
STRIPE_SECRET_KEY=sk_live_your-live-key
```

### Secrets Management

For production, consider using:

- **AWS Secrets Manager**
- **Azure Key Vault**
- **HashiCorp Vault**
- **Kubernetes Secrets**

## 🌍 Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
VITE_NODE_ENV=development
VITE_DEBUG=true
DB_SSLMODE=disable
```

### Staging

```bash
NODE_ENV=staging
VITE_NODE_ENV=staging
VITE_DEBUG=false
DB_SSLMODE=prefer
```

### Production

```bash
NODE_ENV=production
VITE_NODE_ENV=production
VITE_DEBUG=false
DB_SSLMODE=require
```

## 🔍 Configuration Validation

### Backend Validation

```bash
cd backend
go run cmd/validate-config.go
```

This will:
- Load and validate all configuration
- Check for required variables
- Display configuration summary
- Exit with error code if validation fails

### Frontend Validation

The frontend automatically validates configuration on load:

```typescript
// Configuration is validated automatically
import { config } from '../config';

// Check validation status
const validation = validateConfig();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}
```

## 🛠️ Configuration Tools

### Setup Script

The `scripts/setup-env.sh` script provides:

- **Environment setup**: Creates `.env` from template
- **Dependency checking**: Validates required tools
- **Database setup**: Creates database and runs schema
- **Secret generation**: Generates secure JWT secrets
- **Validation**: Checks configuration completeness

### Usage Examples

```bash
# Complete setup
./scripts/setup-env.sh --all

# Check dependencies only
./scripts/setup-env.sh --deps

# Setup database only
./scripts/setup-env.sh --db

# Validate existing configuration
./scripts/setup-env.sh --validate
```

## 📊 Configuration Monitoring

### Health Checks

The backend provides configuration-aware health checks:

```bash
curl http://localhost:8080/api/v1/health
```

Response:
```json
{
  "status": "ok",
  "message": "PreparationAI API is running",
  "environment": "development",
  "version": "1.0.0"
}
```

### Logging

Configuration is logged on startup:

```
[INFO] Starting PreparationAI server in development mode
[INFO] Server starting on 0.0.0.0:8080
[INFO] Database connected successfully
[INFO] Configuration loaded and validated
```

## 🔄 Configuration Updates

### Hot Reloading

- **Backend**: Restart required for configuration changes
- **Frontend**: Vite automatically reloads on environment changes

### Deployment Updates

```bash
# Update environment variables
export NEW_VARIABLE=value

# Restart services
docker-compose restart backend frontend

# Or for manual deployment
systemctl restart preparation-ai-backend
```

## 🚨 Troubleshooting

### Common Issues

1. **Configuration not loading**
   ```bash
   # Check file exists and is readable
   ls -la .env
   
   # Validate syntax
   ./scripts/setup-env.sh --validate
   ```

2. **Missing required variables**
   ```bash
   # Check required variables
   grep -E "^(OPENAI_API_KEY|STRIPE_SECRET_KEY|JWT_SECRET)=" .env
   ```

3. **Database connection issues**
   ```bash
   # Test database connection
   psql -h localhost -U postgres -d preparation_ai -c "SELECT 1;"
   ```

4. **Frontend API connection issues**
   ```bash
   # Check API URL
   echo $VITE_API_URL
   
   # Test API endpoint
   curl $VITE_API_URL/health
   ```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Backend
NODE_ENV=development

# Frontend
VITE_DEBUG=true
```

## 📚 Additional Resources

- [Environment Variables Best Practices](https://12factor.net/config)
- [Go Configuration Patterns](https://github.com/golang/go/wiki/Config)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)

## 🤝 Contributing

When adding new configuration:

1. **Add to `env.example`** with documentation
2. **Update backend config** in `internal/config/config.go`
3. **Update frontend config** in `src/config/index.ts`
4. **Add validation** in both systems
5. **Update documentation** in this file
6. **Test in all environments**

---

This configuration system ensures that PreparationAI can be easily deployed and maintained across different environments while maintaining security and developer productivity.
