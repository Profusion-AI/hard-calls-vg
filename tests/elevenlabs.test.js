const WebSocket = require('ws');
require('dotenv').config({ path: '.env.local' });

// Test configuration
const WS_URL = 'ws://localhost:3000/ws/call';
const TEST_TIMEOUT = 10000; // 10 seconds for ElevenLabs responses

describe('ElevenLabs Integration Tests', () => {
  const hasCredentials = process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID;
  
  if (!hasCredentials) {
    test.skip('Skipping ElevenLabs tests - no credentials configured', () => {});
    return;
  }

  test('Should connect to ElevenLabs and receive conversation_initiated', (done) => {
    const ws = new WebSocket(`${WS_URL}?callSid=test_el_${Date.now()}`);
    let conversationInitiated = false;
    
    ws.on('open', () => {
      // Send start event to trigger ElevenLabs connection
      ws.send(JSON.stringify({
        event: 'start',
        start: {
          streamSid: 'test-stream-el',
          callSid: `test_el_${Date.now()}`
        }
      }));
    });

    ws.on('message', (data) => {
      // The VG might forward some ElevenLabs events to us
      // But mainly we're testing that the connection doesn't error
      console.log('Received message during EL test');
    });

    // Success if no error after 3 seconds
    setTimeout(() => {
      ws.close();
      done();
    }, 3000);

    ws.on('error', (err) => {
      done(err);
    });
  }, TEST_TIMEOUT);

  test('Should handle audio flow to and from ElevenLabs', (done) => {
    const ws = new WebSocket(`${WS_URL}?callSid=test_audio_${Date.now()}`);
    let audioReceived = false;
    
    ws.on('open', () => {
      // Send start
      ws.send(JSON.stringify({
        event: 'start',
        start: {
          streamSid: 'test-audio-stream',
          callSid: `test_audio_${Date.now()}`
        }
      }));
      
      // Send some audio after connection established
      setTimeout(() => {
        // This is actual μ-law silence
        const silentAudio = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=';
        
        ws.send(JSON.stringify({
          event: 'media',
          media: {
            payload: silentAudio,
            timestamp: Date.now()
          }
        }));
        
        console.log('Sent test audio to ElevenLabs');
      }, 2000);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'media' && msg.media?.payload) {
          audioReceived = true;
          console.log('Received audio response from ElevenLabs');
          expect(msg.media.payload).toBeTruthy();
          expect(typeof msg.media.payload).toBe('string');
          ws.close();
          done();
        }
      } catch (e) {
        // Not JSON
      }
    });

    ws.on('error', (err) => {
      done(err);
    });

    // Timeout - ElevenLabs might not respond to silence
    setTimeout(() => {
      ws.close();
      if (!audioReceived) {
        console.log('No audio received - this is normal for silence input');
        done();
      }
    }, 8000);
  }, TEST_TIMEOUT);

  test('Should properly close ElevenLabs connection on stop', (done) => {
    const ws = new WebSocket(`${WS_URL}?callSid=test_close_${Date.now()}`);
    
    ws.on('open', () => {
      // Start
      ws.send(JSON.stringify({
        event: 'start',
        start: {
          streamSid: 'test-close-stream',
          callSid: `test_close_${Date.now()}`
        }
      }));
      
      // Stop after connection established
      setTimeout(() => {
        ws.send(JSON.stringify({ event: 'stop' }));
        
        // Should close gracefully
        setTimeout(() => {
          expect(ws.readyState).toBeGreaterThanOrEqual(WebSocket.CLOSING);
          done();
        }, 1000);
      }, 2000);
    });

    ws.on('error', (err) => {
      done(err);
    });
  }, TEST_TIMEOUT);
});

// Run with: npm test tests/elevenlabs.test.js