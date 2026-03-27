-- Create a function to increment eco points safely
CREATE OR REPLACE FUNCTION increment_eco_points(user_id_input UUID, points_input INT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET eco_points = COALESCE(eco_points, 0) + points_input
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
