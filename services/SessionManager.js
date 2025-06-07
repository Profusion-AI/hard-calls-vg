import { randomUUID } from 'crypto';
import WebSocket from 'ws';

export class Session {
  constructor(twilioSocket, callSid) {
    this.id = randomUUID();
    this.callSid = callSid;
    this.twilioSocket = twilioSocket;
    this.elevenLabsSocket = null;
    this.startTime = Date.now();
    this.metrics = {
      messagesFromTwilio: 0,
      messagesFromEL: 0,
      audioFramesSent: 0,
      audioFramesReceived: 0,
      latencyMeasurements: []
    };
    this.jitterBuffer = [];
    this.lastActivity = Date.now();
  }

  async connectToElevenLabs(wsUrl, apiKey) {
    return new Promise((resolve, reject) => {
      this.elevenLabsSocket = new WebSocket(wsUrl, {
        headers: { 'xi-api-key': apiKey }
      });

      const timeout = setTimeout(() => {
        reject(new Error('ElevenLabs connection timeout'));
      }, 10000);

      this.elevenLabsSocket.on('open', () => {
        clearTimeout(timeout);
        console.log(`[${this.id}] Connected to ElevenLabs`);
        this.sendConversationInit();
        resolve();
      });

      this.elevenLabsSocket.on('error', (err) => {
        clearTimeout(timeout);
        console.error(`[${this.id}] ElevenLabs error:`, err);
        reject(err);
      });
    });
  }

  sendConversationInit() {
    if (this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
      this.elevenLabsSocket.send(JSON.stringify({
        type: 'conversation_initiation_client_data',
        conversation_initiation_client_data: {
          conversation_id: this.id,
          call_sid: this.callSid,
          custom_metadata: {
            source: 'twilio',
            session_start: this.startTime
          }
        }
      }));
    }
  }

  forwardToElevenLabs(data) {
    if (this.elevenLabsSocket?.readyState === WebSocket.OPEN) {
      this.elevenLabsSocket.send(data);
      this.metrics.messagesFromTwilio++;
      this.lastActivity = Date.now();
    }
  }

  forwardToTwilio(data) {
    if (this.twilioSocket?.readyState === WebSocket.OPEN) {
      this.twilioSocket.send(data);
      this.metrics.messagesFromEL++;
      this.lastActivity = Date.now();
    }
  }

  recordLatency(latency) {
    this.metrics.latencyMeasurements.push({
      value: latency,
      timestamp: Date.now()
    });
    // Keep only last 100 measurements
    if (this.metrics.latencyMeasurements.length > 100) {
      this.metrics.latencyMeasurements.shift();
    }
  }

  getAverageLatency() {
    if (this.metrics.latencyMeasurements.length === 0) return 0;
    const sum = this.metrics.latencyMeasurements.reduce((a, b) => a + b.value, 0);
    return sum / this.metrics.latencyMeasurements.length;
  }

  cleanup() {
    console.log(`[${this.id}] Cleaning up session`);
    
    if (this.elevenLabsSocket) {
      try {
        this.elevenLabsSocket.send(JSON.stringify({ type: 'close_socket' }));
        this.elevenLabsSocket.close();
      } catch (e) {
        // Socket might already be closed
      }
    }

    if (this.twilioSocket) {
      try {
        this.twilioSocket.close();
      } catch (e) {
        // Socket might already be closed
      }
    }

    // Log final metrics
    console.log(`[${this.id}] Session metrics:`, {
      duration: Date.now() - this.startTime,
      messages: this.metrics,
      avgLatency: this.getAverageLatency()
    });
  }
}

export class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.config = {
      maxSessions: 100,
      sessionTimeout: 300000, // 5 minutes
      cleanupInterval: 60000  // 1 minute
    };

    // Periodic cleanup of stale sessions
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleSessions();
    }, this.config.cleanupInterval);
  }

  createSession(twilioSocket, callSid) {
    if (this.sessions.size >= this.config.maxSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    const session = new Session(twilioSocket, callSid);
    this.sessions.set(session.id, session);
    
    console.log(`[SessionManager] Created session ${session.id}`);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cleanup();
      this.sessions.delete(sessionId);
      console.log(`[SessionManager] Removed session ${sessionId}`);
    }
  }

  cleanupStaleSessions() {
    const now = Date.now();
    const staleIds = [];

    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > this.config.sessionTimeout) {
        staleIds.push(id);
      }
    }

    staleIds.forEach(id => {
      console.log(`[SessionManager] Removing stale session ${id}`);
      this.removeSession(id);
    });

    if (staleIds.length > 0) {
      console.log(`[SessionManager] Cleaned up ${staleIds.length} stale sessions`);
    }
  }

  getMetrics() {
    const metrics = {
      activeSessions: this.sessions.size,
      sessions: []
    };

    for (const [id, session] of this.sessions) {
      metrics.sessions.push({
        id,
        duration: Date.now() - session.startTime,
        avgLatency: session.getAverageLatency(),
        messageCount: session.metrics.messagesFromTwilio + session.metrics.messagesFromEL
      });
    }

    return metrics;
  }

  shutdown() {
    clearInterval(this.cleanupTimer);
    
    // Clean up all sessions
    for (const [id, session] of this.sessions) {
      session.cleanup();
    }
    
    this.sessions.clear();
    console.log('[SessionManager] Shutdown complete');
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  sessionManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  sessionManager.shutdown();
  process.exit(0);
});