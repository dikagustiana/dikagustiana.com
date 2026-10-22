-- content_json backfill, 36 accounting essays: built in the database from each row's own
-- content, written only if every document's md5 equals the one TipTap's generateJSON gave.
begin;

-- TipTap document from the import's stored HTML (the subset generateHTML wrote for
-- the 36 accounting essays: p, h2/h3, ul/ol/li, blockquote, hr, table/tr/th/td,
-- one of strong/em/code/a per text run, &amp; &lt; &gt;). Session-temporary.
create or replace function pg_temp.unent(s text) returns text language sql immutable as $f$
  select replace(replace(replace(replace(replace(s, '&lt;', '<'), '&gt;', '>'), '&quot;', '"'), '&#39;', ''''), '&amp;', '&')
$f$;

create or replace function pg_temp.tiptap_doc(html text) returns jsonb language plpgsql immutable as $f$
declare
  tok text;
  stack jsonb[] := array['{"type":"doc","content":[]}'::jsonb];
  n int;
  mark jsonb := null;
  node jsonb;
  tag text;
  attrs text;
  closing boolean;
  cell_attrs jsonb;
begin
  for tok in select m[1] from regexp_matches(html, '(<[^>]*>|[^<]+)', 'g') as m loop
    n := cardinality(stack);
    if left(tok, 1) = '<' then
      closing := substr(tok, 2, 1) = '/';
      tag := lower(substring(tok from '^</?([a-zA-Z0-9]+)'));
      attrs := coalesce(substring(tok from '^</?[a-zA-Z0-9]+(.*)>$'), '');
      if tag in ('colgroup', 'col', 'tbody', 'thead') then
        continue;
      elsif tag in ('strong', 'em', 'code', 'a') then
        if closing then
          mark := null;
        elsif tag = 'strong' then mark := '{"type":"bold"}';
        elsif tag = 'em' then mark := '{"type":"italic"}';
        elsif tag = 'code' then mark := '{"type":"code"}';
        else
          mark := jsonb_build_object('type', 'link', 'attrs', jsonb_build_object(
            'href', pg_temp.unent(substring(attrs from 'href="([^"]*)"')),
            'target', pg_temp.unent(substring(attrs from 'target="([^"]*)"')),
            'rel', pg_temp.unent(substring(attrs from 'rel="([^"]*)"')),
            'class', pg_temp.unent(substring(attrs from 'class="([^"]*)"')),
            'title', pg_temp.unent(substring(attrs from 'title="([^"]*)"'))));
        end if;
        continue;
      elsif tag = 'hr' then
        stack[n] := jsonb_set(stack[n], '{content}', (stack[n] -> 'content') || '[{"type":"horizontalRule"}]'::jsonb);
        continue;
      end if;

      if not closing then
        cell_attrs := jsonb_build_object('align', null, 'colwidth', null,
          'colspan', coalesce(substring(attrs from 'colspan="([0-9]+)"')::int, 1),
          'rowspan', coalesce(substring(attrs from 'rowspan="([0-9]+)"')::int, 1));
        node := case tag
          when 'p' then '{"type":"paragraph","attrs":{"textAlign":null},"content":[]}'::jsonb
          when 'h1' then '{"type":"heading","attrs":{"level":1,"textAlign":null},"content":[]}'::jsonb
          when 'h2' then '{"type":"heading","attrs":{"level":2,"textAlign":null},"content":[]}'::jsonb
          when 'h3' then '{"type":"heading","attrs":{"level":3,"textAlign":null},"content":[]}'::jsonb
          when 'h4' then '{"type":"heading","attrs":{"level":4,"textAlign":null},"content":[]}'::jsonb
          when 'ul' then '{"type":"bulletList","content":[]}'::jsonb
          when 'ol' then jsonb_build_object('type', 'orderedList', 'content', '[]'::jsonb, 'attrs',
                          jsonb_build_object('start', coalesce(substring(attrs from 'start="([0-9]+)"')::int, 1), 'type', null))
          when 'li' then '{"type":"listItem","content":[]}'::jsonb
          when 'blockquote' then '{"type":"blockquote","attrs":{"variant":"quote"},"content":[]}'::jsonb
          when 'table' then '{"type":"table","content":[]}'::jsonb
          when 'tr' then '{"type":"tableRow","content":[]}'::jsonb
          when 'th' then jsonb_build_object('type', 'tableHeader', 'attrs', cell_attrs, 'content', '[]'::jsonb)
          when 'td' then jsonb_build_object('type', 'tableCell', 'attrs', cell_attrs, 'content', '[]'::jsonb)
        end;
        if node is null then
          raise exception 'unhandled tag <%>', tag;
        end if;
        stack := stack || node;
      else
        node := stack[n];
        stack := stack[1:n - 1];
        if jsonb_array_length(node -> 'content') = 0 then
          node := node - 'content';
        end if;
        stack[n - 1] := jsonb_set(stack[n - 1], '{content}', (stack[n - 1] -> 'content') || jsonb_build_array(node));
      end if;
    else
      node := jsonb_build_object('type', 'text', 'text', pg_temp.unent(tok));
      if mark is not null then
        node := node || jsonb_build_object('marks', jsonb_build_array(mark));
      end if;
      stack[n] := jsonb_set(stack[n], '{content}', (stack[n] -> 'content') || jsonb_build_array(node));
    end if;
  end loop;
  if cardinality(stack) <> 1 then
    raise exception 'unbalanced html: % open', cardinality(stack) - 1;
  end if;
  return stack[1];
end
$f$;

create temp table expected (id uuid primary key, content_md5 text not null, doc_md5 text not null) on commit drop;
insert into expected values
  ('1dd0a7ad-6098-4615-bf5d-94ca2decb699'::uuid, 'abf2c6094f30c83bc264d62fb2893364', '9b31e80dc98f4cef320587d1cff228fe'),
  ('edfe0641-4ab9-4978-9faf-790f494d7bb1'::uuid, 'ac80a4601ae9923b54830b481934efc3', '2a61e74c72bfe3cc7a6774a4f79e11b8'),
  ('9d9e015d-22ec-409b-863c-788653d84d50'::uuid, '8414e59cd09e1b173acfa02c1c296171', 'bf076a6d21e6a428cd084534734ed75f'),
  ('d64f7bdf-ee33-4484-98bf-4ff3c136e469'::uuid, 'b96b7c8cf9e7417e3b6e7c9f21ec2ec8', '22afe9bd1851d8eb9fadbdde3eb7813c'),
  ('31865371-572a-48b7-96fe-03d502d3ddf9'::uuid, '27c329fa74299c98ca791d02f5142b95', 'ac858bb520a360ecb8395fca7acf20a9'),
  ('4146bf74-cfa6-4833-a95c-11f44131c80f'::uuid, '9f4ced497a0523037acc1059dc0e6e5f', '6fff33260a2dc33beecad48f0471fa77'),
  ('d7acd544-a882-41bc-b9de-68981b29ade8'::uuid, '9bf40a5de1007fc70075c3151901b5c3', '8bd5cd734a1a905053cc80bac2468b9f'),
  ('8e26845c-467c-4c83-b593-a0c647e354be'::uuid, 'a0829f570ef6d752fd50576e498a541b', '046bd3968a5fd130818f0b6f40abff46'),
  ('4af0724c-712f-4fa7-8cff-9e640cf00627'::uuid, 'c12aa247658e1b306501d0dee3260f86', 'fb4a1474f5435cd5b12da68767942d2b'),
  ('a26e639f-4bb5-43a2-8119-f77003148ec2'::uuid, 'f400cf084f6f1715f50f88070608e931', '7ae051bb6cdb4a0583e99bc05db4dd18'),
  ('2671e055-567e-4d34-83e3-178af2661656'::uuid, '7730c6baecf7d6a3016baa52714ee5ee', '6d65b1e4769212e8b7492ed90511c508'),
  ('14a25fdc-7f5b-4d0d-9fac-e3b2cf6c8f2c'::uuid, 'a3350dcabba3f79960ee582d387776b3', '71ccdf97aa936e4c7cbe87bd4ee15f00'),
  ('072a003d-0fb4-488b-bc5e-ac0fc130e6de'::uuid, 'c1e985c1a3c0c9bee3cf5dfc60b3b74b', '36550a958cb9c5e983661833409f33c5'),
  ('5ce9af9a-af6c-4e3f-b924-155969777f74'::uuid, 'ca8aa0dcc402861d9404bd2ec575c884', '614637fc889e20c5970972ce364a87b9'),
  ('5910e0a4-08c0-46f4-af2f-8d14c0133676'::uuid, '685924979be44988986c7ff671ff61e1', '2a8d020a129e31a134b73f862ef50d95'),
  ('024cc475-7902-4b1e-ad3f-97e432c92c43'::uuid, 'ea13c0c970d2a454fb5d79422d1e565e', '111046567ccd79c3ba460b5d50aff08b'),
  ('29be61c1-9966-4d98-906b-b522bf8f8108'::uuid, '76e668ef793b7109974c9ce520f2f5a8', 'a24f6695cca647e4a214bf6784afe853'),
  ('ff940d50-0c65-48a8-8459-9f0457aa0c40'::uuid, '6a546405b42eab06bc8e931a6684da9c', '5e92c12cebea607d43a34de525e3f3c9'),
  ('5e8874e3-0e04-4270-ba48-0e7bd2edba2e'::uuid, '904a5a6c196ea197feb03c319a751ff5', '81bb501ed8bad0e417119ab7255f8ea4'),
  ('103737ec-579a-4330-a996-adf381d57bbe'::uuid, '5352b46ddb06944702d24c7df048823d', 'f36c7a0e629a1638909474d26aaf7b94'),
  ('bfe42851-b6bc-480b-9d14-5572fc9e1272'::uuid, '4a1d28a38e957671623de1957a1e70d0', 'a8264ac7965d51cda5d3a251b1cfe7de'),
  ('e7716f4d-6d57-443d-9221-92b00916bbd7'::uuid, 'ff350bbe3021d7143f99193aaffd5754', '746a87ed62c8246b5509ac20a98a6a16'),
  ('d035aea1-7784-4c3c-9da1-d942b016fedc'::uuid, 'dd8f3335e1738ebb73b73b296e0e54af', 'e5b5a70699204f4e476d46d3b6109eb8'),
  ('aab4ee41-2d26-4015-85c2-6c81bba23314'::uuid, '4001e591c05141ac7ac01257a56da2e9', '9e14c7dde7b4ab6665441266a982dbb8'),
  ('2d6391ad-0b0d-472c-a2d9-1db6ecfc014a'::uuid, '64a6ac56ebd51e374a312a5f2565301c', '7329576dd5f4a46694d504e64e0afd13'),
  ('607700de-8b2a-4086-bb39-03f553b3dfed'::uuid, '6fbfd5861ad3b4e88f424fd1fe6bf569', '3947db2dd090c5c53ced8b7b001e19c8'),
  ('ef880563-d83f-44ad-a3d7-4ae2cec54d82'::uuid, '8fccd68b31b3fdbb6eb5e51bab774fde', 'c517bcc1ec6b6f89e29566f30f544f6d'),
  ('2eb7a514-cb2d-4ebf-b316-8a1b0b1b2b98'::uuid, 'd508cbaa77576165154e682fc022d861', '2f472454a8375af48e48458d718ac0d3'),
  ('d0e39c63-c632-4985-bbaf-2d0dfb91dcf4'::uuid, 'b245022060d293eade4d5315b6da2611', '1136227076bd50695c5bc4c6877e631e'),
  ('363824fb-fc9b-4087-b955-c0622b5148b3'::uuid, '7b6b491f46dd12f8d4081fbb81ccde0f', '1d159c3a01bf80b23f0615e1f3c7ddf4'),
  ('1f457ee0-84b2-49ad-81bc-7e075c96513e'::uuid, 'a37992149484beec91ea55e7fa9e5376', '1626b952dd839fb8627f7e1080829d3a'),
  ('d29a13f3-0f60-4efe-b744-172af36d2d62'::uuid, '3aa1306703c422af0c4c04baa2801cde', '17cb7c08863ff420ef9a67afd5e5b48d'),
  ('7f56ddf3-eb7b-4ec4-9216-919e7b1b853c'::uuid, '24d72e7928daacd9fac4a2b486e5c2bd', 'f90d618132352d460db4d755ba5d82c7'),
  ('7dbd6dc0-0e0a-43c3-92ab-b41c2fc36c3b'::uuid, 'ce2b64a2edb42f43534ee358d1eb6fb8', '183e324cf930482d3740731f16388a59'),
  ('a1561fc6-765d-4fc0-84b1-a5da1a890033'::uuid, 'd58db82fdcf6b3c3adc2182132e153e9', '12b432799f964f1fd73e55cae8bccd49'),
  ('ff2f67b2-8acc-408d-84c4-c5d044c7d648'::uuid, '4409ed06553e0041de6ce342fc67b0cb', '64fe7deae18fdc6f9c372d2b8419f552');

create temp table built on commit drop as
  select e.id, pg_temp.tiptap_doc(e.content) as doc
    from public.essays e join expected x on x.id = e.id
   where e.section = 'accounting' and e.content_json is null and md5(e.content) = x.content_md5;

do $chk$
declare total int; exact int;
begin
  select count(*), count(*) filter (where md5(b.doc::text) = x.doc_md5) into total, exact
    from built b join expected x on x.id = b.id;
  if total <> 36 or exact <> 36 then
    raise exception 'refusing to write: % rows eligible, % documents exact (want 36 and 36)', total, exact;
  end if;
end
$chk$;

-- Keep updated_at: a storage-format change, not an edit.
alter table public.essays disable trigger update_essays_updated_at;

with up as (
  update public.essays e
     set content_json = b.doc
    from built b
   where e.id = b.id and e.content_json is null
  returning e.id, e.title, e.snippet, e.status, e.content_json
), rev as (
  insert into public.essay_revisions (essay_id, revision_no, change_type, title, snippet, content_json, status, change_summary, changed_by)
  select up.id, coalesce((select max(r.revision_no) from public.essay_revisions r where r.essay_id = up.id), 0) + 1, 'migration',
         up.title, up.snippet, up.content_json, up.status,
         'content_json backfilled: the TipTap document the stored content was serialised from (accounting import, 22 Oct 2026). content unchanged.', null
    from up
  returning essay_id
)
select (select count(*) from up) as rows_written, (select count(*) from rev) as revisions_written;

alter table public.essays enable trigger update_essays_updated_at;
commit;
