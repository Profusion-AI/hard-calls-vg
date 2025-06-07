const WebSocket = require('ws');

console.log('Testing Voice Gateway connection...\n');

const ws = new WebSocket('ws://localhost:3000/ws/call?callSid=test_' + Date.now());

ws.on('open', () => {
  console.log('✅ Connected to Voice Gateway');
  
  // Send a simple start event
  const startEvent = {
    event: 'start',
    start: {
      streamSid: 'test-stream',
      callSid: 'test-' + Date.now(),
      from: '+1234567890'
    }
  };
  
  console.log('📤 Sending start event...');
  ws.send(JSON.stringify(startEvent));
  
  // Close after 3 seconds
  setTimeout(() => {
    console.log('📞 Ending test...');
    ws.send(JSON.stringify({ event: 'stop' }));
    setTimeout(() => {
      ws.close();
      console.log('✅ Test completed');
      process.exit(0);
    }, 500);
  }, 3000);
});

ws.on('message', (data) => {
  console.log('📨 Received:', data.toString().substring(0, 100) + '...');
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('👋 Connection closed');
});