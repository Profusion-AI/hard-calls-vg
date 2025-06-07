import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export class CallLogger {
  constructor() {
    this.enabled = !!supabase;
  }

  async startCall(callSid, phoneNumber = null) {
    if (!this.enabled) return null;
    
    try {
      const { data, error } = await supabase
        .from('calls')
        .insert({
          call_sid: callSid,
          phone_number: phoneNumber,
          status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error logging call start:', err);
      return null;
    }
  }

  async endCall(callSid) {
    if (!this.enabled) return null;
    
    try {
      const { data, error } = await supabase
        .from('calls')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('call_sid', callSid)
        .select()
        .single();
      
      if (error) throw error;
      
      // Calculate duration
      if (data && data.started_at) {
        const duration = Math.floor(
          (new Date(data.ended_at) - new Date(data.started_at)) / 1000
        );
        
        await supabase
          .from('calls')
          .update({ duration_seconds: duration })
          .eq('call_sid', callSid);
      }
      
      return data;
    } catch (err) {
      console.error('Error logging call end:', err);
      return null;
    }
  }

  async logTranscript(callSid, speaker, text) {
    if (!this.enabled || !text) return null;
    
    try {
      // First get the call ID
      const { data: callData } = await supabase
        .from('calls')
        .select('id')
        .eq('call_sid', callSid)
        .single();
      
      if (!callData) return null;
      
      const { data, error } = await supabase
        .from('transcripts')
        .insert({
          call_id: callData.id,
          speaker,
          text
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error logging transcript:', err);
      return null;
    }
  }

  async uploadAudio(callSid, audioBuffer, fileName, fileType = 'debug') {
    if (!this.enabled) return null;
    
    try {
      // Get call ID
      const { data: callData } = await supabase
        .from('calls')
        .select('id')
        .eq('call_sid', callSid)
        .single();
      
      if (!callData) return null;
      
      // Upload to storage
      const filePath = `calls/${callSid}/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('hardcalls')
        .upload(filePath, audioBuffer, {
          contentType: 'audio/basic',
          upsert: true
        });
      
      if (uploadError) throw uploadError;
      
      // Record in database
      const { data, error } = await supabase
        .from('audio_files')
        .insert({
          call_id: callData.id,
          file_path: filePath,
          file_type: fileType,
          mime_type: 'audio/basic',
          size_bytes: audioBuffer.length
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error uploading audio:', err);
      return null;
    }
  }
}

export const callLogger = new CallLogger();