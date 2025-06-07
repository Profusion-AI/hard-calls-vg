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

### Mock ElevenLabs Server
- `cd mock-el && node index.js` - Start the Mock ElevenLabs server on port 4001

### Testing WebSocket
- `websocat ws://localhost:3000/ws/call` - Test WebSocket connection
- `brew install websocat` - Install websocat if not available

## Architecture

### Core Components
1. **Express Server** (`server.js`):
   - Remix app server with Express adapter
   - WebSocket server listening at `/ws/call`
   - Bidirectional relay between Twilio and ElevenLabs

2. **Mock ElevenLabs Server** (`mock-el/index.js`):
   - Simulates ElevenLabs WebSocket API on port 4001
   - Returns dummy audio data for testing

### WebSocket Flow
1. Client connects to `ws://localhost:3000/ws/call`
2. VG creates connection to ElevenLabs (currently Mock EL at `ws://localhost:4001`)
3. Messages from client are forwarded to EL
4. Responses from EL are forwarded back to client
5. Connection cleanup on disconnect

### Key Dependencies
- `ws` - WebSocket implementation
- `@remix-run/express` - Remix Express adapter
- Node.js 20.x LTS required

## Implementation Status

### ✅ Completed
- Phase 1: Basic WebSocket relay setup
- Phase 2: Mock Twilio client capability (via websocat)
- Phase 3: Bridging Mock Twilio ↔ Mock ElevenLabs

### 🚀 Next Steps
- Phase 4: Real ElevenLabs integration
- Phase 5: Real Twilio integration (requires public deployment)

## Key Insight
ElevenLabs supports `audio/x-mulaw @ 8000Hz` natively for Twilio integrations, eliminating the need for audio transcoding in the VG!