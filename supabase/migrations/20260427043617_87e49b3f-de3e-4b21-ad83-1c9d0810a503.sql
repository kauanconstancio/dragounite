
CREATE TYPE public.feedback_type AS ENUM ('suggestion', 'bug', 'improvement');
CREATE TYPE public.feedback_status AS ENUM ('open', 'in_review', 'resolved', 'closed');
CREATE TYPE public.feedback_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type public.feedback_type NOT NULL DEFAULT 'suggestion',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.feedback_status NOT NULL DEFAULT 'open',
  priority public.feedback_priority NOT NULL DEFAULT 'medium',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own feedback"
ON public.feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users view own feedback"
ON public.feedback FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_super_admin(auth.uid()));

CREATE POLICY "users update own open feedback"
ON public.feedback FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'open')
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own open feedback"
ON public.feedback FOR DELETE TO authenticated
USING (auth.uid() = user_id AND status = 'open');

CREATE POLICY "super admins manage feedback"
ON public.feedback FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER update_feedback_updated_at
BEFORE UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX idx_feedback_status ON public.feedback(status);
