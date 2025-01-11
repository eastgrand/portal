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

import { AppLogo } from '~/components/app-logo';
import { personalAccountNavigationConfig } from '~/config/personal-account-navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';

// home imports
import { HomeMenuNavigation } from '../(user)/_components/home-menu-navigation';
import { HomeMobileNavigation } from '../(user)/_components/home-mobile-navigation';
import { HomeSidebar } from '../(user)/_components/home-sidebar';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

function ProjectsLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());

  if (style === 'sidebar') {
    return <SidebarLayout>{children}</SidebarLayout>;
  }

  return <HeaderLayout>{children}</HeaderLayout>;
}

export default withI18n(ProjectsLayout);

function SidebarLayout({ children }: React.PropsWithChildren) {
  const workspace = use(loadUserWorkspace());
  const sidebarMinimized = personalAccountNavigationConfig.sidebarCollapsed;

  return (
    <UserWorkspaceContextProvider value={workspace}>
      <SidebarProvider minimized={sidebarMinimized}>
        <div className="min-h-screen flex flex-col">
          <header className="h-16 bg-white border-b px-4 flex items-center relative z-50">
            <AppLogo />
            <div className="flex-1" />
            <HomeMenuNavigation workspace={workspace} />
          </header>

          <Page style={'sidebar'} className="flex-1">
  <PageNavigation>
    <div className="pt-0">
      <HomeSidebar workspace={workspace} minimized={sidebarMinimized} />
    </div>
  </PageNavigation>

  <main className="flex-1 bg-gray-50" style={{ paddingLeft: sidebarMinimized ? '80px' : '280px' }}>
    {children}
  </main>
</Page>
        </div>
      </SidebarProvider>
    </UserWorkspaceContextProvider>
  );
}

function HeaderLayout({ children }: React.PropsWithChildren) {
  const workspace = use(loadUserWorkspace());

  return (
    <UserWorkspaceContextProvider value={workspace}>
      <Page style={'header'}>
        <PageNavigation>
          <HomeMenuNavigation workspace={workspace} />
        </PageNavigation>

        <PageMobileNavigation className={'flex items-center justify-between'}>
          <MobileNavigation workspace={workspace} />
        </PageMobileNavigation>

        {children}
      </Page>
    </UserWorkspaceContextProvider>
  );
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

async function getLayoutStyle() {
  const cookieStore = await cookies();

  return (
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    personalAccountNavigationConfig.style
  );
}