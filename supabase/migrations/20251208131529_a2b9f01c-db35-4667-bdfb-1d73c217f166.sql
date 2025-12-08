-- Add location column to employees table
ALTER TABLE public.employees ADD COLUMN location text;

-- Create index for better filtering performance
CREATE INDEX idx_employees_location ON public.employees(location);