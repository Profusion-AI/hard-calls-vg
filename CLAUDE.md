# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Voice Gateway (VG) for Twilio-ElevenLabs Integration

This is a WebSocket relay server that connects Twilio phone calls to ElevenLabs' Conversational AI.

## Commands

### Development
- `npm run dev` - Start the development server (Express + Remix)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Testing WebSocket
- `node test-elevenlabs.js` - Test ElevenLabs connection
- `websocat ws://localhost:3000/ws/call` - Manual WebSocket testing
- `brew install websocat` - Install websocat if not available

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
- Node.js 20.x LTS required

## Implementation Status

### ✅ Completed
- Phase 1-3: Basic WebSocket relay setup
- Phase 4: Real ElevenLabs integration
- Database integration with Supabase
- Production-ready error handling

### 🚀 Next Steps
- Deploy to Fly.io for public WebSocket endpoint
- Configure Twilio phone number with TwiML
- Production testing with real phone calls

## Key Insight
ElevenLabs supports `audio/x-mulaw @ 8000Hz` natively for Twilio integrations, eliminating the need for audio transcoding in the VG!