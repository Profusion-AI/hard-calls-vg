-- Supabase schema for Hard Calls Voice Gateway

-- Create calls table to track all calls
CREATE TABLE IF NOT EXISTS calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_sid TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  status TEXT DEFAULT 'initiated',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcripts table for storing conversation transcripts
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL, -- 'user' or 'agent'
  text TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audio_files table to track stored audio
CREATE TABLE IF NOT EXISTS audio_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'voice_prompt', 'call_recording', 'debug'
  mime_type TEXT,
  size_bytes INTEGER,
  duration_seconds FLOAT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_calls_call_sid ON calls(call_sid);
CREATE INDEX idx_calls_started_at ON calls(started_at);
CREATE INDEX idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX idx_audio_files_call_id ON audio_files(call_id);

-- Create RLS policies (if using Row Level Security)
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- Storage bucket configuration (run in Supabase dashboard)
-- 1. Create bucket named 'hardcalls' if it doesn't exist
-- 2. Set allowed MIME types: audio/*,application/octet-stream
-- 3. Set max file size: 10MB (10485760 bytes)