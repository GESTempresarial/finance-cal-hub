-- Add assigned_users column to activities table to support multiple user assignment
ALTER TABLE public.activities 
ADD COLUMN assigned_users TEXT[];

-- Update existing rows to have assigned_users array with the assigned_to user
UPDATE public.activities 
SET assigned_users = ARRAY[assigned_to::TEXT]
WHERE assigned_users IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.activities.assigned_users IS 'Array of user IDs assigned to this activity. Allows multiple users per task.';
