-- Add model_metadata column to model_files for storing verified parsed model data
ALTER TABLE public.model_files
ADD COLUMN IF NOT EXISTS model_metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN public.model_files.model_metadata IS
  'Verified parsed model metadata (volume, dimensions, triangle count) set at upload time';

-- Create an endpoint-friendly RPC to look up model metadata by file URL
CREATE OR REPLACE FUNCTION public.get_model_metadata_by_url(
  p_file_url TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_metadata JSONB;
BEGIN
  SELECT mf.model_metadata INTO v_metadata
  FROM public.model_files mf
  WHERE mf.file_url = p_file_url
    AND (p_user_id IS NULL OR mf.user_id = p_user_id)
  ORDER BY mf.updated_at DESC
  LIMIT 1;

  RETURN v_metadata;
END;
$$;

REVOKE ALL ON FUNCTION public.get_model_metadata_by_url(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_model_metadata_by_url(TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_model_metadata_by_url(TEXT, UUID) TO authenticated;
