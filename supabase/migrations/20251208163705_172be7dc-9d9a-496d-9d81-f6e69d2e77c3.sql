-- Add custom_peripherals column to store additional devices as JSON
ALTER TABLE public.employees
ADD COLUMN custom_peripherals jsonb DEFAULT '[]'::jsonb;