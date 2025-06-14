-- Add device_id and sync fields to meals table
ALTER TABLE meals 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP WITH TIME ZONE;

-- Create sync_codes table for device pairing
CREATE TABLE IF NOT EXISTS sync_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Create index for sync codes
CREATE INDEX IF NOT EXISTS idx_sync_codes_code ON sync_codes(code);
CREATE INDEX IF NOT EXISTS idx_sync_codes_expires ON sync_codes(expires_at);

-- Create function to generate sync codes
CREATE OR REPLACE FUNCTION generate_sync_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
BEGIN
    -- Generate a 6-digit code
    code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired sync codes
CREATE OR REPLACE FUNCTION cleanup_expired_sync_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM sync_codes WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
