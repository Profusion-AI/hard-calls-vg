import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { createServer } from "http";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, ".env.local") });

// Import call logger
import { callLogger } from "./services/supabase.js";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
});

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("build/client", { maxAge: "1h" }));

app.use(morgan("tiny"));

// Health check endpoint
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// handle SSR requests
app.all("*", remixHandler);

// Create HTTP server
const server = createServer(app);

// Use real ElevenLabs if credentials are available
const EL_ENDPOINT = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID
  ? `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${process.env.ELEVENLABS_AGENT_ID}`
  : "ws://localhost:4001";

/* ---------- Voice Gateway WS ( /ws/call ) ---------- */
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (socket, request) => {
  console.log("🔌  New client connected");
  
  // Extract call ID from request if available
  const url = new URL(request.url, `http://${request.headers.host}`);
  const callSid = url.searchParams.get('callSid') || `call_${Date.now()}`;

  const elSocket = new WebSocket(EL_ENDPOINT, {
    headers: process.env.ELEVENLABS_API_KEY ? {
      'xi-api-key': process.env.ELEVENLABS_API_KEY
    } : {}
  });

  elSocket.on("open", () => {
    console.log("🎶  VG connected to ElevenLabs");
    
    // Send conversation initialization for real ElevenLabs
    if (process.env.ELEVENLABS_API_KEY) {
      const initMessage = {
        type: "conversation_initiation_client_data",
        conversation_initiation_client_data: {
          conversation_id: callSid,
          custom_metadata: {
            source: "twilio",
            timestamp: new Date().toISOString()
          }
        }
      };
      elSocket.send(JSON.stringify(initMessage));
      console.log("📤 Sent conversation init");
    }
  });

  /* Twilio‑side → EL */
  socket.on("message", chunk => {
    try {
      const data = JSON.parse(chunk.toString());
      
      if (data.event === 'media' && data.media?.payload) {
        // Forward audio to ElevenLabs
        const audioMessage = {
          type: "user_audio_chunk",
          user_audio_chunk: data.media.payload // Already base64 μ-law from Twilio
        };
        
        if (elSocket.readyState === 1) {
          elSocket.send(JSON.stringify(audioMessage));
        }
      } else if (data.event === 'start') {
        console.log('📞 Call started:', data.start?.callSid);
        // Log call start in Supabase
        if (data.start?.callSid) {
          callLogger.startCall(data.start.callSid, data.start.from);
        }
      } else if (data.event === 'stop') {
        console.log('📞 Call ended');
        if (elSocket.readyState === 1) {
          elSocket.send(JSON.stringify({ type: 'close_socket' }));
        }
        // Log call end in Supabase
        if (callSid) {
          callLogger.endCall(callSid);
        }
      }
    } catch (err) {
      // If not JSON, might be from mock client
      console.log("↩️  received from client:", chunk.toString().slice(0, 50));
      if (elSocket.readyState === 1) {
        elSocket.send(chunk);
      }
    }
  });

  /* EL → Twilio‑side */
  elSocket.on("message", m => {
    try {
      const event = JSON.parse(m.toString());
      console.log(`📨  EL Event: ${event.type}`);
      
      switch(event.type) {
        case 'conversation_initiated':
          console.log('✅ Conversation initiated');
          break;
          
        case 'audio_event':
          // Forward audio back to Twilio
          if (event.audio_event?.audio_base_64 && socket.readyState === 1) {
            // For real Twilio, wrap in media event
            if (process.env.ELEVENLABS_API_KEY) {
              const twilioMessage = {
                event: "media",
                media: {
                  payload: event.audio_event.audio_base_64
                }
              };
              socket.send(JSON.stringify(twilioMessage));
            } else {
              // For mock client, send as-is
              socket.send(m);
            }
          }
          break;
          
        case 'user_transcript':
          console.log(`🗣️  User: ${event.user_transcript}`);
          // Log user transcript to Supabase
          if (callSid && event.user_transcript) {
            callLogger.logTranscript(callSid, 'user', event.user_transcript);
          }
          break;
          
        case 'agent_response':
          console.log(`🤖 Agent: ${event.agent_response}`);
          // Log agent response to Supabase
          if (callSid && event.agent_response) {
            callLogger.logTranscript(callSid, 'agent', event.agent_response);
          }
          break;
          
        case 'ping_event':
          // Respond with pong
          elSocket.send(JSON.stringify({ type: 'pong_event' }));
          break;
          
        case 'error_event':
          console.error('❌ ElevenLabs error:', event.error_event);
          break;
      }
    } catch (err) {
      console.error('Error parsing ElevenLabs message:', err);
    }
  });

  socket.on("close", () => {
    console.log("❌  Client disconnected");
    if (elSocket.readyState === 1) {
      elSocket.close();
    }
  });

  elSocket.on("close", () => {
    console.log("❌  Mock‑EL disconnected");
  });

  elSocket.on("error", (err) => {
    console.error("❌  Mock‑EL error:", err.message);
  });
});

/* Upgrade HTTP to WS when path === /ws/call */
server.on("upgrade", (req, socket, head) => {
  if (req.url === "/ws/call") {
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`)
);
