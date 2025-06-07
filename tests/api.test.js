const request = require('supertest');
const WebSocket = require('ws');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws/call';

describe('Voice Gateway API Tests', () => {
  let server;
  
  beforeAll(() => {
    // Note: In production, you'd import and start your server here
    // For now, we assume the server is running via npm run dev
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('HTTP Endpoints', () => {
    test('GET /healthz should return ok', async () => {
      const response = await request(BASE_URL)
        .get('/healthz')
        .expect(200);
      
      expect(response.text).toBe('ok');
    });

    test('GET / should return Remix app', async () => {
      const response = await request(BASE_URL)
        .get('/')
        .expect(200);
      
      expect(response.headers['content-type']).toMatch(/html/);
    });
  });

  describe('WebSocket Connection', () => {
    test('Should establish WebSocket connection', (done) => {
      const ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        done();
      });

      ws.on('error', (err) => {
        done(err);
      });
    });

    test('Should handle Twilio start event', (done) => {
      const ws = new WebSocket(`${WS_URL}?callSid=test_${Date.now()}`);
      
      ws.on('open', () => {
        const startEvent = {
          event: 'start',
          start: {
            streamSid: 'test-stream-123',
            callSid: 'test-call-456',
            from: '+1234567890'
          }
        };
        
        ws.send(JSON.stringify(startEvent));
        
        // Give it time to process
        setTimeout(() => {
          ws.close();
          done();
        }, 500);
      });

      ws.on('error', (err) => {
        done(err);
      });
    });

    test('Should handle Twilio media event', (done) => {
      const ws = new WebSocket(`${WS_URL}?callSid=test_${Date.now()}`);
      let receivedResponse = false;
      
      ws.on('open', () => {
        // Send start event first
        ws.send(JSON.stringify({
          event: 'start',
          start: {
            streamSid: 'test-stream-123',
            callSid: 'test-call-456'
          }
        }));
        
        // Then send media
        setTimeout(() => {
          const mediaEvent = {
            event: 'media',
            media: {
              payload: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=', // Silent audio
              timestamp: Date.now()
            }
          };
          
          ws.send(JSON.stringify(mediaEvent));
        }, 1000);
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.event === 'media') {
            receivedResponse = true;
            expect(msg.media).toBeDefined();
            expect(msg.media.payload).toBeDefined();
            ws.close();
            done();
          }
        } catch (e) {
          // Not JSON, ignore
        }
      });

      ws.on('error', (err) => {
        done(err);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!receivedResponse) {
          ws.close();
          done(new Error('No response received from ElevenLabs'));
        }
      }, 5000);
    });

    test('Should handle stop event gracefully', (done) => {
      const ws = new WebSocket(`${WS_URL}?callSid=test_${Date.now()}`);
      
      ws.on('open', () => {
        // Send start
        ws.send(JSON.stringify({
          event: 'start',
          start: { streamSid: 'test-123', callSid: 'test-456' }
        }));
        
        // Send stop
        setTimeout(() => {
          ws.send(JSON.stringify({ event: 'stop' }));
          
          // Check connection closes gracefully
          setTimeout(() => {
            expect(ws.readyState).toBe(WebSocket.CLOSING);
            done();
          }, 500);
        }, 500);
      });

      ws.on('error', (err) => {
        done(err);
      });
    });
  });
});

// Run with: npm test tests/api.test.js