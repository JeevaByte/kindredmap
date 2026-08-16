CREATE OR REPLACE FUNCTION public.connections_guard_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_a_id IS DISTINCT FROM OLD.user_a_id
     OR NEW.user_b_id IS DISTINCT FROM OLD.user_b_id
     OR NEW.initiated_by IS DISTINCT FROM OLD.initiated_by
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.photo_url IS DISTINCT FROM OLD.photo_url
     OR NEW.fun_fact IS DISTINCT FROM OLD.fun_fact
     OR NEW.meet_date IS DISTINCT FROM OLD.meet_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the confirmation status of a connection can be changed';
  END IF;

  IF OLD.status = 'confirmed'::connection_status
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'A confirmed connection cannot be un-confirmed';
  END IF;

  IF NEW.status = 'confirmed'::connection_status AND OLD.status <> 'confirmed'::connection_status THEN
    NEW.confirmed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connections_guard_update ON public.connections;
CREATE TRIGGER connections_guard_update
BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.connections_guard_update();