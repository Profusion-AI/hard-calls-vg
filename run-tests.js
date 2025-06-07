#!/usr/bin/env node

const { spawn } = require('child_process');
const WebSocket = require('ws');

console.log('🧪 Voice Gateway Test Suite\n');

// Check if server is running
function checkServer() {
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3000/ws/call');
    
    ws.on('open', () => {
      ws.close();
      resolve(true);
    });
    
    ws.on('error', () => {
      resolve(false);
    });
  });
}

async function runTests() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('⚠️  Server not running at localhost:3000');
    console.log('Please start the server with: npm run dev\n');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  // Run tests in sequence
  const testSuites = [
    { name: 'API Tests', cmd: 'npm', args: ['run', 'test:api'] },
    { name: 'ElevenLabs Integration', cmd: 'npm', args: ['run', 'test:elevenlabs'] },
    { name: 'Supabase Integration', cmd: 'npm', args: ['run', 'test:supabase'] },
    { name: 'Performance Tests', cmd: 'npm', args: ['run', 'test:performance'] }
  ];
  
  for (const suite of testSuites) {
    console.log(`\n📋 Running ${suite.name}...\n`);
    
    await new Promise((resolve) => {
      const proc = spawn(suite.cmd, suite.args, { stdio: 'inherit' });
      proc.on('close', resolve);
    });
  }
  
  console.log('\n✅ All tests completed!\n');
}

runTests().catch(console.error);