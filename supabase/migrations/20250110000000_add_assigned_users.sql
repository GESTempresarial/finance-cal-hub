-- Add assigned_users column to activities table
ALTER TABLE public.activities 
ADD COLUMN assigned_users UUID[] DEFAULT ARRAY[]::UUID[];

-- Update existing activities to include assigned_to in assigned_users array
UPDATE public.activities 
SET assigned_users = ARRAY[assigned_to]
WHERE assigned_users = ARRAY[]::UUID[];

-- Add a check to ensure assigned_users is not empty
ALTER TABLE public.activities 
ADD CONSTRAINT activities_assigned_users_not_empty 
CHECK (array_length(assigned_users, 1) > 0);
