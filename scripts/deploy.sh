#!/bin/bash

# PreparationAI Deployment Script
# This script automates the deployment process for different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="staging"
PLATFORM="docker"
SKIP_TESTS=false
BUILD_ONLY=false

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Set environment (staging|production) [default: staging]"
    echo "  -p, --platform PLATFORM Set platform (docker|aws|gcp|azure|k8s) [default: docker]"
    echo "  -s, --skip-tests        Skip running tests"
    echo "  -b, --build-only        Only build, don't deploy"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -e production -p aws"
    echo "  $0 -e staging -p docker --skip-tests"
    echo "  $0 --build-only"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -p|--platform)
            PLATFORM="$2"
            shift 2
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        -b|--build-only)
            BUILD_ONLY=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    exit 1
fi

# Validate platform
if [[ "$PLATFORM" != "docker" && "$PLATFORM" != "aws" && "$PLATFORM" != "gcp" && "$PLATFORM" != "azure" && "$PLATFORM" != "k8s" ]]; then
    print_error "Invalid platform: $PLATFORM. Must be 'docker', 'aws', 'gcp', 'azure', or 'k8s'"
    exit 1
fi

print_status "Starting deployment for environment: $ENVIRONMENT on platform: $PLATFORM"

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        print_warning ".env file not found. Creating from template..."
        cp env.example .env
        print_warning "Please update .env file with your configuration before continuing."
        exit 1
    fi
    
    # Platform-specific checks
    case $PLATFORM in
        docker)
            if ! command -v docker &> /dev/null; then
                print_error "Docker is not installed"
                exit 1
            fi
            if ! command -v docker-compose &> /dev/null; then
                print_error "Docker Compose is not installed"
                exit 1
            fi
            ;;
        aws)
            if ! command -v aws &> /dev/null; then
                print_error "AWS CLI is not installed"
                exit 1
            fi
            if ! command -v terraform &> /dev/null; then
                print_error "Terraform is not installed"
                exit 1
            fi
            ;;
        gcp)
            if ! command -v gcloud &> /dev/null; then
                print_error "Google Cloud SDK is not installed"
                exit 1
            fi
            ;;
        azure)
            if ! command -v az &> /dev/null; then
                print_error "Azure CLI is not installed"
                exit 1
            fi
            ;;
        k8s)
            if ! command -v kubectl &> /dev/null; then
                print_error "kubectl is not installed"
                exit 1
            fi
            ;;
    esac
    
    print_success "Prerequisites check completed"
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        print_warning "Skipping tests"
        return
    fi
    
    print_status "Running tests..."
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm ci
    npm run lint
    npm run build
    cd ..
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    go mod download
    go test -v ./...
    go build -o main cmd/main.go
    cd ..
    
    print_success "All tests passed"
}

# Build application
build_application() {
    print_status "Building application..."
    
    # Build Docker image
    docker build -t preparation-ai:$ENVIRONMENT .
    
    # Tag for registry if needed
    if [[ "$PLATFORM" != "docker" ]]; then
        case $PLATFORM in
            aws)
                docker tag preparation-ai:$ENVIRONMENT $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/preparation-ai:$ENVIRONMENT
                ;;
            gcp)
                docker tag preparation-ai:$ENVIRONMENT gcr.io/$GCP_PROJECT_ID/preparation-ai:$ENVIRONMENT
                ;;
            azure)
                docker tag preparation-ai:$ENVIRONMENT $AZURE_CONTAINER_REGISTRY.azurecr.io/preparation-ai:$ENVIRONMENT
                ;;
        esac
    fi
    
    print_success "Application built successfully"
}

# Deploy application
deploy_application() {
    if [[ "$BUILD_ONLY" == "true" ]]; then
        print_warning "Build only mode - skipping deployment"
        return
    fi
    
    print_status "Deploying application..."
    
    case $PLATFORM in
        docker)
            deploy_docker
            ;;
        aws)
            deploy_aws
            ;;
        gcp)
            deploy_gcp
            ;;
        azure)
            deploy_azure
            ;;
        k8s)
            deploy_k8s
            ;;
    esac
    
    print_success "Deployment completed"
}

# Docker deployment
deploy_docker() {
    print_status "Deploying with Docker Compose..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    if curl -f http://localhost:8080/health; then
        print_success "Application is healthy"
    else
        print_error "Application health check failed"
        exit 1
    fi
}

# AWS deployment
deploy_aws() {
    print_status "Deploying to AWS..."
    
    # Push to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/preparation-ai:$ENVIRONMENT
    
    # Deploy with ECS
    aws ecs update-service --cluster preparation-ai-cluster --service preparation-ai-service --force-new-deployment
}

# GCP deployment
deploy_gcp() {
    print_status "Deploying to Google Cloud..."
    
    # Push to GCR
    gcloud auth configure-docker
    docker push gcr.io/$GCP_PROJECT_ID/preparation-ai:$ENVIRONMENT
    
    # Deploy to Cloud Run
    gcloud run deploy preparation-ai --image gcr.io/$GCP_PROJECT_ID/preparation-ai:$ENVIRONMENT --platform managed --region $GCP_REGION
}

# Azure deployment
deploy_azure() {
    print_status "Deploying to Azure..."
    
    # Push to ACR
    az acr login --name $AZURE_CONTAINER_REGISTRY
    docker push $AZURE_CONTAINER_REGISTRY.azurecr.io/preparation-ai:$ENVIRONMENT
    
    # Deploy to Container Instances
    az container create --resource-group $AZURE_RESOURCE_GROUP --name preparation-ai-$ENVIRONMENT --image $AZURE_CONTAINER_REGISTRY.azurecr.io/preparation-ai:$ENVIRONMENT
}

# Kubernetes deployment
deploy_k8s() {
    print_status "Deploying to Kubernetes..."
    
    # Apply manifests
    kubectl apply -f k8s/preparation-ai.yaml
    
    # Wait for deployment
    kubectl rollout status deployment/preparation-ai-backend -n preparation-ai
}

# Main execution
main() {
    check_prerequisites
    run_tests
    build_application
    deploy_application
    
    print_success "Deployment completed successfully!"
    print_status "Environment: $ENVIRONMENT"
    print_status "Platform: $PLATFORM"
    
    # Show access information
    case $PLATFORM in
        docker)
            print_status "Application available at: http://localhost:8080"
            ;;
        aws)
            print_status "Check AWS console for ALB DNS name"
            ;;
        gcp)
            print_status "Check Cloud Run console for service URL"
            ;;
        azure)
            print_status "Check Azure console for container IP"
            ;;
        k8s)
            print_status "Check kubectl get ingress for external IP"
            ;;
    esac
}

# Run main function
main
