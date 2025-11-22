-- Create employee audit log table
CREATE TABLE public.employee_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID NOT NULL,
  changed_by_email TEXT NOT NULL,
  changed_by_name TEXT,
  old_data JSONB,
  new_data JSONB,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all audit logs"
ON public.employee_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view audit logs for records they created"
ON public.employee_audit_log
FOR SELECT
USING (changed_by = auth.uid());

-- Create index for better query performance
CREATE INDEX idx_employee_audit_log_employee_id ON public.employee_audit_log(employee_id);
CREATE INDEX idx_employee_audit_log_created_at ON public.employee_audit_log(created_at DESC);

-- Function to log employee changes
CREATE OR REPLACE FUNCTION public.log_employee_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  changes_json JSONB;
BEGIN
  -- Get user information
  SELECT email, full_name INTO user_email, user_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Calculate changes for UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    changes_json := jsonb_object_agg(key, jsonb_build_object(
      'old', OLD_json->>key,
      'new', NEW_json->>key
    ))
    FROM (
      SELECT key
      FROM jsonb_each_text(to_jsonb(NEW)) NEW_json
      FULL OUTER JOIN jsonb_each_text(to_jsonb(OLD)) OLD_json USING (key)
      WHERE NEW_json.value IS DISTINCT FROM OLD_json.value
        AND key NOT IN ('updated_at')
    ) AS changed_keys;
  END IF;

  -- Insert audit log
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.employee_audit_log (
      employee_id, action, changed_by, changed_by_email, changed_by_name,
      old_data, new_data, changes
    )
    VALUES (
      OLD.id, 'DELETE', auth.uid(), user_email, user_name,
      to_jsonb(OLD), NULL, NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.employee_audit_log (
      employee_id, action, changed_by, changed_by_email, changed_by_name,
      old_data, new_data, changes
    )
    VALUES (
      NEW.id, 'UPDATE', auth.uid(), user_email, user_name,
      to_jsonb(OLD), to_jsonb(NEW), changes_json
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.employee_audit_log (
      employee_id, action, changed_by, changed_by_email, changed_by_name,
      old_data, new_data, changes
    )
    VALUES (
      NEW.id, 'INSERT', auth.uid(), user_email, user_name,
      NULL, to_jsonb(NEW), NULL
    );
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers
CREATE TRIGGER employee_audit_insert
AFTER INSERT ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.log_employee_change();

CREATE TRIGGER employee_audit_update
AFTER UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.log_employee_change();

CREATE TRIGGER employee_audit_delete
AFTER DELETE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.log_employee_change();