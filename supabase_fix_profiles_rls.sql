-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Allow admins (or everyone if we want public profiles) to view all profiles
-- For now, let's allow everyone to read profiles (needed for assigning collectors, viewing reports, etc.)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);
