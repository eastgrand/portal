# Claude Code Configuration - EastGrand Portal

## ⚠️ Multi-Project Workspace (CRITICAL)

This project is part of a multi-project VS Code workspace. **ALWAYS verify which repo you're in before git operations.**

### Repository Mapping

| Directory | Repo | Package Manager | Remote |
|-----------|------|-----------------|--------|
| `/Users/voldeck/code/pol` | Political App | npm | `github.com/eastgrand/pol.git` |
| `/Users/voldeck/code/portal` | **Auth Portal (THIS REPO)** | pnpm | `github.com/eastgrand/portal.git` |

### Git Safety Rules

```bash
# ALWAYS check your current directory before git commands
pwd

# ALWAYS verify the remote before pushing
git remote -v

# Use absolute paths when unsure
git -C /Users/voldeck/code/pol status
git -C /Users/voldeck/code/portal status
```

### Before ANY Git Push

1. **Verify directory**: `pwd` should show `/Users/voldeck/code/portal` for this repo
2. **Verify remote**: `git remote -v` should show `eastgrand/portal.git`
3. **Verify branch**: `git branch` to confirm correct branch

---

## Quick Reference

### Essential Commands
```bash
pnpm install         # Install dependencies
pnpm run dev         # Start dev server (port 3001)
pnpm run build       # Build all packages
pnpm run typecheck   # TypeScript only
```

### Supabase Commands
```bash
# Link to project (one-time)
npx supabase link --project-ref ubztcaujjqlcfhboznnx

# Push migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --project-id ubztcaujjqlcfhboznnx > packages/supabase/src/database.types.ts
```

---

## Project Overview

**EastGrand Portal** - Centralized authentication and team management portal for all client applications.

**Stack**: MakerKit SaaS Starter, Turborepo, Next.js 15, Supabase
**Repository**: https://github.com/eastgrand/portal.git

### Project Structure

```
portal/
├── apps/
│   └── web/                    # Main portal Next.js app
│       └── app/
│           └── home/[account]/ # Team dashboard routes
├── packages/
│   ├── features/               # Feature modules
│   │   ├── auth/               # Authentication
│   │   ├── team-accounts/      # Team management
│   │   └── admin/              # Admin features
│   ├── supabase/               # Database types & client
│   └── ui/                     # Shared UI components
├── supabase/
│   └── migrations/             # Database migrations (SINGLE SOURCE OF TRUTH)
└── turbo.json                  # Turborepo config
```

### Key Files

| Purpose | File |
|---------|------|
| Database Types | `packages/supabase/src/database.types.ts` |
| Account Service | `packages/features/team-accounts/src/server/services/` |
| Projects Service | `apps/web/app/home/[account]/projects/_lib/server/` |
| Migrations | `supabase/migrations/` |

---

## Multi-User Environment

See `/Users/voldeck/code/pol/docs/MULTI-USER-ENVIRONMENT.md` for the full architecture plan including:
- Role hierarchy (Super Admin → Team Admin → Team Member)
- Feature permissions system
- Portal-gated authentication flow
- Database schema changes

### Shared Resources
- **Supabase Project**: `ubztcaujjqlcfhboznnx`
- **Migrations**: This repo owns all migrations
- **Political App**: `/Users/voldeck/code/pol` consumes auth/permissions

---

## Development Rules

### Critical DON'Ts
1. **DON'T push to pol repo** - Verify `git remote -v` shows `portal.git`
2. **DON'T run npm** - This project uses pnpm
3. **DON'T edit database directly** - Use migrations in `supabase/migrations/`
4. **DON'T duplicate types** - Generate from Supabase schema

### Package Manager
This project uses **pnpm** (not npm). Always use:
```bash
pnpm install
pnpm add <package>
pnpm run <script>
```

---

## Workspace Info

- **Workspace file**: `/Users/voldeck/code/eastgrand.code-workspace`
- **Open with**: `code /Users/voldeck/code/eastgrand.code-workspace`
- **Dev setup guide**: `/Users/voldeck/code/pol/docs/DEV-SETUP-MULTI-PROJECT.md`
