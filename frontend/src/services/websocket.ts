import { config } from '../config';

export interface WSMessage {
  type: string;
  session_id?: string;
  data?: any;
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
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private isConnected = false;

  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  connect(clientId: string, userId: string, sessionId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `${config.ws.baseUrl}?client_id=${clientId}&user_id=${userId}${sessionId ? `&session_id=${sessionId}` : ''}`;
        
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
          
          // Attempt to reconnect if not a manual disconnect
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect(clientId, userId, sessionId);
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

  private attemptReconnect(clientId: string, userId: string, sessionId?: string) {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect(clientId, userId, sessionId).catch((error) => {
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

  private triggerHandler(type: string, data: any) {
    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(data);
    }
  }

  on(messageType: string, handler: (data: any) => void) {
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

  notifySessionCompleted(sessionId: string, sessionData: any) {
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
