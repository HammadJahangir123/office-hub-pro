-- Fix the audit log trigger to run BEFORE DELETE instead of AFTER DELETE
-- This ensures the employee record still exists when creating the audit log entry

DROP TRIGGER IF EXISTS employee_audit_delete ON public.employees;

-- Create the trigger to run BEFORE DELETE so the employee record still exists
CREATE TRIGGER employee_audit_delete 
BEFORE DELETE ON public.employees 
FOR EACH ROW 
EXECUTE FUNCTION log_employee_change();

-- Enable realtime for the employees table
ALTER TABLE public.employees REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;