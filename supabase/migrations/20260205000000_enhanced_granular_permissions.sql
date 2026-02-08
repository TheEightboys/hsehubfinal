-- Migration: Enhanced Granular Permissions for RBAC
-- Created: 2026-02-05
-- Description: Expands the permissions system to support detailed per-action permissions
--              organized by feature categories (Standard, Employee, Health Examinations, 
--              Documents, Audits, Reports, Settings)

-- ============================================
-- 1. ADD NEW COLUMNS TO CUSTOM_ROLES TABLE
-- ============================================

-- Add detailed_permissions column for granular permissions
ALTER TABLE public.custom_roles 
ADD COLUMN IF NOT EXISTS detailed_permissions JSONB DEFAULT '{
  "standard": {
    "collaborate_on_cases": false,
    "assign_to_teams": false
  },
  "employees": {
    "view_all": false,
    "view_own_department": false,
    "manage": false,
    "delete": false,
    "share_profiles": false
  },
  "health_examinations": {
    "view_all": false,
    "view_team": false,
    "view_own": false,
    "create_edit": false,
    "medical_evaluations": false,
    "delete": false
  },
  "documents": {
    "view": false,
    "upload": false,
    "edit": false,
    "delete": false
  },
  "audits": {
    "view": false,
    "create_edit": false,
    "assign_corrective_actions": false,
    "close_feedback": false
  },
  "reports": {
    "view": false,
    "create_dashboards": false,
    "export_data": false
  },
  "settings": {
    "company_location": false,
    "user_role_management": false,
    "gdpr_data_protection": false,
    "templates_custom_fields": false,
    "subscription_billing": false
  }
}'::jsonb;

-- Add role description column
ALTER TABLE public.custom_roles 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add display_order for consistent ordering
ALTER TABLE public.custom_roles 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 100;

-- ============================================
-- 2. CREATE FUNCTION TO UPDATE EXISTING ROLES
-- ============================================

CREATE OR REPLACE FUNCTION public.migrate_permissions_to_detailed()
RETURNS void AS $$
DECLARE
  role_record RECORD;
  new_detailed JSONB;
BEGIN
  FOR role_record IN SELECT * FROM public.custom_roles LOOP
    -- Map old permissions to new detailed structure
    new_detailed := jsonb_build_object(
      'standard', jsonb_build_object(
        'collaborate_on_cases', COALESCE((role_record.permissions->>'dashboard')::boolean, false),
        'assign_to_teams', COALESCE((role_record.permissions->>'employees')::boolean, false)
      ),
      'employees', jsonb_build_object(
        'view_all', COALESCE((role_record.permissions->>'employees')::boolean, false),
        'view_own_department', COALESCE((role_record.permissions->>'employees')::boolean, false),
        'manage', COALESCE((role_record.permissions->>'employees')::boolean, false),
        'delete', false,
        'share_profiles', COALESCE((role_record.permissions->>'employees')::boolean, false)
      ),
      'health_examinations', jsonb_build_object(
        'view_all', COALESCE((role_record.permissions->>'healthCheckups')::boolean, false),
        'view_team', COALESCE((role_record.permissions->>'healthCheckups')::boolean, false),
        'view_own', COALESCE((role_record.permissions->>'healthCheckups')::boolean, false),
        'create_edit', COALESCE((role_record.permissions->>'healthCheckups')::boolean, false),
        'medical_evaluations', COALESCE((role_record.permissions->>'healthCheckups')::boolean, false),
        'delete', false
      ),
      'documents', jsonb_build_object(
        'view', COALESCE((role_record.permissions->>'documents')::boolean, false),
        'upload', COALESCE((role_record.permissions->>'documents')::boolean, false),
        'edit', COALESCE((role_record.permissions->>'documents')::boolean, false),
        'delete', false
      ),
      'audits', jsonb_build_object(
        'view', COALESCE((role_record.permissions->>'audits')::boolean, false),
        'create_edit', COALESCE((role_record.permissions->>'audits')::boolean, false),
        'assign_corrective_actions', COALESCE((role_record.permissions->>'audits')::boolean, false),
        'close_feedback', COALESCE((role_record.permissions->>'audits')::boolean, false)
      ),
      'reports', jsonb_build_object(
        'view', COALESCE((role_record.permissions->>'reports')::boolean, false),
        'create_dashboards', COALESCE((role_record.permissions->>'reports')::boolean, false),
        'export_data', COALESCE((role_record.permissions->>'reports')::boolean, false)
      ),
      'settings', jsonb_build_object(
        'company_location', COALESCE((role_record.permissions->>'settings')::boolean, false),
        'user_role_management', COALESCE((role_record.permissions->>'settings')::boolean, false),
        'gdpr_data_protection', COALESCE((role_record.permissions->>'settings')::boolean, false),
        'templates_custom_fields', COALESCE((role_record.permissions->>'settings')::boolean, false),
        'subscription_billing', COALESCE((role_record.permissions->>'settings')::boolean, false)
      )
    );
    
    UPDATE public.custom_roles 
    SET detailed_permissions = new_detailed
    WHERE id = role_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run migration for existing data
SELECT public.migrate_permissions_to_detailed();

-- ============================================
-- 3. UPDATE PREDEFINED ROLES WITH CORRECT PERMISSIONS
-- ============================================

-- Update Admin role permissions (all permissions)
UPDATE public.custom_roles
SET 
  detailed_permissions = '{
    "standard": {
      "collaborate_on_cases": true,
      "assign_to_teams": true
    },
    "employees": {
      "view_all": true,
      "view_own_department": true,
      "manage": true,
      "delete": true,
      "share_profiles": true
    },
    "health_examinations": {
      "view_all": true,
      "view_team": true,
      "view_own": true,
      "create_edit": true,
      "medical_evaluations": true,
      "delete": true
    },
    "documents": {
      "view": true,
      "upload": true,
      "edit": true,
      "delete": true
    },
    "audits": {
      "view": true,
      "create_edit": true,
      "assign_corrective_actions": true,
      "close_feedback": true
    },
    "reports": {
      "view": true,
      "create_dashboards": true,
      "export_data": true
    },
    "settings": {
      "company_location": true,
      "user_role_management": true,
      "gdpr_data_protection": true,
      "templates_custom_fields": true,
      "subscription_billing": true
    }
  }'::jsonb,
  description = 'Full access to all features and settings',
  display_order = 1
WHERE role_name = 'Admin';

-- Update HSE Manager role permissions
UPDATE public.custom_roles
SET 
  detailed_permissions = '{
    "standard": {
      "collaborate_on_cases": true,
      "assign_to_teams": true
    },
    "employees": {
      "view_all": true,
      "view_own_department": true,
      "manage": true,
      "delete": false,
      "share_profiles": true
    },
    "health_examinations": {
      "view_all": true,
      "view_team": true,
      "view_own": true,
      "create_edit": false,
      "medical_evaluations": true,
      "delete": false
    },
    "documents": {
      "view": true,
      "upload": true,
      "edit": true,
      "delete": false
    },
    "audits": {
      "view": true,
      "create_edit": true,
      "assign_corrective_actions": true,
      "close_feedback": true
    },
    "reports": {
      "view": true,
      "create_dashboards": true,
      "export_data": true
    },
    "settings": {
      "company_location": false,
      "user_role_management": false,
      "gdpr_data_protection": false,
      "templates_custom_fields": true,
      "subscription_billing": false
    }
  }'::jsonb,
  description = 'Manages health, safety and environmental compliance',
  display_order = 2
WHERE role_name = 'HSE Manager';

-- Update Line Manager role permissions
UPDATE public.custom_roles
SET 
  detailed_permissions = '{
    "standard": {
      "collaborate_on_cases": true,
      "assign_to_teams": true
    },
    "employees": {
      "view_all": false,
      "view_own_department": true,
      "manage": false,
      "delete": false,
      "share_profiles": true
    },
    "health_examinations": {
      "view_all": false,
      "view_team": true,
      "view_own": true,
      "create_edit": false,
      "medical_evaluations": false,
      "delete": false
    },
    "documents": {
      "view": true,
      "upload": true,
      "edit": false,
      "delete": false
    },
    "audits": {
      "view": true,
      "create_edit": false,
      "assign_corrective_actions": true,
      "close_feedback": true
    },
    "reports": {
      "view": true,
      "create_dashboards": false,
      "export_data": false
    },
    "settings": {
      "company_location": false,
      "user_role_management": false,
      "gdpr_data_protection": false,
      "templates_custom_fields": false,
      "subscription_billing": false
    }
  }'::jsonb,
  description = 'Oversees team members and department activities',
  display_order = 3
WHERE role_name = 'Line Manager';

-- Update Doctor role permissions
UPDATE public.custom_roles
SET 
  detailed_permissions = '{
    "standard": {
      "collaborate_on_cases": true,
      "assign_to_teams": false
    },
    "employees": {
      "view_all": true,
      "view_own_department": false,
      "manage": false,
      "delete": false,
      "share_profiles": false
    },
    "health_examinations": {
      "view_all": true,
      "view_team": false,
      "view_own": true,
      "create_edit": true,
      "medical_evaluations": true,
      "delete": false
    },
    "documents": {
      "view": true,
      "upload": true,
      "edit": false,
      "delete": false
    },
    "audits": {
      "view": false,
      "create_edit": false,
      "assign_corrective_actions": false,
      "close_feedback": false
    },
    "reports": {
      "view": false,
      "create_dashboards": false,
      "export_data": false
    },
    "settings": {
      "company_location": false,
      "user_role_management": false,
      "gdpr_data_protection": false,
      "templates_custom_fields": false,
      "subscription_billing": false
    }
  }'::jsonb,
  description = 'Medical professional with health examination access',
  display_order = 4
WHERE role_name = 'Doctor';

-- Update Employee role permissions
UPDATE public.custom_roles
SET 
  detailed_permissions = '{
    "standard": {
      "collaborate_on_cases": false,
      "assign_to_teams": false
    },
    "employees": {
      "view_all": false,
      "view_own_department": false,
      "manage": false,
      "delete": false,
      "share_profiles": false
    },
    "health_examinations": {
      "view_all": false,
      "view_team": false,
      "view_own": true,
      "create_edit": false,
      "medical_evaluations": false,
      "delete": false
    },
    "documents": {
      "view": true,
      "upload": false,
      "edit": false,
      "delete": false
    },
    "audits": {
      "view": false,
      "create_edit": false,
      "assign_corrective_actions": false,
      "close_feedback": true
    },
    "reports": {
      "view": false,
      "create_dashboards": false,
      "export_data": false
    },
    "settings": {
      "company_location": false,
      "user_role_management": false,
      "gdpr_data_protection": false,
      "templates_custom_fields": false,
      "subscription_billing": false
    }
  }'::jsonb,
  description = 'Standard employee with basic access',
  display_order = 5
WHERE role_name = 'Employee';

-- Update User role permissions (most restricted)
UPDATE public.custom_roles
SET 
  detailed_permissions = '{
    "standard": {
      "collaborate_on_cases": false,
      "assign_to_teams": false
    },
    "employees": {
      "view_all": false,
      "view_own_department": false,
      "manage": false,
      "delete": false,
      "share_profiles": false
    },
    "health_examinations": {
      "view_all": false,
      "view_team": false,
      "view_own": false,
      "create_edit": false,
      "medical_evaluations": false,
      "delete": false
    },
    "documents": {
      "view": true,
      "upload": false,
      "edit": false,
      "delete": false
    },
    "audits": {
      "view": true,
      "create_edit": false,
      "assign_corrective_actions": false,
      "close_feedback": false
    },
    "reports": {
      "view": false,
      "create_dashboards": false,
      "export_data": false
    },
    "settings": {
      "company_location": false,
      "user_role_management": false,
      "gdpr_data_protection": false,
      "templates_custom_fields": false,
      "subscription_billing": false
    }
  }'::jsonb,
  description = 'External user with read-only access',
  display_order = 6
WHERE role_name = 'User';

-- ============================================
-- 4. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to check a specific detailed permission
CREATE OR REPLACE FUNCTION public.check_detailed_permission(
  p_user_id UUID,
  p_company_id UUID,
  p_category TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role_name TEXT;
  v_has_permission BOOLEAN;
BEGIN
  -- Get user's role
  SELECT role INTO v_role_name
  FROM public.team_members
  WHERE user_id = p_user_id AND company_id = p_company_id
  LIMIT 1;
  
  IF v_role_name IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check permission in custom_roles
  SELECT (detailed_permissions->p_category->>p_permission)::boolean INTO v_has_permission
  FROM public.custom_roles
  WHERE company_id = p_company_id AND role_name = v_role_name;
  
  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_detailed_permission TO authenticated;

-- ============================================
-- 5. CREATE TRIGGER TO SYNC LEGACY PERMISSIONS
-- ============================================

-- Function to sync legacy permissions from detailed permissions
CREATE OR REPLACE FUNCTION public.sync_legacy_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Compute legacy permissions from detailed_permissions
  NEW.permissions = jsonb_build_object(
    'dashboard', COALESCE((NEW.detailed_permissions->'standard'->>'collaborate_on_cases')::boolean, false) OR 
                 COALESCE((NEW.detailed_permissions->'standard'->>'assign_to_teams')::boolean, false),
    'employees', COALESCE((NEW.detailed_permissions->'employees'->>'view_all')::boolean, false) OR 
                 COALESCE((NEW.detailed_permissions->'employees'->>'view_own_department')::boolean, false) OR
                 COALESCE((NEW.detailed_permissions->'employees'->>'manage')::boolean, false),
    'healthCheckups', COALESCE((NEW.detailed_permissions->'health_examinations'->>'view_all')::boolean, false) OR 
                      COALESCE((NEW.detailed_permissions->'health_examinations'->>'view_team')::boolean, false) OR
                      COALESCE((NEW.detailed_permissions->'health_examinations'->>'view_own')::boolean, false) OR
                      COALESCE((NEW.detailed_permissions->'health_examinations'->>'create_edit')::boolean, false),
    'documents', COALESCE((NEW.detailed_permissions->'documents'->>'view')::boolean, false) OR 
                 COALESCE((NEW.detailed_permissions->'documents'->>'upload')::boolean, false) OR
                 COALESCE((NEW.detailed_permissions->'documents'->>'edit')::boolean, false),
    'reports', COALESCE((NEW.detailed_permissions->'reports'->>'view')::boolean, false) OR 
               COALESCE((NEW.detailed_permissions->'reports'->>'create_dashboards')::boolean, false) OR
               COALESCE((NEW.detailed_permissions->'reports'->>'export_data')::boolean, false),
    'audits', COALESCE((NEW.detailed_permissions->'audits'->>'view')::boolean, false) OR 
              COALESCE((NEW.detailed_permissions->'audits'->>'create_edit')::boolean, false) OR
              COALESCE((NEW.detailed_permissions->'audits'->>'assign_corrective_actions')::boolean, false),
    'settings', COALESCE((NEW.detailed_permissions->'settings'->>'company_location')::boolean, false) OR 
                COALESCE((NEW.detailed_permissions->'settings'->>'user_role_management')::boolean, false) OR
                COALESCE((NEW.detailed_permissions->'settings'->>'gdpr_data_protection')::boolean, false) OR
                COALESCE((NEW.detailed_permissions->'settings'->>'templates_custom_fields')::boolean, false) OR
                COALESCE((NEW.detailed_permissions->'settings'->>'subscription_billing')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync on insert/update
DROP TRIGGER IF EXISTS sync_legacy_permissions_trigger ON public.custom_roles;
CREATE TRIGGER sync_legacy_permissions_trigger
  BEFORE INSERT OR UPDATE OF detailed_permissions ON public.custom_roles
  FOR EACH ROW
  WHEN (NEW.detailed_permissions IS NOT NULL)
  EXECUTE FUNCTION public.sync_legacy_permissions();

-- ============================================
-- 6. CREATE INDEX FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_custom_roles_detailed_perms 
ON public.custom_roles USING gin (detailed_permissions);
