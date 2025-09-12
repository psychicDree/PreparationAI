# PreparationAI API Documentation

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Logout User
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### User Profile

#### Get Profile
```http
GET /profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Update Profile
```http
PUT /profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "experience": 5,
  "skills": ["Unity", "C#", "Netcode"],
  "preferences": {
    "preferred_difficulty": "intermediate",
    "focus_areas": ["technical", "system_design"]
  }
}
```

### Interview Sessions

#### Create Session
```http
POST /sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_type": "standard",
  "tags": ["Unity", "Netcode", "Multiplayer"]
}
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_type": "standard",
  "status": "active",
  "tags": ["Unity", "Netcode", "Multiplayer"],
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### Get Sessions
```http
GET /sessions
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "session_type": "standard",
    "status": "completed",
    "tags": ["Unity", "Netcode", "Multiplayer"],
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Get Session
```http
GET /sessions/{id}
Authorization: Bearer <token>
```

#### Generate Questions
```http
POST /sessions/{id}/questions
Authorization: Bearer <token>
Content-Type: application/json

{
  "experience": 5,
  "preferences": ["technical", "system_design"]
}
```

**Response:**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "session_id": "660e8400-e29b-41d4-a716-446655440000",
    "question_text": "How would you secure a client–server multiplayer architecture in Unity using Netcode?",
    "question_type": "technical",
    "order_index": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### Submit Response
```http
POST /sessions/{id}/responses
Authorization: Bearer <token>
Content-Type: application/json

{
  "response_text": "I would implement server authority by...",
  "audio_url": "https://storage.example.com/audio/response.mp3"
}
```

**Response:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440000",
  "question_id": "770e8400-e29b-41d4-a716-446655440000",
  "response_text": "I would implement server authority by...",
  "audio_url": "https://storage.example.com/audio/response.mp3",
  "submitted_at": "2024-01-01T00:00:00Z"
}
```

#### Get Feedback
```http
GET /sessions/{id}/feedback
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440000",
  "session_id": "660e8400-e29b-41d4-a716-446655440000",
  "technical_score": 7.5,
  "communication_score": 6.5,
  "problem_solving_score": 9.0,
  "strengths": [
    "Solid understanding of server authority",
    "Good problem-solving approach"
  ],
  "weaknesses": [
    "Missed details on synchronization strategies",
    "Could improve communication clarity"
  ],
  "recommendations": [
    "Study concurrency in Netcode",
    "Practice explaining technical concepts"
  ],
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Payments

#### Create Payment Intent
```http
POST /payments/create-intent
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_type": "standard",
  "amount": 900
}
```

**Response:**
```json
{
  "client_secret": "pi_1234567890_secret_abcdef"
}
```

#### Confirm Payment
```http
POST /payments/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "payment_intent_id": "pi_1234567890",
  "session_id": "660e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "message": "Payment confirmed successfully"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API requests are rate limited to 100 requests per minute per IP address.

## Webhooks

### Stripe Webhooks

The API accepts Stripe webhooks for payment events:

```http
POST /webhooks/stripe
Content-Type: application/json
Stripe-Signature: <signature>

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1234567890",
      "metadata": {
        "session_id": "660e8400-e29b-41d4-a716-446655440000"
      }
    }
  }
}
```
