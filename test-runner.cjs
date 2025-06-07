#!/usr/bin/env node

const request = require('supertest');
const WebSocket = require('ws');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws/call';

console.log('🧪 Running Voice Gateway API Tests\n');

// Test results
let passed = 0;
let failed = 0;

async function runTest(name, testFn) {
  process.stdout.write(`  ${name}... `);
  try {
    await testFn();
    console.log('✅');
    passed++;
  } catch (error) {
    console.log('❌');
    console.error(`    Error: ${error.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('📋 HTTP Endpoints\n');
  
  // Test health check
  await runTest('GET /healthz returns ok', async () => {
    const response = await request(BASE_URL).get('/healthz');
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
    if (response.text !== 'ok') throw new Error(`Expected 'ok', got '${response.text}'`);
  });

  // Test home page
  await runTest('GET / returns HTML', async () => {
    const response = await request(BASE_URL).get('/');
    if (response.status !== 200) throw new Error(`Status ${response.status}`);
    if (!response.headers['content-type'].includes('html')) {
      throw new Error('Expected HTML content type');
    }
  });

  console.log('\n📋 WebSocket Connection\n');

  // Test WebSocket connection
  await runTest('WebSocket connects successfully', () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      
      ws.on('error', reject);
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });

  // Test Twilio start event
  await runTest('Handles Twilio start event', () => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WS_URL}?callSid=test_${Date.now()}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          event: 'start',
          start: {
            streamSid: 'test-stream',
            callSid: 'test-call',
            from: '+1234567890'
          }
        }));
        
        setTimeout(() => {
          ws.close();
          resolve();
        }, 500);
      });
      
      ws.on('error', reject);
    });
  });

  // Test ElevenLabs connection (if credentials available)
  if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID) {
    console.log('\n📋 ElevenLabs Integration\n');
    
    await runTest('Connects to ElevenLabs API', () => {
      return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}?callSid=el_test_${Date.now()}`);
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            event: 'start',
            start: { streamSid: 'el-test', callSid: `el_${Date.now()}` }
          }));
          
          // Wait for connection to establish
          setTimeout(() => {
            ws.close();
            resolve();
          }, 3000);
        });
        
        ws.on('error', reject);
        
        setTimeout(() => reject(new Error('ElevenLabs connection timeout')), 10000);
      });
    });
  } else {
    console.log('\n⚠️  Skipping ElevenLabs tests (no credentials)\n');
  }

  console.log('\n📋 Performance Metrics\n');

  // Measure connection latency
  await runTest('WebSocket latency < 100ms', async () => {
    const start = Date.now();
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(WS_URL);
      ws.on('open', () => {
        ws.close();
        resolve();
      });
      ws.on('error', reject);
    });
    const latency = Date.now() - start;
    console.log(`    (${latency}ms)`);
    if (latency > 100) throw new Error(`Latency too high: ${latency}ms`);
  });

  // Test concurrent connections
  await runTest('Handles 5 concurrent connections', () => {
    return new Promise((resolve, reject) => {
      const connections = [];
      let connected = 0;
      
      for (let i = 0; i < 5; i++) {
        const ws = new WebSocket(`${WS_URL}?callSid=concurrent_${i}`);
        connections.push(ws);
        
        ws.on('open', () => {
          connected++;
          if (connected === 5) {
            connections.forEach(conn => conn.close());
            resolve();
          }
        });
        
        ws.on('error', reject);
      }
      
      setTimeout(() => reject(new Error('Concurrent connection timeout')), 5000);
    });
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ Passed: ${passed}`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed}`);
  }
  console.log(`\n📊 Total: ${passed + failed} tests\n`);
  
  process.exit(failed > 0 ? 1 : 0);
}

// Check if server is running first
const checkWs = new WebSocket(WS_URL);

checkWs.on('error', () => {
  console.error('❌ Server not running at localhost:3000');
  console.error('   Please start with: npm run dev\n');
  process.exit(1);
});

checkWs.on('open', () => {
  checkWs.close();
  console.log('✅ Server is running at localhost:3000\n');
  runTests().catch(console.error);
});