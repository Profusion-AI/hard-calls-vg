const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 4001 }, () =>
  console.log("🎤  Mock EL listening on ws://localhost:4001")
);

wss.on("connection", sock => {
  sock.on("message", msg => {
    console.log("EL got:", msg.toString().slice(0, 50));
    // Simulate an audio chunk:
    sock.send(
      JSON.stringify({
        type: "audio",
        audio_event: { audio_base_64: Buffer.from("dummy").toString("base64") },
      })
    );
  });
});