import { config } from '../config';

export interface WSMessage {
  type: string;
  session_id?: string;
  data?: unknown;
  error?: string;
}

export interface WSClient {
  id: string;
  userId: string;
  sessionId: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second
  private messageHandlers: Map<string, (data: unknown) => void> = new Map();
  private isConnected = false;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  // connect opens an authenticated WebSocket. The backend authenticates the
  // upgrade with the JWT (passed as a query param because browser WebSocket
  // clients cannot set headers) and derives the user from the token, so no
  // user_id is sent from the client.
  connect(sessionId?: string, clientId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        reject(new Error('Cannot open WebSocket: not authenticated'));
        return;
      }

      try {
        const params = new URLSearchParams({ token });
        if (clientId) params.set('client_id', clientId);
        if (sessionId) params.set('session_id', sessionId);
        const wsUrl = `${config.ws.baseUrl}?${params.toString()}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;

          // Attempt to reconnect if not a manual disconnect.
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(sessionId, clientId);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(sessionId?: string, clientId?: string) {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect(sessionId, clientId).catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
      this.isConnected = false;
    }
  }

  send(message: WSMessage) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Cannot send message:', message);
    }
  }

  private handleMessage(message: WSMessage) {
    console.log('Received WebSocket message:', message);

    // Handle specific message types
    switch (message.type) {
      case 'connected':
        console.log('Connected to WebSocket server');
        break;
      
      case 'session_joined':
        console.log('Joined session:', message.session_id);
        break;
      
      case 'question_started':
        this.triggerHandler('question_started', message.data);
        break;
      
      case 'response_submitted':
        this.triggerHandler('response_submitted', message.data);
        break;
      
      case 'session_completed':
        this.triggerHandler('session_completed', message.data);
        break;
      
      case 'pong':
        console.log('Received pong from server');
        break;
      
      case 'echo':
        console.log('Echo from server:', message.data);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }

    // Trigger generic message handler
    this.triggerHandler('message', message);
  }

  private triggerHandler(type: string, data: unknown) {
    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(data);
    }
  }

  on(messageType: string, handler: (data: unknown) => void) {
    this.messageHandlers.set(messageType, handler);
  }

  off(messageType: string) {
    this.messageHandlers.delete(messageType);
  }

  // Convenience methods for common operations
  joinSession(sessionId: string) {
    this.send({
      type: 'join_session',
      session_id: sessionId,
    });
  }

  notifyQuestionStarted(sessionId: string, questionId: string) {
    this.send({
      type: 'question_started',
      session_id: sessionId,
      data: { question_id: questionId },
    });
  }

  notifyResponseSubmitted(sessionId: string, responseId: string) {
    this.send({
      type: 'response_submitted',
      session_id: sessionId,
      data: { response_id: responseId },
    });
  }

  notifySessionCompleted(sessionId: string, sessionData: unknown) {
    this.send({
      type: 'session_completed',
      session_id: sessionId,
      data: sessionData,
    });
  }

  ping() {
    this.send({
      type: 'ping',
      data: { timestamp: new Date().toISOString() },
    });
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const wsService = new WebSocketService();
export default wsService;
