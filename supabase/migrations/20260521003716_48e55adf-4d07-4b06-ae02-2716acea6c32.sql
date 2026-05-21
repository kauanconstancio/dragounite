-- Promote Kauan to super_admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('eb119337-e743-4fce-8035-4808f926bf0e', 'super_admin')
ON CONFLICT DO NOTHING;

-- Design team knowledge base table
CREATE TABLE public.design_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  description text,
  content text,
  file_url text,
  link_url text,
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super admins manage design assets"
ON public.design_assets
FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_design_assets_updated_at
BEFORE UPDATE ON public.design_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_design_assets_category ON public.design_assets(category);
CREATE INDEX idx_design_assets_created_at ON public.design_assets(created_at DESC);