ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

-- Relax the auth-account link so clearly-marked seed profiles can exist.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

INSERT INTO public.profiles (id, name, avatar_url, area, building_what, building_for, building_so, building_line, linkedin_url, onboarded, is_seed)
VALUES
  (gen_random_uuid(), '[SEED] Aditi R', 'preset:🦊', 'Adyar', 'a payroll tool', 'small D2C brands', 'stop doing salaries in spreadsheets', 'Building a payroll tool for small D2C brands so they can stop doing salaries in spreadsheets', 'https://www.linkedin.com/in/example-aditi', true, true),
  (gen_random_uuid(), '[SEED] Karthik S', 'preset:🐙', 'Adyar', 'a returns API', 'ecommerce ops teams', 'cut reverse logistics cost', 'Building a returns API for ecommerce ops teams so they can cut reverse logistics cost', 'https://www.linkedin.com/in/example-karthik', true, true),
  (gen_random_uuid(), '[SEED] Meera V', 'preset:🦉', 'Anna Nagar', 'a hiring CRM', 'early stage founders', 'close their first 10 hires faster', 'Building a hiring CRM for early stage founders so they can close their first 10 hires faster', 'https://www.linkedin.com/in/example-meera', true, true),
  (gen_random_uuid(), '[SEED] Nikhil P', 'preset:🐝', 'Anna Nagar', 'a WhatsApp bot', 'local clinics', 'fill empty appointment slots', 'Building a WhatsApp bot for local clinics so they can fill empty appointment slots', 'https://www.linkedin.com/in/example-nikhil', true, true),
  (gen_random_uuid(), '[SEED] Divya K', 'preset:🐳', 'Velachery', 'a design subscription', 'seed stage SaaS', 'ship landing pages weekly', 'Building a design subscription for seed stage SaaS so they can ship landing pages weekly', 'https://www.linkedin.com/in/example-divya', true, true),
  (gen_random_uuid(), '[SEED] Rahul M', 'preset:🚀', 'Velachery', 'an invoicing app', 'freelance designers', 'get paid on time', 'Building an invoicing app for freelance designers so they can get paid on time', 'https://www.linkedin.com/in/example-rahul', true, true);