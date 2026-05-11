-- Enable RLS on both tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR profiles

-- Anyone can read profiles (to check roles)
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT USING (true);

-- Only admins can update the role column
CREATE POLICY "Only admins update roles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- POLICIES FOR tasks

-- Users can see their own tasks
CREATE POLICY "Users see own tasks" ON tasks
  FOR SELECT USING (user_id = auth.uid());

-- Admins can see all tasks
CREATE POLICY "Admins see all tasks" ON tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can insert tasks (must set user_id to their own)
CREATE POLICY "Users insert own tasks" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own tasks
CREATE POLICY "Users update own tasks" ON tasks
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own tasks
CREATE POLICY "Users delete own tasks" ON tasks
  FOR DELETE USING (user_id = auth.uid());

-- Admins can delete any task
CREATE POLICY "Admins delete any task" ON tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );