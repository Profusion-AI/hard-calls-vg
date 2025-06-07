const WebSocket = require('ws');
require('dotenv').config({ path: '.env.local' });

const WS_URL = 'ws://localhost:3000/ws/call';

describe('Performance Tests', () => {
  test('Should measure WebSocket connection latency', (done) => {
    const startTime = Date.now();
    const ws = new WebSocket(`${WS_URL}?callSid=perf_test_${Date.now()}`);
    
    ws.on('open', () => {
      const connectionTime = Date.now() - startTime;
      console.log(`WebSocket connection time: ${connectionTime}ms`);
      expect(connectionTime).toBeLessThan(100); // Should connect in under 100ms
      ws.close();
      done();
    });

    ws.on('error', (err) => {
      done(err);
    });
  });

  test('Should measure round-trip latency', (done) => {
    const ws = new WebSocket(`${WS_URL}?callSid=latency_test_${Date.now()}`);
    let messageSentTime;
    
    ws.on('open', () => {
      // Send start event
      ws.send(JSON.stringify({
        event: 'start',
        start: {
          streamSid: 'latency-test',
          callSid: `latency_test_${Date.now()}`
        }
      }));
      
      // Send media after connection established
      setTimeout(() => {
        messageSentTime = Date.now();
        ws.send(JSON.stringify({
          event: 'media',
          media: {
            payload: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=',
            timestamp: messageSentTime
          }
        }));
      }, 1000);
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'media' && messageSentTime) {
          const roundTripTime = Date.now() - messageSentTime;
          console.log(`Round-trip latency: ${roundTripTime}ms`);
          expect(roundTripTime).toBeLessThan(1000); // Should be under 1 second
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

    // Timeout after 10 seconds
    setTimeout(() => {
      ws.close();
      done(new Error('Performance test timeout'));
    }, 10000);
  });

  test('Should handle multiple concurrent connections', (done) => {
    const connections = [];
    const connectionCount = 5;
    let connectedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(`${WS_URL}?callSid=concurrent_${i}_${Date.now()}`);
      connections.push(ws);
      
      ws.on('open', () => {
        connectedCount++;
        
        // Send start event
        ws.send(JSON.stringify({
          event: 'start',
          start: {
            streamSid: `concurrent-${i}`,
            callSid: `concurrent_${i}_${Date.now()}`
          }
        }));
        
        if (connectedCount === connectionCount) {
          console.log(`All ${connectionCount} connections established`);
          
          // Close all connections
          setTimeout(() => {
            connections.forEach(conn => conn.close());
            expect(errorCount).toBe(0);
            done();
          }, 1000);
        }
      });
      
      ws.on('error', (err) => {
        errorCount++;
        console.error(`Connection ${i} error:`, err.message);
      });
    }
  });

  test('Should measure memory usage', (done) => {
    const initialMemory = process.memoryUsage();
    console.log('Initial memory usage:', {
      heapUsed: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
      external: Math.round(initialMemory.external / 1024 / 1024) + 'MB'
    });
    
    // Create a connection and send some data
    const ws = new WebSocket(`${WS_URL}?callSid=memory_test_${Date.now()}`);
    
    ws.on('open', () => {
      // Send multiple messages
      for (let i = 0; i < 10; i++) {
        ws.send(JSON.stringify({
          event: 'media',
          media: {
            payload: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=',
            timestamp: Date.now()
          }
        }));
      }
      
      setTimeout(() => {
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
        
        console.log('Final memory usage:', {
          heapUsed: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB',
          increase: Math.round(memoryIncrease / 1024 / 1024) + 'MB'
        });
        
        // Memory increase should be reasonable (< 50MB)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
        
        ws.close();
        done();
      }, 2000);
    });
    
    ws.on('error', (err) => {
      done(err);
    });
  });
});

// Run with: npm test tests/performance.test.js