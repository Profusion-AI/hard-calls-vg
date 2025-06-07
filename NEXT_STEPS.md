# Next Steps for Voice Gateway

## 🎯 Immediate Actions (Today/Tomorrow)

### 1. Add Health Check Endpoint (15 min)
```javascript
// In server.js, before the catch-all remix handler
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});
```

### 2. Environment Variables (30 min)
```bash
npm install dotenv
```

Create `.env`:
```
PORT=3000
EL_ENDPOINT=ws://localhost:4001
LOG_LEVEL=debug
```

Update server.js to use `process.env.EL_ENDPOINT`

### 3. Basic Status Endpoint (20 min)
```javascript
let activeConnections = 0;

app.get("/status", (req, res) => {
  res.json({
    status: "healthy",
    activeConnections,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```

## 📋 This Week's Goals

### 4. Real ElevenLabs Integration (2-3 hours)
- [ ] Get ElevenLabs API key
- [ ] Read their WebSocket API docs
- [ ] Update connection to include headers:
```javascript
const elSocket = new WebSocket(process.env.EL_ENDPOINT, {
  headers: {
    'xi-api-key': process.env.EL_API_KEY
  }
});
```
- [ ] Send initialization message after connection
- [ ] Handle their specific event types

### 5. Better Logging (1 hour)
```bash
npm install winston
```
- [ ] Replace console.log with structured logging
- [ ] Add timestamp, level, and context to logs
- [ ] Log all WebSocket events with session IDs

### 6. Basic Error Handling (1 hour)
- [ ] Try-catch around WebSocket operations
- [ ] Reconnection attempt for ElevenLabs
- [ ] Graceful error messages to clients

## 🚀 Next Sprint (Week 2)

### 7. Twilio Integration
- [ ] Create `/voice` endpoint for Twilio webhooks
- [ ] Return TwiML with Stream directive
- [ ] Parse Twilio's media stream events
- [ ] Test with Twilio test account

### 8. Audio Format Handling
- [ ] Determine if transcoding is needed
- [ ] Test with real audio streams
- [ ] Measure latency impact

## 💡 Quick Improvements (Anytime)

1. **TypeScript**: Rename `server.js` to `server.ts` and add types
2. **Modular Code**: Extract WebSocket logic to `services/websocket.js`
3. **Development QoL**: Add `nodemon` for auto-restart
4. **Git Hooks**: Add pre-commit linting

## 📊 How to Measure Progress

After each step, verify:
- `/healthz` returns 200 OK
- `/status` shows correct connection count
- Logs are readable and helpful
- No crashes during normal operation
- Mock EL tests still pass

## 🎮 Test Commands

```bash
# Health check
curl http://localhost:3000/healthz

# Status check
curl http://localhost:3000/status | jq

# WebSocket test
websocat ws://localhost:3000/ws/call

# Watch logs
tail -f server.log

# Multiple connections test
for i in {1..5}; do
  websocat ws://localhost:3000/ws/call &
done
```

## 🔍 Debugging Tips

1. **Connection Issues**: Check if Mock EL is running on port 4001
2. **No Audio**: Verify base64 encoding/decoding
3. **High Latency**: Profile with `console.time()` between relay points
4. **Memory Leaks**: Monitor with `process.memoryUsage()`

---

Remember: Small, working increments > Big, broken features

Keep the Mock EL server running for quick tests even after integrating real ElevenLabs!