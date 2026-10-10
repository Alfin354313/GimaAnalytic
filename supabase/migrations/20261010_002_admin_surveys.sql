-- Phase 6: admin-only survey management. Run manually AFTER phase 5 foundation.
-- Never grant anonymous write access. Existing SELECT policies remain intact.
create policy "surveys_insert_manager" on public.surveys
for insert to authenticated with check (
  created_by = (select auth.uid()) and exists (
    select 1 from public.organization_members m
    where m.organization_id = surveys.organization_id
      and m.user_id = (select auth.uid()) and m.role in ('owner','admin')
  )
);
create policy "surveys_update_manager" on public.surveys
for update to authenticated using (
  exists (select 1 from public.organization_members m
    where m.organization_id = surveys.organization_id
    and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
) with check (
  exists (select 1 from public.organization_members m
    where m.organization_id = surveys.organization_id
    and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
create policy "surveys_delete_draft_manager" on public.surveys
for delete to authenticated using (
  status = 'draft' and exists (select 1 from public.organization_members m
    where m.organization_id = surveys.organization_id
    and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
create policy "questions_insert_draft_manager" on public.survey_questions
for insert to authenticated with check (
  exists (select 1 from public.surveys s
    join public.organization_members m on m.organization_id = s.organization_id
    where s.id = survey_questions.survey_id and s.status = 'draft'
    and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
create policy "questions_delete_draft_manager" on public.survey_questions
for delete to authenticated using (
  exists (select 1 from public.surveys s
    join public.organization_members m on m.organization_id = s.organization_id
    where s.id = survey_questions.survey_id and s.status = 'draft'
    and m.user_id = (select auth.uid()) and m.role in ('owner','admin'))
);
-- Public respondent links, responses, analytics and invitations intentionally
-- remain disabled pending consent, anonymity and abuse-prevention design.
