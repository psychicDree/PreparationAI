#!/bin/bash

# PreparationAI Environment Setup Script
# This script helps set up the environment configuration

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

# Function to generate a secure JWT secret
generate_jwt_secret() {
    if command_exists openssl; then
        openssl rand -base64 32
    elif command_exists python3; then
        python3 -c "import secrets; print(secrets.token_urlsafe(32))"
    else
        # Fallback to a simple random string
        date +%s | sha256sum | base64 | head -c 32
    fi
}

# Function to validate environment file
validate_env() {
    local env_file=$1
    
    if [ ! -f "$env_file" ]; then
        print_error "Environment file $env_file not found"
        return 1
    fi
    
    # Check for required variables
    local required_vars=(
        "NODE_ENV"
        "DB_HOST"
        "DB_PASSWORD"
        "JWT_SECRET"
        "OPENAI_API_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_PUBLISHABLE_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" || grep -q "^${var}=$" "$env_file" || grep -q "^${var}=your-" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_warning "Missing or incomplete required variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
    
    print_success "Environment file validation passed"
    return 0
}

# Function to setup environment
setup_environment() {
    print_status "Setting up PreparationAI environment..."
    
    # Check if .env already exists
    if [ -f ".env" ]; then
        print_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Keeping existing .env file"
            return 0
        fi
    fi
    
    # Copy example file
    if [ -f "env.example" ]; then
        cp env.example .env
        print_success "Created .env file from env.example"
    else
        print_error "env.example file not found"
        return 1
    fi
    
    # Generate JWT secret
    local jwt_secret=$(generate_jwt_secret)
    if command_exists sed; then
        sed -i.bak "s/your-super-secret-jwt-key-change-in-production/$jwt_secret/" .env
        rm .env.bak 2>/dev/null || true
        print_success "Generated secure JWT secret"
    else
        print_warning "Could not automatically generate JWT secret. Please update JWT_SECRET in .env"
    fi
    
    print_success "Environment setup completed!"
    print_warning "Please update the following variables in .env:"
    echo "  - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys"
    echo "  - STRIPE_SECRET_KEY: Get from https://dashboard.stripe.com/apikeys"
    echo "  - STRIPE_PUBLISHABLE_KEY: Get from https://dashboard.stripe.com/apikeys"
    echo "  - DB_PASSWORD: Set your PostgreSQL password"
}

# Function to check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for required commands
    if ! command_exists go; then
        missing_deps+=("go")
    fi
    
    if ! command_exists node; then
        missing_deps+=("node")
    fi
    
    if ! command_exists npm; then
        missing_deps+=("npm")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_error "Missing required dependencies:"
        for dep in "${missing_deps[@]}"; do
            echo "  - $dep"
        done
        echo
        print_status "Please install the missing dependencies and run this script again"
        return 1
    fi
    
    print_success "All dependencies are installed"
    return 0
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if PostgreSQL is running
    if command_exists psql; then
        print_status "PostgreSQL client found"
        
        # Try to connect to database
        if psql -h localhost -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
            print_success "PostgreSQL connection successful"
            
            # Create database if it doesn't exist
            if ! psql -h localhost -U postgres -d postgres -c "SELECT 1 FROM pg_database WHERE datname='preparation_ai';" | grep -q "1 row"; then
                print_status "Creating database 'preparation_ai'..."
                psql -h localhost -U postgres -d postgres -c "CREATE DATABASE preparation_ai;"
                print_success "Database created successfully"
            else
                print_success "Database 'preparation_ai' already exists"
            fi
            
            # Run schema if it exists
            if [ -f "database/schema.sql" ]; then
                print_status "Running database schema..."
                psql -h localhost -U postgres -d preparation_ai -f database/schema.sql
                print_success "Database schema applied successfully"
            fi
            
            # Run seed data if it exists
            if [ -f "database/seed.sql" ]; then
                print_status "Seeding database..."
                psql -h localhost -U postgres -d preparation_ai -f database/seed.sql
                print_success "Database seeded successfully"
            fi
        else
            print_warning "Could not connect to PostgreSQL. Please ensure it's running and accessible"
        fi
    else
        print_warning "PostgreSQL client not found. Please install PostgreSQL and run the schema manually"
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        print_status "Installing backend dependencies..."
        cd backend
        go mod tidy
        cd ..
        print_success "Backend dependencies installed"
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    fi
}

# Function to show help
show_help() {
    echo "PreparationAI Environment Setup Script"
    echo
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -e, --env        Setup environment configuration"
    echo "  -d, --deps       Check and install dependencies"
    echo "  -b, --db         Setup database"
    echo "  -a, --all        Run all setup steps"
    echo "  -v, --validate   Validate existing .env file"
    echo "  -h, --help       Show this help message"
    echo
    echo "Examples:"
    echo "  $0 --all         # Run complete setup"
    echo "  $0 --env         # Setup environment only"
    echo "  $0 --validate    # Validate .env file"
}

# Main function
main() {
    local setup_env=false
    local setup_deps=false
    local setup_db=false
    local validate_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--env)
                setup_env=true
                shift
                ;;
            -d|--deps)
                setup_deps=true
                shift
                ;;
            -b|--db)
                setup_db=true
                shift
                ;;
            -a|--all)
                setup_env=true
                setup_deps=true
                setup_db=true
                shift
                ;;
            -v|--validate)
                validate_only=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # If no options specified, show help
    if [ "$setup_env" = false ] && [ "$setup_deps" = false ] && [ "$setup_db" = false ] && [ "$validate_only" = false ]; then
        show_help
        exit 0
    fi
    
    # Validate existing .env file
    if [ "$validate_only" = true ]; then
        if [ -f ".env" ]; then
            validate_env ".env"
        else
            print_error ".env file not found"
            exit 1
        fi
        exit 0
    fi
    
    # Check dependencies first
    if [ "$setup_deps" = true ] || [ "$setup_env" = true ] || [ "$setup_db" = true ]; then
        check_dependencies
    fi
    
    # Setup environment
    if [ "$setup_env" = true ]; then
        setup_environment
    fi
    
    # Install dependencies
    if [ "$setup_deps" = true ]; then
        install_dependencies
    fi
    
    # Setup database
    if [ "$setup_db" = true ]; then
        setup_database
    fi
    
    print_success "Setup completed successfully!"
    echo
    print_status "Next steps:"
    echo "  1. Update API keys in .env file"
    echo "  2. Start the backend: cd backend && go run cmd/main.go"
    echo "  3. Start the frontend: cd frontend && npm run dev"
    echo "  4. Visit http://localhost:5173 to see the application"
}

# Run main function with all arguments
main "$@"
