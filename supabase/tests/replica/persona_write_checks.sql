\set ON_ERROR_STOP 0
create temp table res(test text, result text); grant all on res to anon, authenticated;
-- anon counts (without requests)
begin; set local role anon; select set_config('request.jwt.claims','{}',true);
insert into res select 'anon read', 'partners='||(select count(*) from partners)||' props='||(select count(*) from properties)||' projects='||(select count(*) from projects)||' content='||(select count(*) from site_content);
commit;
-- anon intake (contact / lead form)
do $$ begin
  set local role anon; perform set_config('request.jwt.claims','{}',true);
  insert into public.requests (type,status,requester_name,requester_phone,payload) values ('LEAD','new','Visitor','0100','{"serviceType":"finishing"}');
  insert into res values ('anon creates lead','ok');
exception when others then insert into res values ('anon creates lead','FAIL '||sqlerrm); end $$;
-- finishing partner updates own description, then tries to escalate role
do $$ declare u uuid; begin
  select id into u from public._persona_ids where r='FINISHING_PARTNER';
  set local role authenticated; perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  update public.partners set description_ar='وصف جديد' where id=u;
  insert into res select 'partner edits own profile', case when description_ar='وصف جديد' then 'ok' else 'FAIL' end from public.partners where id=u;
  begin
    update public.partners set role='super_admin' where id=u;
    insert into res select 'partner self-escalation blocked', case when role='super_admin' then 'FAIL (escalated)' else 'ok' end from public.partners where id=u;
  exception when others then insert into res values ('partner self-escalation blocked','ok ('||left(sqlerrm,60)||')'); end;
end $$;
-- developer edits own listing
do $$ declare u uuid; n int; begin
  select id into u from public._persona_ids where r='DEVELOPER_PARTNER';
  set local role authenticated; perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  update public.properties set price = price + 1 where partner_id=u; get diagnostics n = row_count;
  insert into res values ('developer edits own listings', case when n>0 then 'ok ('||n||' rows)' else 'FAIL (0 rows)' end);
exception when others then insert into res values ('developer edits own listings','FAIL '||sqlerrm); end $$;
-- super admin edits another partner
do $$ declare u uuid; n int; begin
  select id into u from public._persona_ids where r='SUPER_ADMIN';
  set local role authenticated; perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  update public.partners set name_en = name_en where role ilike 'finishing_partner'; get diagnostics n = row_count;
  insert into res values ('super admin edits partners', case when n>0 then 'ok ('||n||' rows)' else 'FAIL (0 rows)' end);
  update public.site_content set content = content where key='main_content'; get diagnostics n = row_count;
  insert into res values ('super admin edits site content', case when n>0 then 'ok' else 'FAIL' end);
exception when others then insert into res values ('super admin writes','FAIL '||sqlerrm); end $$;
-- finishing manager sees & updates finishing requests
do $$ declare u uuid; n int; begin
  select id into u from public._persona_ids where r='PLATFORM_FINISHING_MANAGER';
  set local role authenticated; perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated')::text,true);
  update public.requests set updated_at = now() where payload->>'serviceType'='finishing'; get diagnostics n = row_count;
  insert into res values ('finishing manager updates finishing requests', case when n>0 then 'ok ('||n||' rows)' else 'FAIL (0 rows)' end);
exception when others then insert into res values ('finishing manager','FAIL '||sqlerrm); end $$;
reset role;
select test, result from res;
