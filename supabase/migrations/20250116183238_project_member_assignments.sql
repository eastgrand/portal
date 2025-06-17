-- First drop existing functions and triggers that we'll be updating
drop function if exists public.accept_invitation cascade;
drop function if exists public.map_account_role_to_project_role cascade;
drop function if exists public.enforce_project_role_hierarchy cascade;
drop view if exists public.user_accounts cascade;

-- Recreate the user_accounts view with role restrictions
create or replace view public.user_accounts (id, name, picture_url, slug, role)
with (security_invoker = true) as
select
    account.id,
    account.name,
    account.picture_url,  
    account.slug,
    membership.account_role
from public.accounts account
join public.accounts_memberships membership 
    on account.id = membership.account_id
where membership.user_id = auth.uid()
    and account.is_personal_account = false
    and membership.account_role in ('owner', 'admin')
    and account.id in (
        select account_id 
        from public.accounts_memberships
        where user_id = auth.uid()
    );

grant select on public.user_accounts to authenticated, service_role;

-- Create helper function for role mapping
create or replace function public.map_account_role_to_project_role(account_role text)
returns public.project_role
language sql
as $$
    select case 
        when account_role = 'owner' then 'owner'::project_role
        when account_role = 'admin' then 'admin'::project_role
        else 'member'::project_role
    end;
$$;

grant execute on function public.map_account_role_to_project_role(text) to authenticated, service_role;

-- Create project role hierarchy enforcement
create or replace function public.enforce_project_role_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    user_account_role text;
begin
    -- Get user's role in the account
    select am.account_role into user_account_role
    from public.accounts_memberships am
    join public.projects p on p.account_id = am.account_id
    where p.id = NEW.project_id
    and am.user_id = NEW.user_id;

    -- Set project role based on account role
    NEW.role = public.map_account_role_to_project_role(user_account_role);
    
    return NEW;
end;
$$;

create trigger enforce_project_role_hierarchy_trigger
    before insert or update on public.project_members
    for each row execute function public.enforce_project_role_hierarchy();

-- Update accept_invitation function to handle project assignments
create or replace function public.accept_invitation(token text, user_id uuid) 
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
    target_account_id uuid;
    target_role varchar(50);
    
    -- Create a variable to store the account slug
    target_account_slug text;
begin
    -- Get the invitation details and account slug
    select i.account_id, i.role, a.slug 
    into target_account_id, target_role, target_account_slug
    from public.invitations i
    join public.accounts a on a.id = i.account_id
    where i.invite_token = token and i.expires_at > now();
    
    if not found then
        raise exception 'Invalid or expired invitation token';
    end if;

    -- Store the account slug in a session variable that can be retrieved later
    perform set_config('app.account_slug', target_account_slug, false);

    -- Add user to account membership
    insert into public.accounts_memberships(
        user_id,
        account_id,
        account_role)
    values (
        accept_invitation.user_id,
        target_account_id,
        target_role);

    -- Add user to all projects of the team with mapped role
    insert into public.project_members(
        user_id,
        project_id,
        role,
        created_at,
        updated_at)
    select
        accept_invitation.user_id,
        p.id,
        public.map_account_role_to_project_role(target_role),
        now(),
        now()
    from public.projects p
    where p.account_id = target_account_id;

    -- Delete the invitation
    delete from public.invitations
    where invite_token = token;

    -- Return the account ID (maintains original return type)
    return target_account_id;
end;
$$;

grant execute on function public.accept_invitation(text, uuid) to service_role;