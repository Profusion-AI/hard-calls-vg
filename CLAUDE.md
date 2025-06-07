# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Voice Gateway (VG) for Twilio-ElevenLabs Integration

This is a production-ready WebSocket relay server that connects Twilio phone calls to ElevenLabs' Conversational AI.

## Recent Updates (Phase 4 Completed)

### ElevenLabs Integration ✅
- Successfully integrated with real ElevenLabs Conversational AI API
- Agent ID: `agent_01jx3sm9zreg0t5cfvv40zvd5d` configured
- WebSocket connection established with proper authentication
- All event types handled: audio, transcripts, pings, errors
- Verified connection with live ping/pong events

### Supabase Integration ✅
- Database schema created for calls, transcripts, and audio files
- Call logging service implemented
- Storage bucket configured for audio files (audio/*, application/octet-stream)
- Automatic transcript logging for conversation history

### Production Refinements ✅
- Removed all mock components (mock-el directory deleted)
- Standardized to spell out "ElevenLabs" throughout codebase
- Added comprehensive test suites (API, integration, performance)
- Health check endpoint at `/healthz`
- Environment-based configuration with `.env.local`

## Commands

### Development
- `npm run dev` - Start the development server (Express + Remix)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Testing
- `npm test` - Run all tests
- `npm run test:api` - Test API endpoints
- `npm run test:elevenlabs` - Test ElevenLabs integration
- `npm run test:performance` - Run performance tests
- `node test-elevenlabs.cjs` - Quick ElevenLabs connection test
- `node test-runner.cjs` - Comprehensive test suite
- `websocat ws://localhost:3000/ws/call` - Manual WebSocket testing

## Architecture

### Core Components
1. **Express Server** (`server.js`):
   - Remix app server with Express adapter
   - WebSocket server listening at `/ws/call`
   - Bidirectional relay between Twilio and ElevenLabs

2. **ElevenLabs Integration**:
   - Direct connection to ElevenLabs Conversational AI
   - Uses agent ID: Configured via ELEVENLABS_AGENT_ID
   - Handles all event types: audio, transcripts, errors

### WebSocket Flow
1. Twilio connects to `wss://your-domain/ws/call`
2. VG creates connection to ElevenLabs API (`wss://api.elevenlabs.io`)
3. Audio from Twilio is forwarded to ElevenLabs
4. Agent responses are forwarded back to Twilio
5. Transcripts and metadata logged to Supabase
6. Graceful cleanup on disconnect

### Key Dependencies
- `ws` - WebSocket implementation
- `@remix-run/express` - Remix Express adapter
- `@supabase/supabase-js` - Database and storage client
- `dotenv` - Environment variable management
- Node.js 20.x LTS required

### Environment Variables Required
```env
# ElevenLabs
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_AGENT_ID=your_agent_id

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

## Implementation Status

### ✅ Completed (All Pre-Production Phases)
- Phase 1-3: WebSocket relay architecture
- Phase 4: Real ElevenLabs integration with live connection verified
- Database integration with Supabase (calls, transcripts, audio storage)
- Comprehensive test suite (API, integration, performance)
- Production-ready error handling and logging
- Environment-based configuration
- Health monitoring endpoints

### 🚀 Ready for Phase 5: Deployment
1. Deploy to Fly.io: `fly deploy`
2. Get public WebSocket URL: `wss://hard-calls-vg.fly.dev/ws/call`
3. Configure Twilio phone number with TwiML:
   ```xml
   <Response>
     <Connect>
       <Stream url="wss://hard-calls-vg.fly.dev/ws/call">
         <Parameter name="callSid" value="{{CallSid}}"/>
       </Stream>
     </Connect>
   </Response>
   ```
4. Make first production call!

## Key Insights

1. **No Transcoding Needed**: ElevenLabs supports `audio/x-mulaw @ 8000Hz` natively for Twilio
2. **Thin Relay Pattern**: VG is purely a WebSocket bridge with minimal processing
3. **Production Verified**: ElevenLabs connection tested and receiving live events

## Important Files

- `server.js` - Main Voice Gateway implementation
- `services/supabase.js` - Database logging service
- `services/SessionManager.js` - Session management (ready for integration)
- `supabase/schema.sql` - Database schema
- `fly.toml` - Deployment configuration
- `.env.local` - Local environment variables (git-ignored)
- `TEST_RESULTS.md` - Comprehensive test results

## Troubleshooting

1. **ElevenLabs Connection Issues**
   - Check API key is valid
   - Verify agent ID exists
   - Look for `conversation_initiation_metadata` in logs

2. **WebSocket Issues**
   - Ensure server is running: `npm run dev`
   - Check health: `curl http://localhost:3000/healthz`
   - Test WebSocket: `websocat ws://localhost:3000/ws/call`

3. **Supabase Issues**
   - Verify service key has proper permissions
   - Check tables exist with `supabase/schema.sql`
   - Ensure storage bucket 'hardcalls' exists