
-- materials: admin manages, registered students can read
CREATE POLICY "admin manage materials storage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'materials' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'materials' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "registered read materials storage" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'materials' AND (
    public.has_role(auth.uid(),'admin') OR
    EXISTS (
      SELECT 1 FROM public.course_materials cm
      JOIN public.registrations r ON r.course_id = cm.course_id
      WHERE cm.storage_path = storage.objects.name AND r.user_id = auth.uid()
    )
  ));

-- homework: user manages own folder (path prefix = user_id/), admin reads all
CREATE POLICY "user upload own homework" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homework' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "user read own homework" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'homework' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "user delete own homework" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'homework' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));
