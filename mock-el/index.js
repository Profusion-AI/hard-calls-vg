const { WebSocketServer } = require("ws");

const wss = new WebSocketServer({ port: 4001 }, () =>
  console.log("🎤  Mock EL listening on ws://localhost:4001")
);

wss.on("connection", sock => {
  console.log("New connection to Mock EL");
  let eventId = 1;
  
  // Send initial conversation_initiated event
  setTimeout(() => {
    sock.send(JSON.stringify({
      type: "conversation_initiated",
      conversation_id: `mock_${Date.now()}`
    }));
  }, 100);
  
  sock.on("message", msg => {
    try {
      const data = JSON.parse(msg.toString());
      console.log("EL got:", data.type);
      
      switch(data.type) {
        case "conversation_initiation_client_data":
          console.log("Conversation init received:", data.conversation_initiation_client_data);
          break;
          
        case "user_audio_chunk":
          // Simulate transcription and response
          setTimeout(() => {
            sock.send(JSON.stringify({
              type: "user_transcript",
              user_transcript: "Hello, testing audio"
            }));
          }, 200);
          
          // Simulate agent response
          setTimeout(() => {
            sock.send(JSON.stringify({
              type: "agent_response", 
              agent_response: "I hear you loud and clear!"
            }));
          }, 400);
          
          // Simulate audio response with proper event shape
          setTimeout(() => {
            sock.send(JSON.stringify({
              type: "audio_event",
              audio_event: {
                audio_base_64: Buffer.from("dummy audio data").toString("base64"),
                event_id: eventId++
              }
            }));
          }, 500);
          break;
          
        case "pong_event":
          console.log("Pong received");
          break;
          
        case "close_socket":
          console.log("Close requested");
          sock.close();
          break;
      }
    } catch (err) {
      console.error("Error parsing message:", err);
    }
  });
  
  // Send periodic pings
  const pingInterval = setInterval(() => {
    if (sock.readyState === 1) {
      sock.send(JSON.stringify({ type: "ping_event" }));
    } else {
      clearInterval(pingInterval);
    }
  }, 30000);
  
  sock.on("close", () => {
    console.log("Mock EL connection closed");
    clearInterval(pingInterval);
  });
});