# Multi-stage Dockerfile for Production
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY frontend/ ./

# Build the application
RUN npm run build

# Go backend builder
FROM golang:1.25.1-alpine AS backend-builder

WORKDIR /app/backend

# Install git and ca-certificates
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY backend/go.mod backend/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY backend/ ./

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/main.go

# Production stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from backend-builder
COPY --from=backend-builder /app/backend/main .

# Copy frontend build from frontend-builder
COPY --from=frontend-builder /app/frontend/dist ./static

# Copy database files
COPY database/ ./database/

# Create non-root user
RUN adduser -D -s /bin/sh appuser
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the application
CMD ["./main"]
