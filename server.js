import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { createServer } from "http";

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

// handle SSR requests
app.all("*", remixHandler);

// Create HTTP server
const server = createServer(app);

const MOCK_EL_URL = "ws://localhost:4001";

/* ---------- Voice Gateway WS ( /ws/call ) ---------- */
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", socket => {
  console.log("🔌  New client connected");

  const elSocket = new WebSocket(MOCK_EL_URL);

  elSocket.on("open", () => console.log("🎶  VG connected to Mock‑EL"));

  /* Twilio‑side → EL */
  socket.on("message", chunk => {
    console.log("↩️  received from client:", chunk.toString().slice(0, 50));
    if (elSocket.readyState === 1) {
      elSocket.send(chunk);
    }
  });

  /* EL → Twilio‑side */
  elSocket.on("message", m => {
    console.log("📨  received from Mock‑EL:", m.toString().slice(0, 50));
    if (socket.readyState === 1) {
      socket.send(m);
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
