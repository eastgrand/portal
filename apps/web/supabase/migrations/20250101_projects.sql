-- enums for project roles: owner, admin, member
create type public.project_role as enum ('owner', 'admin', 'member');
-- enums for project actions
create type public.project_action as enum (
  'view_project',
  'edit_project',
  'delete_project',
  'invite_member',
  'remove_member'
);
/*
# public.projects
# This table stores the projects for the account
*/
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  name varchar(255) not null,
  description text,
  account_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- revoke access by default to public.projects
revoke all on public.projects from public, service_role;
-- grant access to authenticated users
grant select, insert, update, delete on public.projects to authenticated;
-- indexes on public.projects
create index projects_account_id on public.projects (account_id);
-- RLS policies on public.projects
alter table public.projects enable row level security;
/*
# public.project_members
# This table stores the members of a project
*/
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.project_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
-- make sure there is only one owner per project
create unique index projects_unique_owner on public.project_members (project_id) where role = 'owner';
-- indexes on public.project_members
create index project_members_project_id on public.project_members (project_id);
create index project_members_user_id on public.project_members (user_id);
-- revoke access by default to public.project_members
revoke all on public.project_members from public, service_role;
-- grant access to authenticated users to public.project_members
grant select, insert, update, delete on public.project_members to authenticated;
-- RLS policies on public.project_members
alter table public.project_members enable row level security;
-- public.is_project_member
-- this function checks if a user is a member of a specific project
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
    and user_id = (select auth.uid())
  );
$$ language sql security definer;
grant execute on function public.is_project_member(uuid) to authenticated;
-- public.is_project_admin
-- this function checks if a user is an admin or owner of a specific project
create or replace function public.is_project_admin(p_project_id uuid)
returns boolean
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
    and user_id = (select auth.uid())
    and role in ('owner', 'admin')
  );
$$ language sql;
grant execute on function public.is_project_admin to authenticated;
-- public.is_project_owner
-- check if a user is the owner of a project
create or replace function public.is_project_owner(project_id uuid)
returns boolean
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = $1
    and user_id = (select auth.uid())
    and role = 'owner'
  );
$$ language sql;
grant execute on function public.is_project_owner to authenticated;
-- public.user_has_project_permission
-- check if the current user has the required permissions to perform a specific action on a project
create or replace function public.user_has_project_permission(
  p_user_auth_id uuid,
  p_project_id uuid,
  p_action public.project_action
)
returns boolean
set search_path = ''
as $$
declare
  v_role public.project_role;
begin
  -- first, check if the user is a member of the project
  select role into v_role
  from public.project_members
  where project_id = p_project_id and user_id = p_user_auth_id;
  if v_role is null then
    return false;
  end if;
  -- check permissions based on role and action
  case v_role
    when 'owner' then
      return true;  -- owners can do everything
    when 'admin' then
      return p_action != 'delete_project';  -- admins can do everything except delete the project
    when 'member' then
      return p_action in ('view_project');
    else
      raise exception 'user must be a member of the project to perform this action';
  end case;
end;
$$ language plpgsql;
grant execute on function public.user_has_project_permission to authenticated;
-- public.current_user_has_project_permission
create or replace function public.current_user_has_project_permission(
  p_project_id uuid,
  p_action public.project_action
)
returns boolean
set search_path = ''
as $$
declare
  v_role public.project_role;
begin
  select public.user_has_project_permission((select auth.uid()), p_project_id, p_action);
end;
$$ language plpgsql;
grant execute on function public.current_user_has_project_permission to authenticated;
-- public.current_user_can_manage_project_member
-- Function to check if a user can manage another user in a project
create or replace function public.current_user_can_manage_project_member(
  p_target_member_role public.project_role,
  p_project_id uuid
)
returns boolean
set search_path = ''
as $$
declare
  v_current_user_role public.project_role;
begin
  select role into v_current_user_role
  from public.project_members
  where project_id = p_project_id and user_id = (select auth.uid());
  if v_current_user_role is null or p_target_member_role is null then
    raise exception 'User not found';
  end if;
  -- Check if the manager has a higher role
  return (v_current_user_role = 'owner' and p_target_member_role != 'owner') or
         (v_current_user_role = 'admin' and p_target_member_role = 'member');
end;
$$ language plpgsql;
grant execute on function public.current_user_can_manage_project_member to authenticated;
-- public.update_project_member_role
-- function to update the role of a project member
create or replace function public.update_project_member_role(
  p_user_id uuid,
  p_new_role public.project_role,
  p_project_id uuid
)
returns boolean
set search_path = ''
as $$
declare
  v_current_role public.project_role;
begin
  -- Get the current role of the member
  select role into v_current_role
  from public.project_members
  where project_id = p_project_id and user_id = p_user_id;
  -- Check if the manager can manage this member
  if not public.current_user_can_manage_project_member(v_current_role, p_project_id) then
    raise exception 'Permission denied';
  end if;
  if p_new_role = 'owner' then
    raise exception 'Owner cannot be updated to a different role';
  end if;
  -- Update the member's role
  update public.project_members
  set role = p_new_role
  where project_id = p_project_id and user_id = p_user_id;
  return true;
end;
$$ language plpgsql;
grant execute on function public.update_project_member_role to authenticated;
-- public.can_edit_project
-- check if the user can edit the project
create or replace function public.can_edit_project(p_user_auth_id uuid, p_project_id uuid)
returns boolean
set search_path = ''
as $$
  select public.user_has_project_permission(p_user_auth_id, p_project_id, 'edit_project'::public.project_action);
$$ language sql;
grant execute on function public.can_edit_project to authenticated;
-- public.can_delete_project
-- check if the user can delete the project
create or replace function public.can_delete_project(p_user_auth_id uuid, p_project_id uuid)
returns boolean
set search_path = ''
as $$
  select public.user_has_project_permission(p_user_auth_id, p_project_id, 'delete_project'::public.project_action);
$$ language sql;
grant execute on function public.can_delete_project to authenticated;
-- public.can_invite_project_member
-- check if the user can invite a new member to the project
create or replace function public.can_invite_project_member(p_user_auth_id uuid, p_project_id uuid)
returns boolean
set search_path = ''
as $$
  select public.user_has_project_permission(p_user_auth_id, p_project_id, 'invite_member'::public.project_action);
$$ language sql;
grant execute on function public.can_invite_project_member to authenticated;
/*
RLS POLICIES
*/
-- SELECT(public.projects)
create policy select_projects
  on public.projects
  for select
  to authenticated
  using (
    public.is_project_member(id)
  );
-- INSERT(public.projects)
create policy insert_new_project
  on public.projects
  for insert
  to authenticated
  with check (
    public.has_role_on_account(account_id)
  );
-- DELETE(public.projects)
create policy delete_project
  on public.projects
  for delete
  to authenticated
  using (
    public.can_delete_project((select auth.uid()), id)
  );
-- UPDATE(public.projects)
create policy update_project
  on public.projects
  for update
  to authenticated
  using (
    public.can_edit_project((select auth.uid()), id)
  )
  with check (
    public.can_edit_project((select auth.uid()), id)
  );
-- SELECT(public.project_members)
create policy select_project_members
  on public.project_members
  for select
  to authenticated
  using (
    public.is_project_member(project_id)
  );
-- INSERT(public.project_members)
create policy insert_project_member
  on public.project_members
  for insert
  to authenticated
  with check (
    public.can_invite_project_member(
      (select auth.uid()),
      project_id
    )
  );
-- UPDATE(public.project_members)
create policy update_project_members
  on public.project_members
  for update
  to authenticated
  using (
    public.current_user_can_manage_project_member(
      role,
      project_id
    )
  )
  with check (
    public.current_user_can_manage_project_member(
      role,
      project_id
    )
  );
-- DELETE(public.project_members)
create policy delete_project_members
  on public.project_members
  for delete
  to authenticated
  using (
    public.current_user_can_manage_project_member(
      role,
      project_id
    )
  );
/*
# FUNCTIONS
*/
-- function to add owner of the project creator as the first project member
create or replace function kit.add_project_owner()
returns trigger
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, auth.uid(), 'owner'::public.project_role);
  return new;
end;
$$ language plpgsql security definer;
-- trigger to add owner of the project creator as the first project member
create trigger add_project_owner_on_insert
    after insert on public.projects
    for each row
    execute procedure kit.add_project_owner();
create or replace function public.add_project_member(
  p_project_id uuid,
  p_user_id uuid,
  p_role public.project_role default 'member'
) returns boolean
set search_path = ''
as $$
declare
  v_account_id uuid;
begin
  -- check if the current user has permission to add members
  if not public.is_project_admin(p_project_id) or p_role = 'owner' then
    raise exception 'permission denied';
  end if;
  -- get the account_id for the project
  select account_id into v_account_id
  from public.projects
  where id = p_project_id;
  -- check if the user is a member of the team account
  if not exists (
    select 1 from public.accounts_memberships
    where account_id = v_account_id and user_id = p_user_id
  ) then
    raise exception 'user is not a member of the team account';
  end if;
  -- add the new member (the trigger will enforce the team membership check)
  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, p_user_id, p_role)
  on conflict (project_id, user_id) do update
  set role = excluded.role;
  return true;
end;
$$ language plpgsql;
grant execute on function public.add_project_member to authenticated;
-- TRIGGERS on public.project_members
-- this trigger function ensures that a user being added to a project
-- is already a member of the associated team account
create or replace function kit.check_project_member_in_team()
returns trigger
as $$
declare
  v_account_id uuid;
begin
  select account_id from public.projects
  where id = new.project_id
  into v_account_id;
  if not exists (
    select 1 from public.accounts_memberships
    where account_id = v_account_id and user_id = new.user_id
  ) then
    raise exception 'user must be a member of the team account to be added to the project';
  end if;
  return new;
end;
$$ language plpgsql security definer;
-- we create a trigger that uses the above function
create trigger ensure_project_member_in_team
before insert or update on public.project_members
for each row execute function kit.check_project_member_in_team();