CREATE TABLE public.announcement_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, user_id)
);

CREATE INDEX idx_announcement_likes_announcement ON public.announcement_likes(announcement_id);
CREATE INDEX idx_announcement_likes_user ON public.announcement_likes(user_id);

ALTER TABLE public.announcement_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read announcement likes"
  ON public.announcement_likes FOR SELECT
  USING (true);

CREATE POLICY "authenticated users can like"
  ON public.announcement_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can unlike own"
  ON public.announcement_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);