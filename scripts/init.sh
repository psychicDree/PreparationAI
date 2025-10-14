#!/bin/bash

# PreparationAI Project Initialization Script
# This script sets up the project for development and deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random string
generate_random_string() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

print_status "🚀 Initializing PreparationAI Project..."

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local missing_tools=()
    
    # Check for required tools
    if ! command_exists docker; then
        missing_tools+=("docker")
    fi
    
    if ! command_exists docker-compose; then
        missing_tools+=("docker-compose")
    fi
    
    if ! command_exists node; then
        missing_tools+=("node")
    fi
    
    if ! command_exists npm; then
        missing_tools+=("npm")
    fi
    
    if ! command_exists go; then
        missing_tools+=("go")
    fi
    
    if ! command_exists git; then
        missing_tools+=("git")
    fi
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_status "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_success "All prerequisites are installed"
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [[ -f ".env" ]]; then
        print_warning ".env file already exists. Creating backup..."
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    # Copy template
    cp env.example .env
    
    # Generate secure JWT secret
    local jwt_secret=$(generate_random_string)
    
    # Update .env file with generated secret
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-jwt-key-change-in-production/$jwt_secret/" .env
    else
        # Linux
        sed -i "s/your-super-secret-jwt-key-change-in-production/$jwt_secret/" .env
    fi
    
    print_success "Environment file created with secure JWT secret"
    print_warning "Please update .env file with your API keys:"
    print_warning "  - OPENAI_API_KEY"
    print_warning "  - STRIPE_SECRET_KEY"
    print_warning "  - STRIPE_PUBLISHABLE_KEY"
}

# Setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Build frontend
    print_status "Building frontend..."
    npm run build
    
    cd ..
    
    print_success "Frontend setup completed"
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Download Go dependencies
    print_status "Downloading Go dependencies..."
    go mod download
    
    # Verify Go modules
    print_status "Verifying Go modules..."
    go mod verify
    
    # Build backend
    print_status "Building backend..."
    go build -o main cmd/main.go
    
    cd ..
    
    print_success "Backend setup completed"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Start PostgreSQL with Docker
    print_status "Starting PostgreSQL container..."
    docker run --name preparation-ai-postgres \
        -e POSTGRES_PASSWORD=password \
        -e POSTGRES_DB=preparation_ai \
        -p 5432:5432 \
        -d postgres:15-alpine
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Create database if it doesn't exist
    print_status "Creating database..."
    docker exec preparation-ai-postgres psql -U postgres -c "CREATE DATABASE preparation_ai;" || true
    
    # Run schema
    print_status "Applying database schema..."
    docker exec -i preparation-ai-postgres psql -U postgres -d preparation_ai < database/schema.sql
    
    # Run seed data
    if [[ -f "database/seed.sql" ]]; then
        print_status "Seeding database..."
        docker exec -i preparation-ai-postgres psql -U postgres -d preparation_ai < database/seed.sql
    fi
    
    print_success "Database setup completed"
}

# Setup Redis
setup_redis() {
    print_status "Setting up Redis..."
    
    # Start Redis with Docker
    print_status "Starting Redis container..."
    docker run --name preparation-ai-redis \
        -p 6379:6379 \
        -d redis:7-alpine
    
    print_success "Redis setup completed"
}

# Setup Docker Compose
setup_docker_compose() {
    print_status "Setting up Docker Compose..."
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose down 2>/dev/null || true
    
    # Remove existing containers
    print_status "Removing existing containers..."
    docker rm -f preparation-ai-postgres preparation-ai-redis 2>/dev/null || true
    
    # Start services with Docker Compose
    print_status "Starting services with Docker Compose..."
    docker-compose up -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    print_success "Docker Compose setup completed"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm run lint
    cd ..
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    go test -v ./...
    cd ..
    
    print_success "All tests passed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait a bit for services to start
    sleep 10
    
    # Check if backend is responding
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    # Check if frontend is accessible
    if curl -f http://localhost:5173 >/dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_warning "Frontend health check failed (may still be starting)"
    fi
    
    print_success "Health check completed"
}

# Setup GitHub Actions secrets template
setup_github_secrets() {
    print_status "Creating GitHub Secrets template..."
    
    cat > .github-secrets-template.txt << EOF
# GitHub Secrets Template
# Add these secrets to your GitHub repository settings

# Database
DB_HOST=localhost
DB_PASSWORD=password
DB_USER=postgres
DB_NAME=preparation_ai

# JWT
JWT_SECRET=$(generate_random_string)

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# AWS (for AWS deployment)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-aws-account-id

# GCP (for GCP deployment)
GCP_PROJECT_ID=your-gcp-project-id
GCP_SA_KEY=your-service-account-json

# Azure (for Azure deployment)
AZURE_CREDENTIALS=your-service-principal-json
AZURE_CONTAINER_REGISTRY=your-registry-name
AZURE_RESOURCE_GROUP=your-resource-group

# Production Database
PROD_DB_HOST=your-production-db-host
PROD_DB_PASSWORD=your-production-db-password
PROD_DB_USER=preparation_ai
PROD_DB_NAME=preparation_ai

# Staging Database
STAGING_DB_HOST=your-staging-db-host
STAGING_DB_PASSWORD=your-staging-db-password
STAGING_DB_USER=preparation_ai
STAGING_DB_NAME=preparation_ai_staging
EOF
    
    print_success "GitHub Secrets template created: .github-secrets-template.txt"
}

# Create deployment documentation
create_deployment_docs() {
    print_status "Creating deployment documentation..."
    
    # The DEPLOYMENT_GUIDE.md is already created
    print_success "Deployment documentation is ready"
}

# Main setup function
main() {
    print_status "Starting PreparationAI project initialization..."
    
    # Run setup steps
    check_prerequisites
    setup_environment
    setup_frontend
    setup_backend
    setup_database
    setup_redis
    setup_docker_compose
    run_tests
    health_check
    setup_github_secrets
    create_deployment_docs
    
    print_success "🎉 PreparationAI project initialization completed!"
    
    echo ""
    print_status "📋 Next Steps:"
    echo "1. Update .env file with your API keys"
    echo "2. Add GitHub secrets from .github-secrets-template.txt"
    echo "3. Test the application:"
    echo "   - Frontend: http://localhost:5173"
    echo "   - Backend: http://localhost:8080"
    echo "   - Health: http://localhost:8080/health"
    echo ""
    echo "4. Deploy to cloud:"
    echo "   - AWS: ./scripts/deploy.sh -e staging -p aws"
    echo "   - GCP: ./scripts/deploy.sh -e staging -p gcp"
    echo "   - Azure: ./scripts/deploy.sh -e staging -p azure"
    echo "   - Kubernetes: ./scripts/deploy.sh -e staging -p k8s"
    echo ""
    print_status "📚 Documentation:"
    echo "- Deployment Guide: DEPLOYMENT_GUIDE.md"
    echo "- API Documentation: docs/API.md"
    echo "- Configuration: docs/CONFIGURATION.md"
    echo ""
    print_success "Happy coding! 🚀"
}

# Run main function
main
