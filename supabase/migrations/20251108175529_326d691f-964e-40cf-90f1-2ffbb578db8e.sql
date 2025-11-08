-- Fix infinite recursion: Move roles to separate table with security definer function

-- 1. Create user_roles table (app_role enum already exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 2. Migrate existing data from users.rol to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, rol FROM public.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create security definer function to check roles (prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- 6. Drop old problematic policies and create new ones using security definer functions

-- USERS TABLE POLICIES
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- DOCUMENTS TABLE POLICIES
DROP POLICY IF EXISTS "Admins can delete any document" ON public.documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;

CREATE POLICY "Admins can delete any document"
ON public.documents FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all documents"
ON public.documents FOR SELECT
USING (public.is_admin(auth.uid()));

-- CHUNKS TABLE POLICIES
DROP POLICY IF EXISTS "Users can view chunks of accessible documents" ON public.chunks;

CREATE POLICY "Users can view chunks of accessible documents"
ON public.chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = chunks.document_id
      AND (d.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- EMBEDDINGS TABLE POLICIES
DROP POLICY IF EXISTS "Users can view embeddings of accessible chunks" ON public.embeddings;

CREATE POLICY "Users can view embeddings of accessible chunks"
ON public.embeddings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chunks c
    JOIN documents d ON d.id = c.document_id
    WHERE c.id = embeddings.chunk_id
      AND (d.created_by = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- KPIS_DAILY TABLE POLICIES
DROP POLICY IF EXISTS "Admins can manage kpis" ON public.kpis_daily;
DROP POLICY IF EXISTS "Analysts can view kpis" ON public.kpis_daily;

CREATE POLICY "Admins can manage kpis"
ON public.kpis_daily FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Analysts can view kpis"
ON public.kpis_daily FOR SELECT
USING (auth.uid() IS NOT NULL);

-- QUERIES TABLE POLICIES
DROP POLICY IF EXISTS "Admins can view all queries" ON public.queries;

CREATE POLICY "Admins can view all queries"
ON public.queries FOR SELECT
USING (public.is_admin(auth.uid()));

-- QUERY_SOURCES TABLE POLICIES
DROP POLICY IF EXISTS "Admins can view all sources" ON public.query_sources;

CREATE POLICY "Admins can view all sources"
ON public.query_sources FOR SELECT
USING (public.is_admin(auth.uid()));

-- TAXONOMIAS TABLE POLICIES
DROP POLICY IF EXISTS "Admins can manage taxonomias" ON public.taxonomias;

CREATE POLICY "Admins can manage taxonomias"
ON public.taxonomias FOR ALL
USING (public.is_admin(auth.uid()));

-- USER_ROLES TABLE POLICIES
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.is_admin(auth.uid()));

-- 7. Optional: Remove rol column from users table (keep for backwards compatibility for now)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS rol;