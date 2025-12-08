-- Re-enable the update audit trigger
CREATE TRIGGER employee_audit_update
  AFTER UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION log_employee_change();