import { use } from 'react';
import { cookies } from 'next/headers';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import { Page, PageLayoutStyle, PageMobileNavigation, PageNavigation } from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';
import { AppLogo } from '~/components/app-logo';
import { personalAccountNavigationConfig } from '~/config/personal-account-navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { HomeMenuNavigation } from '../(user)/_components/home-menu-navigation';
import { HomeMobileNavigation } from '../(user)/_components/home-mobile-navigation';
import { HomeSidebar } from '../(user)/_components/home-sidebar';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

function ProjectsLayout({ children }: React.PropsWithChildren) {
  const style = use(getLayoutStyle());
  return style === 'sidebar' ? <SidebarLayout>{children}</SidebarLayout> : <HeaderLayout>{children}</HeaderLayout>;
}

function SidebarLayout({ children }: React.PropsWithChildren) {
  const workspace = use(loadUserWorkspace());
  const sidebarMinimized = personalAccountNavigationConfig.sidebarCollapsed;

  return (
    <UserWorkspaceContextProvider value={workspace}>
      <SidebarProvider minimized={sidebarMinimized}>
        <div className="min-h-screen">
        <header className="h-16 fixed top-0 left-0 right-0 z-50 flex items-center px-4">
  <div className="flex items-center flex-1">
    <AppLogo />
  </div>
  <div className="flex items-center">
    <HomeMenuNavigation workspace={workspace} />
  </div>
</header>

          <div className="flex w-full">
          <aside className="fixed top-16 h-[calc(100vh-4rem)] bg-white border-r">
  <HomeSidebar workspace={workspace} minimized={sidebarMinimized} />
</aside>
            
            <main className="bg-gray-50 min-h-screen flex-1 w-[calc(100vw-256px)]" 
                  style={{ 
                    marginLeft: sidebarMinimized ? '80px' : '256px',
                    marginTop: '64px'
                  }}>
              <div className="w-full h-full">
                {children}
              </div>
            </main>
          </div>
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
        <PageMobileNavigation className="flex items-center justify-between">
          <AppLogo />
          <HomeMobileNavigation workspace={workspace} />
        </PageMobileNavigation>
        {children}
      </Page>
    </UserWorkspaceContextProvider>
  );
}

async function getLayoutStyle() {
  const cookieStore = await cookies();
  return (cookieStore.get('layout-style')?.value as PageLayoutStyle) ?? personalAccountNavigationConfig.style;
}

export default withI18n(ProjectsLayout);