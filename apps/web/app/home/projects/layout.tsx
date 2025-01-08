import React, { Suspense } from 'react';
import { use } from 'react';
import { cookies } from 'next/headers';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import {
  Page,
  PageLayoutStyle,
  PageMobileNavigation,
  PageNavigation,
} from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';
import { Toaster } from '@kit/ui/toaster';
import { AppLogo } from '~/components/app-logo';
import { personalAccountNavigationConfig } from '~/config/personal-account-navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { HomeMenuNavigation } from '../(user)/_components/home-menu-navigation';
import { HomeMobileNavigation } from '../(user)/_components/home-mobile-navigation';
import { HomeSidebar } from '../(user)/_components/home-sidebar';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

async function getLayoutStyle() {
  const cookieStore = await cookies();
  return (cookieStore.get('layout-style')?.value as PageLayoutStyle) 
    ?? personalAccountNavigationConfig.style;
}

function MobileNavigation({
  workspace,
}: {
  workspace: Awaited<ReturnType<typeof loadUserWorkspace>>;
}) {
  return (
    <>
      <AppLogo />
      <HomeMobileNavigation workspace={workspace} />
    </>
  );
}

function HeaderLayout({ children, workspace }: { 
  children: React.ReactNode;
  workspace: Awaited<ReturnType<typeof loadUserWorkspace>>;
}) {
  return (
    <Page style="header">
      <PageNavigation>
        <HomeMenuNavigation workspace={workspace} />
      </PageNavigation>

      <PageMobileNavigation className="flex items-center justify-between">
        <MobileNavigation workspace={workspace} />
      </PageMobileNavigation>

      {children}
      <Toaster />
    </Page>
  );
}

function SidebarLayout({ children, workspace }: {
  children: React.ReactNode;
  workspace: Awaited<ReturnType<typeof loadUserWorkspace>>;
}) {
  const sidebarMinimized = personalAccountNavigationConfig.sidebarCollapsed;
  
  return (
    <SidebarProvider minimized={sidebarMinimized}>
      <Page style="sidebar">
        <PageNavigation>
          <HomeSidebar workspace={workspace} minimized={sidebarMinimized} />
        </PageNavigation>

        <PageMobileNavigation className="flex items-center justify-between">
          <MobileNavigation workspace={workspace} />
        </PageMobileNavigation>

        {children}
        <Toaster />
      </Page>
    </SidebarProvider>
  );
}

function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const workspace = use(loadUserWorkspace());
  const style = use(getLayoutStyle());
  
  return (
    <UserWorkspaceContextProvider value={workspace}>
      {style === 'sidebar' ? (
        <SidebarLayout workspace={workspace}>
          {children}
        </SidebarLayout>
      ) : (
        <HeaderLayout workspace={workspace}>
          {children}
        </HeaderLayout>
      )}
    </UserWorkspaceContextProvider>
  );
}

export default withI18n(function ProjectsLayout({ 
  children 
}: { 
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="p-4">Loading workspace...</div>}>
      <WorkspaceLayout>
        {children}
      </WorkspaceLayout>
    </Suspense>
  );
});