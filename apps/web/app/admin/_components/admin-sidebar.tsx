'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { BarChart3, LayoutDashboard, Shield, Users } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
} from '@kit/ui/shadcn-sidebar';

import { AppLogo } from '~/components/app-logo';
import { ProfileAccountDropdownContainer } from '~/components/personal-account-dropdown-container';

export function AdminSidebar() {
  const path = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className={'m-2'}>
          <AppLogo href={'/admin'} />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuButton isActive={path === '/admin'} asChild>
                  <Link className={'flex gap-2.5'} href={'/admin'}>
                    <LayoutDashboard className={'h-4'} />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>

                <SidebarMenuButton
                  isActive={path.includes('/admin/accounts')}
                  asChild
                >
                  <Link
                    className={'flex size-full gap-2.5'}
                    href={'/admin/accounts'}
                  >
                    <Users className={'h-4'} />
                    <span>Accounts</span>
                  </Link>
                </SidebarMenuButton>

                <SidebarMenuButton
                  isActive={path.includes('/admin/users')}
                  asChild
                >
                  <Link
                    className={'flex size-full gap-2.5'}
                    href={'/admin/users'}
                  >
                    <Shield className={'h-4'} />
                    <span>Users</span>
                  </Link>
                </SidebarMenuButton>

                <SidebarMenuButton
                  isActive={path.includes('/admin/analytics')}
                  asChild
                >
                  <Link
                    className={'flex size-full gap-2.5'}
                    href={'/admin/analytics'}
                  >
                    <BarChart3 className={'h-4'} />
                    <span>Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <ProfileAccountDropdownContainer />
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
