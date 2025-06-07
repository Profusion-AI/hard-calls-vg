# Immediate Actions & Setup Guide

## 🎯 Decision Points (Need Today)

### 1. Voice Model Selection
**Action Required**: Choose and create your AI voice

**Option A: Clone Your Voice** (Recommended for authenticity)
- Go to [ElevenLabs Voice Lab](https://elevenlabs.io/voice-lab)
- Record 5-10 minutes of clear speech
- Name it something memorable (e.g., "HardCalls-Kyle")
- **Time**: 30 minutes
- **Cost**: Included in subscription

**Option B: Use Pre-made Voice**
- Browse ElevenLabs voice library
- Pick one that matches your brand
- **Time**: 5 minutes
- **Cost**: Free with subscription

**Decision**: _________________

---

### 2. Deployment Platform
**Action Required**: Choose where to host

**Recommended: Fly.io**
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Sign up (free)
fly auth signup

# Reserve app name
fly apps create hard-calls-vg
```

**Alternative: Railway.app**
- Simpler but slightly higher latency
- One-click deploys from GitHub

**Decision**: _________________

---

### 3. Project Structure
**Action Required**: Decide on repository organization

**Recommended: Keep Current Structure**
- Already set up and working
- Add packages/ later if needed

**Alternative: Restructure Now**
```bash
mkdir -p packages/voice-gateway
mv {server.js,package.json,services} packages/voice-gateway/
```

**Decision**: _________________

---

## 🔧 Service Configurations

### 1. ElevenLabs Setup (30 minutes)

**Step 1: Create Account**
- Go to [elevenlabs.io](https://elevenlabs.io)
- Sign up for Creator plan ($22/month for 30k characters)
- Verify email

**Step 2: Get API Credentials**
1. Go to Profile → API Keys
2. Create new API key
3. Copy and save securely

**Step 3: Create Conversational AI Agent**
1. Navigate to "Agents" → "Create Agent"
2. Configure:
   ```
   Name: HardCalls Assistant
   Voice: [Your selected voice]
   Model: Eleven Turbo v2.5
   System Prompt: "You are a professional assistant making business calls. 
                   Be concise, friendly, and efficient."
   Temperature: 0.7
   ```
3. Copy the Agent ID

**Step 4: Update .env**
```bash
EL_API_KEY=xi_xxxxxxxxxxxxxxxxxxxxx
EL_AGENT_ID=xxxxxxxxxxxxxxxxxxxxx
```

---

### 2. Twilio Setup (45 minutes)

**Step 1: Create Account**
- Go to [twilio.com](https://twilio.com)
- Sign up for free trial ($15 credit)
- Verify phone number

**Step 2: Get Credentials**
1. Dashboard → Account Info
2. Copy Account SID and Auth Token

**Step 3: Buy Phone Number**
```bash
# Using Twilio CLI
twilio phone-numbers:buy:local --country-code US --voice-enabled

# Or via Console
# Phone Numbers → Buy a Number → Select with Voice capability
```

**Step 4: Configure for Later** (Don't do yet - need deployed URL)
```xml
<!-- Save this TwiML for Phase 5 -->
<Response>
  <Connect>
    <Stream url="wss://your-app.fly.dev/ws/call">
      <Parameter name="callSid" value="{{CallSid}}"/>
    </Stream>
  </Connect>
</Response>
```

---

### 3. Monitoring Setup (20 minutes)

**Option A: Grafana Cloud (Recommended)**

1. Sign up at [grafana.com](https://grafana.com) (free tier)
2. Create stack
3. Get credentials:
   ```bash
   # Loki (logs)
   LOKI_URL=https://logs-prod-us-central1.grafana.net
   LOKI_USER=123456
   LOKI_TOKEN=glc_xxxxxxxxxxxx
   
   # Prometheus (metrics) 
   PROM_URL=https://prometheus-prod-us-central1.grafana.net
   PROM_USER=123456
   PROM_TOKEN=glc_xxxxxxxxxxxx
   ```

**Option B: Local Logging Only**
```bash
# Just use local files for now
LOG_DESTINATION=file
LOG_PATH=./logs
```

---

## 📝 Environment Setup

### 1. Create Complete .env File
```bash
# Server Config
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# ElevenLabs
EL_API_KEY=xi_xxxxxxxxxxxxxxxxxxxxx
EL_AGENT_ID=xxxxxxxxxxxxxxxxxxxxx
EL_ENDPOINT=wss://api.elevenlabs.io/v1/convai/conversation

# Twilio (for Phase 5)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890

# Monitoring (optional for now)
GRAFANA_LOKI_URL=
GRAFANA_LOKI_USER=
GRAFANA_LOKI_TOKEN=

# Limits
MAX_CONCURRENT_CALLS=10
MAX_CALL_DURATION_MS=300000
DAILY_COST_LIMIT_USD=50
```

### 2. Install Dependencies
```bash
npm install dotenv pino pino-pretty
```

### 3. Update server.js Imports
```javascript
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});
```

---

## 🚀 Today's Implementation Steps

### Phase 4.1: Basic ElevenLabs Integration (1 hour)

1. **Update server.js with real EL connection**:
```javascript
import { sessionManager } from './services/SessionManager.js';

// In your WebSocket handler
wss.on("connection", async (socket, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const callSid = url.searchParams.get('callSid') || `test_${Date.now()}`;
  
  try {
    const session = sessionManager.createSession(socket, callSid);
    await session.connectToElevenLabs(
      `${process.env.EL_ENDPOINT}?agent_id=${process.env.EL_AGENT_ID}`,
      process.env.EL_API_KEY
    );
    
    // Wire up the forwarding
    socket.on('message', data => session.forwardToElevenLabs(data));
    session.elevenLabsSocket.on('message', data => session.forwardToTwilio(data));
    
    socket.on('close', () => sessionManager.removeSession(session.id));
  } catch (error) {
    logger.error({ error, callSid }, 'Failed to establish session');
    socket.close();
  }
});
```

2. **Test with Mock Twilio Client**:
```bash
# Terminal 1
npm run dev

# Terminal 2  
node test-twilio-client.js
```

3. **Verify in logs**:
- ✅ "Connected to ElevenLabs"
- ✅ "Conversation initiated"
- ✅ Audio events received

---

## 📊 Success Metrics for Today

By end of day, you should have:

1. **Decisions Made**:
   - [ ] Voice model created/selected
   - [ ] Deployment platform chosen
   - [ ] Repository structure decided

2. **Services Configured**:
   - [ ] ElevenLabs account with API key
   - [ ] Conversational AI agent created
   - [ ] Twilio account ready (not connected yet)
   - [ ] Monitoring solution chosen

3. **Code Working**:
   - [ ] Real ElevenLabs connection successful
   - [ ] Audio flowing bidirectionally
   - [ ] Session management implemented
   - [ ] Structured logging active

---

## 🚨 Common Issues & Solutions

### ElevenLabs Connection Fails
```bash
# Check API key is valid
curl -H "xi-api-key: YOUR_KEY" https://api.elevenlabs.io/v1/user

# Check agent exists
curl -H "xi-api-key: YOUR_KEY" https://api.elevenlabs.io/v1/convai/agents
```

### No Audio Response
- Verify conversation_initiation_client_data was sent
- Check agent configuration in ElevenLabs dashboard
- Ensure voice model is properly assigned to agent

### WebSocket Closes Immediately
- Look for error_event in logs
- Check daily/monthly limits haven't been exceeded
- Verify agent_id is correct

---

## 📞 Quick Test Script

Create `test-phase4.js`:
```javascript
const WebSocket = require('ws');

async function testElevenLabs() {
  console.log('🧪 Testing ElevenLabs connection...');
  
  const ws = new WebSocket('ws://localhost:3000/ws/call?callSid=test123');
  
  ws.on('open', () => {
    console.log('✅ Connected to VG');
    
    // Send Twilio start event
    ws.send(JSON.stringify({
      event: 'start',
      start: { streamSid: 'test', callSid: 'test123' }
    }));
    
    // Send some audio after a delay
    setTimeout(() => {
      ws.send(JSON.stringify({
        event: 'media',
        media: {
          payload: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA='
        }
      }));
    }, 1000);
  });
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('📨 Received:', msg.event || msg.type);
  });
  
  ws.on('error', (err) => console.error('❌ Error:', err));
  ws.on('close', () => console.log('👋 Connection closed'));
}

testElevenLabs();
```

Run with: `node test-phase4.js`

---

## 📅 Timeline for Today

**Morning (2 hours)**
1. Make key decisions
2. Set up ElevenLabs account
3. Create voice model
4. Get API credentials

**Afternoon (2 hours)**
1. Implement SessionManager integration
2. Test real ElevenLabs connection
3. Verify audio flow
4. Document any issues

**Evening (1 hour)**
1. Set up Twilio account
2. Choose monitoring solution
3. Plan tomorrow's Phase 5 work

---

Ready to start? The first step is getting those ElevenLabs credentials! 🚀