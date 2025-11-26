-- Fix the log_employee_change function to resolve the "old_json does not exist" error
CREATE OR REPLACE FUNCTION public.log_employee_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    SELECT jsonb_object_agg(
      key,
      jsonb_build_object(
        'old', old_value,
        'new', new_value
      )
    ) INTO changes_json
    FROM (
      SELECT 
        key,
        old_vals.value as old_value,
        new_vals.value as new_value
      FROM jsonb_each_text(to_jsonb(OLD)) old_vals
      FULL OUTER JOIN jsonb_each_text(to_jsonb(NEW)) new_vals USING (key)
      WHERE old_vals.value IS DISTINCT FROM new_vals.value
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
$function$;