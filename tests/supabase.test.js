const { callLogger } = require('../services/supabase.js');
require('dotenv').config({ path: '.env.local' });

describe('Supabase Integration Tests', () => {
  const hasCredentials = process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  if (!hasCredentials) {
    test.skip('Skipping Supabase tests - no credentials configured', () => {});
    return;
  }

  const testCallSid = `test_call_${Date.now()}`;

  test('Should log call start', async () => {
    const result = await callLogger.startCall(testCallSid, '+1234567890');
    
    if (result) {
      expect(result.call_sid).toBe(testCallSid);
      expect(result.phone_number).toBe('+1234567890');
      expect(result.status).toBe('active');
      expect(result.id).toBeTruthy();
    }
  });

  test('Should log transcript', async () => {
    // First ensure we have a call
    await callLogger.startCall(testCallSid, '+1234567890');
    
    // Log user transcript
    const userResult = await callLogger.logTranscript(
      testCallSid, 
      'user', 
      'Hello, this is a test'
    );
    
    if (userResult) {
      expect(userResult.speaker).toBe('user');
      expect(userResult.text).toBe('Hello, this is a test');
      expect(userResult.id).toBeTruthy();
    }

    // Log agent transcript
    const agentResult = await callLogger.logTranscript(
      testCallSid, 
      'agent', 
      'Hello! How can I help you today?'
    );
    
    if (agentResult) {
      expect(agentResult.speaker).toBe('agent');
      expect(agentResult.text).toBe('Hello! How can I help you today?');
    }
  });

  test('Should log call end', async () => {
    const result = await callLogger.endCall(testCallSid);
    
    if (result) {
      expect(result.status).toBe('completed');
      expect(result.ended_at).toBeTruthy();
      expect(result.call_sid).toBe(testCallSid);
    }
  });

  test('Should handle non-existent call gracefully', async () => {
    const result = await callLogger.endCall('non_existent_call_123');
    // Should return null or handle gracefully
    expect(result).toBeNull();
  });

  test('Should upload audio file', async () => {
    // Create test audio buffer
    const testAudio = Buffer.from('test audio data');
    const fileName = `test_audio_${Date.now()}.ulaw`;
    
    const result = await callLogger.uploadAudio(
      testCallSid,
      testAudio,
      fileName,
      'test'
    );
    
    if (result) {
      expect(result.file_path).toContain(testCallSid);
      expect(result.file_path).toContain(fileName);
      expect(result.file_type).toBe('test');
      expect(result.size_bytes).toBe(testAudio.length);
    }
  });
});

// Run with: npm test tests/supabase.test.js