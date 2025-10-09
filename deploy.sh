#!/bin/bash

# Monthly Budget Dashboard Deployment Script
# Usage: bash deploy.sh (or ./deploy.sh if executable)
# For production servers with permission issues: sudo bash deploy.sh

set -e  # Exit on any error

echo "🚀 Starting deployment for Monthly Budget Dashboard..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="monthly-budget-dashboard"
PORT=3344
NODE_ENV="production"

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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    print_warning "PM2 is not installed. Installing PM2 globally..."
    npm install -g pm2
    print_success "PM2 installed successfully"
fi

print_status "Installing dependencies..."
npm ci --only=production

print_status "Building application..."
npm run build

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    print_status "Creating logs directory..."
    mkdir -p logs
    chmod 755 logs
fi

# Stop existing PM2 process if running
if pm2 list | grep -q "$APP_NAME"; then
    print_status "Stopping existing application..."
    pm2 stop $APP_NAME
    pm2 delete $APP_NAME
fi

print_status "Starting application with PM2..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup (optional - for server restart)
print_status "Setting up PM2 startup script..."
pm2 startup

print_success "Deployment completed successfully!"
print_status "Application is running on port $PORT"
print_status "Check status with: pm2 status"
print_status "View logs with: pm2 logs $APP_NAME"

# Display application status
echo ""
echo "📊 Application Status:"
pm2 status $APP_NAME

echo ""
echo "🌐 Application URLs:"
echo "   Local: http://localhost:$PORT"
echo "   Network: http://$(hostname -I | awk '{print $1}'):$PORT"

echo ""
print_success "Deployment completed! 🎉"