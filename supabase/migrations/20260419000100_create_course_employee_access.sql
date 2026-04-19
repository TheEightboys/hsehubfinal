-- Create course employee access mapping table
CREATE TABLE IF NOT EXISTS public.course_employee_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(course_id, employee_id)
);

ALTER TABLE public.course_employee_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view course access"
  ON public.course_employee_access FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Company admins can manage course access"
  ON public.course_employee_access FOR ALL
  USING (
    public.has_role(auth.uid(), 'company_admin') AND
    company_id = public.get_user_company_id(auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_course_employee_access_company_id ON public.course_employee_access(company_id);
CREATE INDEX IF NOT EXISTS idx_course_employee_access_course_id ON public.course_employee_access(course_id);
CREATE INDEX IF NOT EXISTS idx_course_employee_access_employee_id ON public.course_employee_access(employee_id);
