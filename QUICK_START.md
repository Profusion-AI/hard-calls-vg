# 🚀 Quick Start Guide - Next 2 Hours

## 1️⃣ ElevenLabs Setup (30 min)

### Get Started:
```bash
# 1. Sign up at elevenlabs.io
# 2. Choose Creator plan ($22/month)
# 3. Go to Profile → API Keys → Create New
# 4. Save your API key!
```

### Create Your Agent:
1. Go to **Agents** → **Create Agent**
2. Quick settings:
   - Name: `HardCalls Assistant`
   - Voice: Pick from library or clone yours
   - First message: `"Hello, how can I help you today?"`
   - System prompt: `"You are a helpful business assistant making phone calls. Be professional and concise."`
3. **Copy the Agent ID** (looks like: `a1b2c3d4e5f6`)

### Add to .env:
```bash
EL_API_KEY=xi_your_api_key_here
EL_AGENT_ID=your_agent_id_here
```

---

## 2️⃣ Quick Code Update (15 min)

### Install dependencies:
```bash
npm install dotenv
```

### Update server.js:
```javascript
// Add at top
import dotenv from 'dotenv';
dotenv.config();

// Update the Mock EL URL
const MOCK_EL_URL = process.env.EL_ENDPOINT 
  ? `${process.env.EL_ENDPOINT}?agent_id=${process.env.EL_AGENT_ID}`
  : "ws://localhost:4001";

// Update WebSocket creation to add auth
const elSocket = new WebSocket(MOCK_EL_URL, {
  headers: process.env.EL_API_KEY ? {
    'xi-api-key': process.env.EL_API_KEY
  } : {}
});
```

---

## 3️⃣ Test It! (15 min)

### Kill old processes:
```bash
# Stop everything
lsof -ti:3000 | xargs kill -9
lsof -ti:4001 | xargs kill -9
```

### Start the server:
```bash
# Terminal 1
npm run dev
```

### Run test:
```bash
# Terminal 2
echo "test" | websocat ws://localhost:3000/ws/call
```

### Look for in logs:
- ✅ "VG connected to ElevenLabs" (not Mock-EL)
- ✅ Some response from ElevenLabs
- ❌ If error, check API key and agent ID

---

## 4️⃣ Twilio Prep (30 min)

### Create Account:
1. Go to [twilio.com](https://twilio.com)
2. Sign up (free $15 credit)
3. Verify your phone number

### Get Credentials:
1. Dashboard → **Account SID**: `AC...`
2. Dashboard → **Auth Token**: `...`
3. Buy a phone number ($1/month)

### Save for Later:
```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

---

## 5️⃣ Quick Decisions

### Voice Model:
- [ ] **Quick**: Use "Rachel" from ElevenLabs library
- [ ] **Custom**: Record 5 min of your voice
- [ ] **Creative**: Use "Adam" for a professional sound

### Deployment (for tomorrow):
- [ ] **Fly.io** - Best performance, bit more setup
- [ ] **Railway** - Easiest, click to deploy
- [ ] **Render** - Good middle ground

### Monitoring (can wait):
- [ ] **Grafana Cloud** - Free, professional
- [ ] **Console logs** - Fine for MVP
- [ ] **Datadog** - If you have budget

---

## 🎯 Success = 

By end of 2 hours:
1. ✅ ElevenLabs API key in .env
2. ✅ Agent created and ID in .env
3. ✅ Server connects to real ElevenLabs
4. ✅ Twilio account ready
5. ✅ Know which voice you're using

---

## 🆘 Stuck?

### ElevenLabs won't connect:
```bash
# Test your API key
curl -H "xi-api-key: YOUR_KEY" \
  https://api.elevenlabs.io/v1/user
```

### Can't find Agent ID:
- Go to Agents page
- Click your agent
- Look in URL: `/agents/YOUR_AGENT_ID`

### Server crashes:
```bash
# Check what's wrong
npm run dev 2>&1 | grep -i error
```

---

## 📞 Working Test

Once connected, test with:
```javascript
// Save as quick-test.js
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000/ws/call');

ws.on('open', () => {
  console.log('Connected!');
  // Send a simple message
  ws.send(JSON.stringify({
    type: "user_audio_chunk",
    user_audio_chunk: "SGVsbG8gd29ybGQ=" // "Hello world" in base64
  }));
});

ws.on('message', (data) => {
  console.log('Got response!');
  ws.close();
});

// Run with: node quick-test.js
```

---

**Remember**: Getting ElevenLabs connected = 80% of today's work! 🎉