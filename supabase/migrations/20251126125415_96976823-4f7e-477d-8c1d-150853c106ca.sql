-- Fix foreign key constraint on employee_audit_log to allow employee deletion
-- The audit log should preserve records even after the employee is deleted

ALTER TABLE public.employee_audit_log 
DROP CONSTRAINT employee_audit_log_employee_id_fkey;

-- Re-add the constraint with ON DELETE SET NULL
-- This keeps the audit log entry but sets employee_id to NULL when employee is deleted
ALTER TABLE public.employee_audit_log
ADD CONSTRAINT employee_audit_log_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES public.employees(id) 
ON DELETE SET NULL;