#!/bin/bash

# Cleanup script for deployment
# This script removes files and folders that are not needed for production deployment

echo "🧹 Starting cleanup for deployment..."

# 1. Remove node_modules (143MB) - can be reinstalled
echo "📦 Removing node_modules..."
rm -rf frontend/node_modules/
echo "✅ Removed frontend/node_modules/"

# 2. Remove .git folder (7.3MB) - not needed for deployment
echo "🔧 Removing .git folder..."
rm -rf .git/
echo "✅ Removed .git/"

# 3. Remove build artifacts - will be rebuilt in production
echo "🏗️ Removing build artifacts..."
rm -rf frontend/dist/
echo "✅ Removed frontend/dist/"

# 4. Remove environment file - contains sensitive data
echo "🔐 Removing .env file..."
rm -f .env
echo "✅ Removed .env"

# 5. Remove temporary files
echo "🗑️ Removing temporary files..."
rm -rf frontend/node_modules/.tmp/
echo "✅ Removed temporary files"

# 6. Remove backup files
echo "📄 Removing backup files..."
rm -f backend/cmd/validate-config.go.bak
echo "✅ Removed backup files"

# 7. Remove any other common temporary files
echo "🧽 Cleaning up other temporary files..."
find . -name "*.log" -delete 2>/dev/null || true
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
find . -name "Thumbs.db" -delete 2>/dev/null || true
echo "✅ Cleaned up temporary files"

# 8. Show final size
echo ""
echo "📊 Final project size:"
du -sh . 2>/dev/null || echo "Could not calculate size"

echo ""
echo "🎉 Cleanup completed! The project is now ready for deployment."
echo ""
echo "📋 What was removed:"
echo "   • frontend/node_modules/ (143MB) - Node.js dependencies"
echo "   • .git/ (7.3MB) - Git repository"
echo "   • frontend/dist/ - Build artifacts"
echo "   • .env - Environment variables with sensitive data"
echo "   • Temporary and backup files"
echo ""
echo "💡 To restore development environment:"
echo "   1. Run: git clone <repository-url>"
echo "   2. Run: cd frontend && npm install"
echo "   3. Run: cp env.example .env"
echo "   4. Run: docker-compose up --build"
