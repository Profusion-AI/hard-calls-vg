# Phase 4: Real ElevenLabs Integration Guide

## Prerequisites
- [ ] ElevenLabs API key
- [ ] ElevenLabs Agent ID
- [ ] Understanding of ElevenLabs ConvAI WebSocket API

## Implementation Steps

### 1. Environment Configuration (10 min)

Create `.env` file:
```bash
# ElevenLabs Configuration
EL_API_KEY=your_api_key_here
EL_AGENT_ID=your_agent_id_here
EL_ENDPOINT=wss://api.elevenlabs.io/v1/convai/conversation

# Server Configuration
PORT=3000
LOG_LEVEL=debug
```

Install dotenv:
```bash
npm install dotenv
```

### 2. Update server.js for Real ElevenLabs (30 min)

```javascript
import dotenv from 'dotenv';
dotenv.config();

// Update the ElevenLabs URL
const EL_ENDPOINT = `${process.env.EL_ENDPOINT}?agent_id=${process.env.EL_AGENT_ID}`;

// Update WebSocket connection with headers
const elSocket = new WebSocket(EL_ENDPOINT, {
  headers: {
    'xi-api-key': process.env.EL_API_KEY
  }
});

// Add conversation initialization
elSocket.on('open', () => {
  console.log("🎶  VG connected to ElevenLabs");
  
  // Send initialization message
  const initMessage = {
    type: "conversation_initiation_client_data",
    conversation_initiation_client_data: {
      conversation_id: `call_${Date.now()}`,
      custom_metadata: {
        source: "twilio",
        timestamp: new Date().toISOString()
      }
    }
  };
  
  elSocket.send(JSON.stringify(initMessage));
});
```

### 3. Handle ElevenLabs Event Types (45 min)

Update message handling to process different event types:

```javascript
elSocket.on('message', m => {
  try {
    const event = JSON.parse(m.toString());
    console.log(`📨  EL Event Type: ${event.type}`);
    
    switch(event.type) {
      case 'conversation_initiated':
        console.log('✅ Conversation initiated with ElevenLabs');
        break;
        
      case 'audio_event':
        // Forward audio back to Twilio
        if (event.audio_event?.audio_base_64 && socket.readyState === 1) {
          // Wrap in Twilio Media format
          const twilioMessage = {
            event: "media",
            media: {
              payload: event.audio_event.audio_base_64
            }
          };
          socket.send(JSON.stringify(twilioMessage));
        }
        break;
        
      case 'user_transcript':
        console.log(`🗣️  User said: ${event.user_transcript}`);
        break;
        
      case 'agent_response':
        console.log(`🤖 Agent says: ${event.agent_response}`);
        break;
        
      case 'interruption_event':
        console.log('⚡ Interruption detected');
        break;
        
      case 'error_event':
        console.error('❌ ElevenLabs error:', event.error_event);
        break;
        
      case 'ping_event':
        // Respond with pong
        elSocket.send(JSON.stringify({ type: 'pong_event' }));
        break;
    }
  } catch (err) {
    console.error('Error parsing ElevenLabs message:', err);
  }
});
```

### 4. Format Audio for ElevenLabs (20 min)

Update Twilio → ElevenLabs forwarding:

```javascript
socket.on('message', chunk => {
  try {
    const data = JSON.parse(chunk.toString());
    
    // Handle Twilio Media Stream events
    if (data.event === 'media' && data.media?.payload) {
      // Forward audio to ElevenLabs
      const audioMessage = {
        type: "user_audio_chunk",
        user_audio_chunk: data.media.payload // Already base64 μ-law
      };
      
      if (elSocket.readyState === 1) {
        elSocket.send(JSON.stringify(audioMessage));
      }
    } else if (data.event === 'start') {
      console.log('📞 Call started:', data.start);
    } else if (data.event === 'stop') {
      console.log('📞 Call ended');
      // Send close_socket to ElevenLabs
      elSocket.send(JSON.stringify({ type: 'close_socket' }));
    }
  } catch (err) {
    console.error('Error parsing Twilio message:', err);
  }
});
```

### 5. Create Enhanced Mock Twilio Client (30 min)

Create `test-twilio-client.js`:

```javascript
const WebSocket = require('ws');
const fs = require('fs');

// Load or create μ-law test audio
const testAudioBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA="; // Silent μ-law

const ws = new WebSocket('ws://localhost:3000/ws/call');

ws.on('open', () => {
  console.log('Connected to VG');
  
  // Send Twilio start event
  ws.send(JSON.stringify({
    event: 'start',
    start: {
      streamSid: 'test-stream-123',
      callSid: 'test-call-456',
      customParameters: {}
    }
  }));
  
  // Send audio chunks
  let count = 0;
  const interval = setInterval(() => {
    if (count++ < 10) {
      ws.send(JSON.stringify({
        event: 'media',
        media: {
          payload: testAudioBase64,
          timestamp: Date.now()
        }
      }));
    } else {
      clearInterval(interval);
      // Send stop event
      ws.send(JSON.stringify({ event: 'stop' }));
      setTimeout(() => ws.close(), 1000);
    }
  }, 100); // Send every 100ms
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.event === 'media') {
    console.log('Received audio chunk, length:', msg.media.payload.length);
  }
});
```

### 6. Test Real ElevenLabs Connection

1. **Set up environment**:
   ```bash
   # Add your real ElevenLabs credentials to .env
   ```

2. **Start the VG**:
   ```bash
   npm run dev
   ```

3. **Run enhanced Mock Twilio client**:
   ```bash
   node test-twilio-client.js
   ```

4. **Monitor logs** for:
   - ✅ Successful ElevenLabs connection
   - ✅ Conversation initiation
   - ✅ Audio chunks being sent
   - ✅ Agent responses received
   - ✅ Audio events with base64 data

### 7. Generate Real μ-law Test Audio (Optional)

To create actual μ-law audio for testing:

```bash
# Record a WAV file
sox -d -r 8000 -c 1 test.wav trim 0 2

# Convert to μ-law
sox test.wav -e u-law -r 8000 -c 1 test-ulaw.wav

# Base64 encode
base64 test-ulaw.wav > test-ulaw.b64
```

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check API key is correct
   - Verify agent_id exists and is accessible

2. **No Audio Response**
   - Check conversation_initiation was sent
   - Verify audio format is correct μ-law
   - Check ElevenLabs agent is configured properly

3. **WebSocket Closes Immediately**
   - Check for error_event messages
   - Verify WebSocket URL format
   - Check API rate limits

### Debug Tips

1. **Add verbose logging**:
   ```javascript
   elSocket.on('message', m => {
     console.log('Raw EL message:', m.toString().substring(0, 200));
     // ... existing handling
   });
   ```

2. **Test with curl first**:
   ```bash
   # Test API key validity
   curl -H "xi-api-key: YOUR_KEY" https://api.elevenlabs.io/v1/user
   ```

3. **Monitor WebSocket state**:
   ```javascript
   setInterval(() => {
     console.log(`EL State: ${elSocket.readyState}`);
   }, 5000);
   ```

## Success Criteria

- [ ] VG connects to real ElevenLabs WebSocket
- [ ] Conversation initialization succeeds
- [ ] Mock Twilio audio is forwarded to ElevenLabs
- [ ] Agent audio responses are received
- [ ] Audio is properly relayed back to Mock Twilio
- [ ] Clean disconnection when call ends

## Next: Phase 5 - Real Twilio

Once Phase 4 is working reliably:
1. Deploy VG to public hosting (Fly.io, Render, etc.)
2. Get SSL certificate (required for wss://)
3. Configure Twilio phone number with TwiML
4. Test with real phone calls!