# Deployment Guide

This guide covers deploying PreparationAI to production environments.

## Prerequisites

- Docker and Docker Compose
- Domain name and SSL certificate
- PostgreSQL database (managed service recommended)
- Redis instance (managed service recommended)
- OpenAI API key
- Stripe account with API keys

## Environment Setup

### 1. Production Environment Variables

Create a `.env.production` file:

```bash
# Database Configuration
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-secure-db-password
DB_NAME=preparation_ai_prod
DB_SSLMODE=require

# Redis Configuration
REDIS_URL=your-redis-url

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key

# Server Configuration
PORT=8080
NODE_ENV=production

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key

# Frontend Configuration
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
```

### 2. Database Setup

#### Using Managed PostgreSQL (Recommended)

1. Create a PostgreSQL instance on your cloud provider
2. Configure connection settings
3. Run the schema:

```bash
psql $DATABASE_URL < database/schema.sql
```

#### Using Docker

```bash
# Start PostgreSQL container
docker run -d \
  --name preparation-ai-db \
  -e POSTGRES_DB=preparation_ai_prod \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your-secure-password \
  -p 5432:5432 \
  postgres:15-alpine

# Run schema
psql -h localhost -U postgres -d preparation_ai_prod < database/schema.sql
```

### 3. Redis Setup

#### Using Managed Redis (Recommended)

1. Create a Redis instance on your cloud provider
2. Configure connection settings

#### Using Docker

```bash
docker run -d \
  --name preparation-ai-redis \
  -p 6379:6379 \
  redis:7-alpine
```

## Docker Deployment

### 1. Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - DB_SSLMODE=${DB_SSLMODE}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - NODE_ENV=production
      - PORT=8080
    ports:
      - "8080:8080"
    restart: unless-stopped
    networks:
      - preparation-ai-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
    restart: unless-stopped
    networks:
      - preparation-ai-network

networks:
  preparation-ai-network:
    driver: bridge
```

### 2. Deploy with Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update services
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## Cloud Platform Deployment

### AWS Deployment

#### 1. ECS with Fargate

```yaml
# task-definition.json
{
  "family": "preparation-ai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/preparation-ai-backend:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DB_HOST",
          "value": "your-rds-endpoint"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/preparation-ai",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### 2. RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier preparation-ai-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-12345678
```

#### 3. ElastiCache Redis

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id preparation-ai-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

### Google Cloud Platform

#### 1. Cloud Run

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/preparation-ai-backend', './backend']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/preparation-ai-backend']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'preparation-ai-backend', '--image', 'gcr.io/$PROJECT_ID/preparation-ai-backend', '--platform', 'managed', '--region', 'us-central1']
```

#### 2. Cloud SQL PostgreSQL

```bash
# Create Cloud SQL instance
gcloud sql instances create preparation-ai-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

### DigitalOcean

#### 1. App Platform

```yaml
# .do/app.yaml
name: preparation-ai
services:
- name: backend
  source_dir: /backend
  github:
    repo: your-username/preparation-ai
    branch: main
  run_command: go run cmd/main.go
  environment_slug: go
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DB_HOST
    value: ${db.HOSTNAME}
  - key: DB_PASSWORD
    value: ${db.PASSWORD}
    type: SECRET

- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/preparation-ai
    branch: main
  run_command: npm run build && npx serve -s dist
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs

databases:
- name: db
  engine: PG
  version: "15"
```

## SSL/TLS Configuration

### 1. Let's Encrypt with Certbot

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Nginx SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Monitoring and Logging

### 1. Application Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

### 2. Log Aggregation

```yaml
# Add to docker-compose.prod.yml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Backup and Recovery

### 1. Database Backup

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
```

### 2. Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files to version control
- Use secrets management services (AWS Secrets Manager, Azure Key Vault)
- Rotate secrets regularly

### 2. Network Security

- Use VPCs and security groups
- Enable firewall rules
- Use HTTPS everywhere
- Implement rate limiting

### 3. Application Security

- Validate all inputs
- Use parameterized queries
- Implement proper authentication
- Regular security updates

## Performance Optimization

### 1. Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_sessions_user_status ON interview_sessions(user_id, status);
CREATE INDEX CONCURRENTLY idx_questions_session_order ON session_questions(session_id, order_index);
```

### 2. Caching Strategy

```go
// Redis caching example
func GetSession(sessionID string) (*models.InterviewSession, error) {
    // Try cache first
    cached, err := redis.Get("session:" + sessionID).Result()
    if err == nil {
        var session models.InterviewSession
        json.Unmarshal([]byte(cached), &session)
        return &session, nil
    }
    
    // Fallback to database
    session, err := db.GetSession(sessionID)
    if err != nil {
        return nil, err
    }
    
    // Cache for 1 hour
    data, _ := json.Marshal(session)
    redis.Set("session:"+sessionID, data, time.Hour)
    
    return session, nil
}
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check connection string
   - Verify network access
   - Check SSL configuration

2. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Validate token format

3. **OpenAI API Errors**
   - Check API key validity
   - Verify rate limits
   - Check request format

### Health Checks

```go
// Health check endpoint
func HealthCheck(c *fiber.Ctx) error {
    // Check database
    if err := db.Ping(); err != nil {
        return c.Status(503).JSON(fiber.Map{
            "status": "unhealthy",
            "database": "down",
        })
    }
    
    // Check Redis
    if err := redis.Ping().Err(); err != nil {
        return c.Status(503).JSON(fiber.Map{
            "status": "unhealthy",
            "redis": "down",
        })
    }
    
    return c.JSON(fiber.Map{
        "status": "healthy",
        "timestamp": time.Now(),
    })
}
```
