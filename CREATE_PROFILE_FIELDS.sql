-- Create profile_fields table for custom employee profile fields
CREATE TABLE IF NOT EXISTS profile_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_options JSONB,
  is_required BOOLEAN DEFAULT false,
  extracted_from_resume BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, field_name)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profile_fields_company_id ON profile_fields(company_id);

-- Enable RLS
ALTER TABLE profile_fields ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their company's profile fields" ON profile_fields;
DROP POLICY IF EXISTS "Admins can insert profile fields" ON profile_fields;
DROP POLICY IF EXISTS "Admins can update profile fields" ON profile_fields;
DROP POLICY IF EXISTS "Admins can delete profile fields" ON profile_fields;

-- RLS Policies
CREATE POLICY "Users can view their company's profile fields"
  ON profile_fields FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM team_members 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can insert profile fields"
  ON profile_fields FOR INSERT
  WITH CHECK (company_id IN (
    SELECT company_id FROM team_members 
    WHERE user_id = auth.uid() AND role IN ('Admin', 'HSE Manager')
  ));

CREATE POLICY "Admins can update profile fields"
  ON profile_fields FOR UPDATE
  USING (company_id IN (
    SELECT company_id FROM team_members 
    WHERE user_id = auth.uid() AND role IN ('Admin', 'HSE Manager')
  ));

CREATE POLICY "Admins can delete profile fields"
  ON profile_fields FOR DELETE
  USING (company_id IN (
    SELECT company_id FROM team_members 
    WHERE user_id = auth.uid() AND role IN ('Admin', 'HSE Manager')
  ));

-- Add comment to table
COMMENT ON TABLE profile_fields IS 'Stores custom profile field definitions for employee profiles';
