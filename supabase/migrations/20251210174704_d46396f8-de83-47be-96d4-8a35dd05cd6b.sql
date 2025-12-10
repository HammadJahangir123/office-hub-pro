-- Add employee_code column to employees table
ALTER TABLE public.employees 
ADD COLUMN employee_code text;

-- Make name, username, email, department, section nullable
ALTER TABLE public.employees 
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN username DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN department DROP NOT NULL,
ALTER COLUMN section DROP NOT NULL;