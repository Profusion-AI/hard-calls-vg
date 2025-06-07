# Technical Review & Refinements

## Phase-by-Phase Refinements

### Phase 1: Mock ElevenLabs ✅
**Refinement**: Emit real ConvAI event shapes

Update `mock-el/index.js`:
```javascript
// Instead of generic response, use real ElevenLabs event format
sock.send(JSON.stringify({
  type: "audio_event",
  audio_event: {
    audio_base_64: Buffer.from("dummy").toString("base64"),
    event_id: Date.now()
  }
}));
```

### Phase 2: Mock Twilio Client ✅
**Refinement**: Send binary frames like real Twilio

Create `mock-twilio/client.js`:
```javascript
// Send as binary Buffer, not JSON strings
const audioBuffer = Buffer.from(muLawData, 'base64');
ws.send(audioBuffer, { binary: true });
```

### Phase 3: Wire-up Relay ✅
**Refinement**: Elevate session management

Create `services/SessionManager.js`:
```javascript
class Session {
  constructor(twilioSocket, callId) {
    this.twilioSocket = twilioSocket;
    this.elevenLabsSocket = null;
    this.callId = callId;
    this.startTime = Date.now();
    this.logger = logger.child({ callId });
  }
  
  async connectToElevenLabs() {
    // Connection logic with logging
  }
  
  cleanup() {
    // Graceful cleanup of both sockets
  }
}

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }
  
  createSession(twilioSocket, callId) {
    const session = new Session(twilioSocket, callId);
    this.sessions.set(callId, session);
    return session;
  }
  
  // Metrics, cleanup, etc.
}
```

### Phase 4: Real ElevenLabs ✅
**Refinement**: Handle ALL ConvAI events

```javascript
const eventHandlers = {
  'audio_event': (session, event) => {
    // Forward audio
  },
  'user_transcript': (session, event) => {
    session.logger.info({ transcript: event.user_transcript });
  },
  'agent_response': (session, event) => {
    session.logger.info({ response: event.agent_response });
  },
  'interruption_event': (session, event) => {
    session.logger.warn('Interruption detected');
  },
  'ping_event': (session, event) => {
    session.elevenLabsSocket.send(JSON.stringify({ type: 'pong_event' }));
    session.lastPingRTT = Date.now() - session.lastPingTime;
  },
  'error_event': (session, event) => {
    session.logger.error({ error: event });
  }
};
```

### Phase 5: Real Twilio ✅
**Refinement**: Add jitter buffer

```javascript
class JitterBuffer {
  constructor(targetDelayMs = 80) {
    this.buffer = [];
    this.targetDelay = targetDelayMs;
  }
  
  push(frame, timestamp) {
    this.buffer.push({ frame, timestamp });
    this.buffer.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  pop() {
    const now = Date.now();
    const target = now - this.targetDelay;
    
    while (this.buffer.length > 0 && this.buffer[0].timestamp <= target) {
      return this.buffer.shift().frame;
    }
    return null;
  }
}
```

## Extra Implementation Safeguards

### 1. Back-pressure Management
```javascript
class AudioBuffer {
  constructor(maxDurationMs = 1000) {
    this.queue = [];
    this.maxSize = maxDurationMs / 20; // 20ms frames
  }
  
  push(frame) {
    if (this.queue.length >= this.maxSize) {
      logger.warn('Buffer overflow, dropping oldest frame');
      this.queue.shift();
    }
    this.queue.push(frame);
  }
}
```

### 2. Structured Logging Setup
```bash
npm install pino pino-pretty
```

```javascript
import pino from 'pino';

const logger = pino({
  base: {
    service: 'voice-gateway',
    version: process.env.npm_package_version
  },
  formatters: {
    level: (label) => ({ level: label })
  }
});

// Per-call logger
const callLogger = logger.child({ callId: generateCallId() });
```

### 3. Health Probe Implementation
```javascript
app.get('/healthz', async (req, res) => {
  const checks = {
    server: 'up',
    timestamp: new Date().toISOString()
  };
  
  try {
    // Test ElevenLabs connectivity
    const ws = new WebSocket(process.env.EL_ENDPOINT);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
    ws.close();
    checks.elevenLabs = 'reachable';
  } catch (e) {
    checks.elevenLabs = 'unreachable';
    res.status(503);
  }
  
  res.json(checks);
});
```

### 4. Kill-switch Metrics
```javascript
class LatencyTracker {
  constructor(threshold = 500, window = 300000) { // 5 min
    this.measurements = [];
    this.threshold = threshold;
    this.window = window;
  }
  
  record(latency) {
    this.measurements.push({ latency, time: Date.now() });
    this.cleanup();
    
    if (this.getP95() > this.threshold) {
      logger.error('Latency threshold exceeded, disabling new calls');
      process.env.ACCEPT_NEW_CALLS = 'false';
    }
  }
  
  getP95() {
    const sorted = this.measurements
      .map(m => m.latency)
      .sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index] || 0;
  }
  
  cleanup() {
    const cutoff = Date.now() - this.window;
    this.measurements = this.measurements.filter(m => m.time > cutoff);
  }
}