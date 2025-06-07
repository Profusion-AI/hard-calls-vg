const WebSocket = require('ws');

console.log('🧪 Testing ElevenLabs connection...');

const ws = new WebSocket('ws://localhost:3000/ws/call?callSid=test_' + Date.now());

ws.on('open', () => {
  console.log('✅ Connected to Voice Gateway');
  
  // Send Twilio-style start event
  ws.send(JSON.stringify({
    event: 'start',
    start: {
      streamSid: 'test-stream-' + Date.now(),
      callSid: 'test_' + Date.now(),
      from: '+1234567890'
    }
  }));
  
  // Wait a bit then send some test audio
  setTimeout(() => {
    console.log('📤 Sending test audio...');
    
    // This is a very short silent μ-law audio sample
    const silentAudio = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=';
    
    ws.send(JSON.stringify({
      event: 'media',
      media: {
        payload: silentAudio,
        timestamp: Date.now()
      }
    }));
  }, 2000);
  
  // End the call after 10 seconds
  setTimeout(() => {
    console.log('📞 Ending test call...');
    ws.send(JSON.stringify({ event: 'stop' }));
    setTimeout(() => {
      ws.close();
      console.log('✅ Test complete!');
    }, 1000);
  }, 10000);
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.event === 'media') {
      console.log('🔊 Received audio from agent (length: ' + msg.media.payload.length + ')');
    } else {
      console.log('📨 Received:', msg);
    }
  } catch (e) {
    console.log('📨 Received non-JSON:', data.toString().substring(0, 100));
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', () => {
  console.log('👋 Connection closed');
  process.exit(0);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping test...');
  ws.close();
  process.exit(0);
});

console.log('💡 Speak to test the agent, or wait 10 seconds for auto-end');