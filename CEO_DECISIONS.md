# CEO-Level Decisions Matrix

## 🎯 Decisions Required Before Development Proceeds

### 1. Runtime & Deployment
**Question**: Fly.io machines vs. Render vs. generic VPS?

**Recommendation**: **Fly.io** (us-east-1 region)
- **Why**: Co-located with Twilio's us1 edge, saves ~30ms RTT
- **Trade-off**: Slightly more complex than Render, but better performance
- **Alternative**: Railway.app if simplicity > latency

**Decision needed by**: Before Phase 5 deployment

---

### 2. Language Discipline
**Question**: TypeScript everywhere or allow polyglot?

**Recommendation**: **TypeScript end-to-end**
- **Why**: Consistent hiring pool, unified tooling, single review process
- **Trade-off**: Slightly slower media processing vs Go/Rust
- **Alternative**: Core TypeScript + Python for testing only

**Decision needed by**: Before Phase 4 (affects all new code)

---

### 3. Observability Stack
**Question**: CloudWatch vs. Grafana Cloud vs. self-hosted?

**Recommendation**: **Grafana Cloud** (free tier)
- **Why**: Best-in-class UI, generous free tier, no ops burden
- **Components**: Loki (logs) + Prometheus (metrics) + Tempo (traces)
- **Alternative**: DataDog if budget allows ($31/host/month)

**Decision needed by**: Before Phase 4 (must instrument from start)

---

### 4. Security & Compliance
**Question**: Audio retention policy?

**Recommendation**: **Zero retention** for MVP
- **Implementation**: Stream-only processing, no disk writes
- **Transcripts**: 7-day retention in encrypted S3
- **Future**: Add opt-in recording for quality improvement

**Decision needed by**: Before Phase 4 (affects architecture)

---

### 5. Cost Guardrails
**Question**: Daily spend caps?

**Recommendation**: Implement hard limits
- **ElevenLabs**: $50/day cap (≈1000 minutes)
- **Twilio**: $25/day cap (≈1000 minutes)
- **Implementation**: API quotas + billing alerts
- **Override**: Manual approval for demos/testing

**Decision needed by**: Before Phase 4 (prevent surprises)

---

### 6. Failure Handling
**Question**: Fail-open vs. fail-closed?

**Recommendation**: **Fail-open with fallback**
```javascript
if (elevenLabsDown) {
  playMessage("I'm having technical difficulties. Please try again in a few minutes.");
  gracefulHangup();
}
```
- **Why**: Better UX than dead air
- **Alternative**: Immediate hangup if brand prefers no degraded experience

**Decision needed by**: Before Phase 5 (affects error handlers)

---

### 7. Repository Structure
**Question**: Monorepo vs. split packages?

**Recommendation**: **Monorepo with packages/**
```
hard-calls/
├── packages/
│   ├── voice-gateway/    # This WebSocket relay
│   ├── web-app/          # Remix UI
│   └── shared/           # Common types/utils
├── docker-compose.yml
└── turbo.json           # Turborepo for builds
```

**Why**: Clear separation for judges, shared CI/CD
**Alternative**: Separate repos if teams are independent

**Decision needed by**: Now (affects current structure)

---

### 8. E2E Test Strategy
**Question**: Invest in automated call testing?

**Recommendation**: **Yes, with Playwright**
- **Approach**: Playwright → Twilio Test API → Assert audio
- **Budget**: 2-3 days of dev time
- **ROI**: Catches demo-day disasters

**Decision needed by**: Before Phase 5

---

### 9. Voice Model IP
**Question**: Stock voice or custom clone?

**Recommendation**: **Custom clone** for differentiation
- **Options**: 
  - Clone founder's voice (memorable)
  - Professional voice actor (polished)
  - Synthetic unique voice (novel)
- **Timeline**: 2-3 hours to create in ElevenLabs

**Decision needed by**: Before Phase 4 testing

---

## 📋 Quick Decision Checklist

Copy and fill out:

```yaml
decisions:
  deployment: fly_io | render | vps
  language: typescript_only | polyglot_ok
  observability: grafana_cloud | cloudwatch | datadog | self_hosted
  audio_retention: none | 7_days | 30_days
  daily_caps:
    elevenlabs: $___
    twilio: $___
  failure_mode: fallback_message | immediate_hangup
  repo_structure: monorepo | separate
  e2e_tests: yes | defer
  voice_model: stock | clone_founder | hire_actor | synthetic
  
made_by: [Name]
date: YYYY-MM-DD
```

---

## 🚨 Blockers by Phase

### Before Phase 4 (This Week)
- [ ] Language decision (affects all code)
- [ ] Observability choice (need to add instrumentation)
- [ ] Voice model selection (for testing)
- [ ] Cost caps (API configuration)

### Before Phase 5 (Next Week)
- [ ] Deployment platform (for SSL/domain)
- [ ] Failure handling strategy
- [ ] E2E test investment

### Before Launch (Week 3)
- [ ] Repository structure (if changing)
- [ ] Security/compliance policy
- [ ] Final voice model rights

---

## 💡 Recommendation Priority

If you can only make 3 decisions today:

1. **Deployment**: Choose Fly.io for performance
2. **Language**: Stick with TypeScript
3. **Voice Model**: Start clone process (takes time)

Everything else can be decided progressively, but these three affect immediate next steps.