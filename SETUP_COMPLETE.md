# Setup Complete! 🎉

## What's Been Done

### 1. ElevenLabs Integration ✅
- Real ElevenLabs WebSocket connection configured
- Agent ID: `agent_01jx3sm9zreg0t5cfvv40zvd5d`
- Proper authentication with API key
- All event types handled (audio, transcripts, errors)

### 2. Supabase Integration ✅
- Database schema created for:
  - `calls` - Track all call sessions
  - `transcripts` - Store conversation history
  - `audio_files` - Reference uploaded audio
- Storage bucket configured:
  - Bucket: `hardcalls`
  - Allowed MIME types: `audio/*`, `application/octet-stream`
  - Max file size: 10MB

### 3. Fly.io Configuration ✅
- `fly.toml` created with proper settings
- Health check endpoint at `/healthz`
- Configured for WebSocket support
- Region: `iad` (US East - close to Twilio)

## Testing the Setup

### 1. Start the server:
```bash
# Kill any old processes
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:4001 | xargs kill -9 2>/dev/null || true

# Start the VG
npm run dev
```

### 2. Test ElevenLabs connection:
```bash
node test-elevenlabs.js
```

You should see:
- ✅ Connection to ElevenLabs
- ✅ Conversation initiated
- 🔊 Audio responses from your agent
- 🗣️ Transcripts in the console

### 3. Check Supabase (optional):
```sql
-- In Supabase SQL editor
SELECT * FROM calls ORDER BY created_at DESC LIMIT 10;
SELECT * FROM transcripts ORDER BY created_at DESC LIMIT 20;
```

## Setting Up Supabase Storage

1. Go to your Supabase dashboard
2. Navigate to **Storage** → **Create new bucket**
3. Name: `hardcalls`
4. Public: No (keep it private)
5. After creation, click bucket → **Policies** → **New policy**
6. Use "Custom policy" and allow all operations for service role

## Deploying to Fly.io

### 1. First-time setup:
```bash
# Install Fly CLI if you haven't
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create the app
fly apps create hard-calls-vg
```

### 2. Set secrets:
```bash
# Copy values from your .env.local file
fly secrets set \
  ELEVENLABS_API_KEY="your_elevenlabs_api_key" \
  ELEVENLABS_AGENT_ID="your_agent_id" \
  TWILIO_ACCOUNT_SID="your_twilio_account_sid" \
  TWILIO_AUTH_TOKEN="your_twilio_auth_token" \
  NEXT_PUBLIC_SUPABASE_URL="your_supabase_url" \
  SUPABASE_SERVICE_KEY="your_supabase_service_key"
```

### 3. Deploy:
```bash
fly deploy
```

### 4. Get your WebSocket URL:
```bash
fly status
# Your URL will be: wss://hard-calls-vg.fly.dev/ws/call
```

## Configuring Twilio (Phase 5)

Once deployed, configure your Twilio phone number with this TwiML:

```xml
<Response>
  <Connect>
    <Stream url="wss://hard-calls-vg.fly.dev/ws/call">
      <Parameter name="callSid" value="{{CallSid}}"/>
    </Stream>
  </Connect>
</Response>
```

## Current Architecture

```
[Twilio Phone] <--wss--> [Voice Gateway on Fly.io] <--wss--> [ElevenLabs ConvAI]
                                    |
                                    v
                            [Supabase Database]
                            - Call records
                            - Transcripts
                            - Audio files (S3)
```

## Environment Variables Summary

```env
# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_AGENT_ID=your_agent_id

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## What's Next?

1. **Test locally** with `test-elevenlabs.js`
2. **Deploy to Fly.io** to get public WebSocket URL
3. **Configure Twilio** phone number with TwiML
4. **Make your first real call!** 📞

## Troubleshooting

### ElevenLabs not connecting?
- Check API key is valid
- Verify agent ID exists
- Look for error_event in logs

### Supabase not logging?
- Check service key is correct
- Verify tables exist (run schema.sql)
- Check logs for specific errors

### Fly.io deployment issues?
- Ensure all secrets are set
- Check logs: `fly logs`
- Verify health check: `curl https://hard-calls-vg.fly.dev/healthz`

---

Ready for your first real call! 🚀