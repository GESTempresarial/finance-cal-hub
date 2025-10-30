-- Remove the whatsapp_mappings table
DROP TABLE IF EXISTS public.whatsapp_mappings;

-- Add phone column to users table
ALTER TABLE public.users 
ADD COLUMN phone TEXT;

-- Add unique constraint to ensure phone numbers are unique
ALTER TABLE public.users 
ADD CONSTRAINT users_phone_unique UNIQUE (phone);