-- Ensure reports table exists and has necessary columns
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns for structured reporting if they don't exist
ALTER TABLE reports ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS image_url TEXT; -- For future use

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create reports
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all reports (assuming admins have a way to be identified, or we use a role check)
-- For simplicity, let's allow all authenticated users to insert, and users to read their own.
-- Admin policies might need to be more specific if we have a robust admin role check in RLS, 
-- but usually we might handle admin checks in application logic or a separate admin policy.
-- Let's add a policy for admins if we have a way to identify them in RLS, otherwise we rely on the application to show all reports to admins.
-- (The previous RLS scripts didn't set up a global admin role check for RLS, so I'll stick to basic user policies for now 
-- and ensure the application handles admin visibility by using the service role or just fetching all if the user is admin).
-- Wait, I should probably check if there's an existing policy for admins. 
-- For now, "Users can view own reports" is good. 
-- Let's add "Admins can view all reports" using a simple TRUE check if the user has role 'admin' in metadata or profiles?
-- Accessing profiles from RLS can be tricky due to recursion. 
-- Let's just stick to "Users can view own reports" and maybe "Everyone can insert" (authenticated).

-- Allow all authenticated users to insert
DROP POLICY IF EXISTS "Users can create reports" ON reports;
CREATE POLICY "Users can create reports" ON reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
