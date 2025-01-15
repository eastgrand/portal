import { use } from 'react';
import { cookies } from 'next/headers';
import { TeamAccountWorkspaceContextProvider } from '@kit/team-accounts/components';
import { PageLayoutStyle } from '@kit/ui/page';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';
import { AppLogo } from '~/components/app-logo';
import { getTeamAccountSidebarConfig } from '~/config/team-account-navigation.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { TeamAccountLayoutSidebar } from './_components/team-account-layout-sidebar';
import { TeamAccountNavigationMenu } from './_components/team-account-navigation-menu';
import { loadTeamWorkspace } from './_lib/server/team-account-workspace.loader';

type TeamWorkspaceLayoutProps = React.PropsWithChildren<{
  params: Promise<{ account: string }>;
}>;

function TeamWorkspaceLayout({ children, params }: TeamWorkspaceLayoutProps) {
  const account = use(params).account;
  const style = use(getLayoutStyle(account));
  return style === 'sidebar' ? <SidebarLayout account={account}>{children}</SidebarLayout> : <HeaderLayout account={account}>{children}</HeaderLayout>;
}

function SidebarLayout({
  account,
  children,
}: React.PropsWithChildren<{
  account: string;
}>) {
  const data = use(loadTeamWorkspace(account));
  const sidebarMinimized = getTeamAccountSidebarConfig(account).sidebarCollapsed;

  return (
    <TeamAccountWorkspaceContextProvider value={data}>
      <SidebarProvider minimized={sidebarMinimized}>
        <div className="min-h-screen">
          <header className="h-16 fixed top-0 left-0 right-0 z-50 flex items-center px-4 bg-white border-b">
            <div className="flex items-center flex-1">
            </div>
            <div className="flex items-center space-x-4">
              <TeamAccountNavigationMenu workspace={data} />
            </div>
          </header>

          <div className="flex w-full">
            <aside className="fixed top-16 h-[calc(100vh-4rem)] bg-white border-r">
              <TeamAccountLayoutSidebar
                account={account}
                accountId={data.account.id}
                accounts={data.accounts.map(({ name, slug, picture_url }) => ({
                  label: name,
                  value: slug,
                  image: picture_url,
                }))}
                user={data.user}
              />
            </aside>
            
            <main 
              className="bg-gray-50 min-h-screen flex-1 w-[calc(100vw-256px)]" 
              style={{ 
                marginLeft: sidebarMinimized ? '80px' : '256px',
                marginTop: '64px'
              }}
            >
              <div className="w-full h-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TeamAccountWorkspaceContextProvider>
  );
}

function HeaderLayout({
  account,
  children,
}: React.PropsWithChildren<{
  account: string;
}>) {
  const data = use(loadTeamWorkspace(account));

  return (
    <TeamAccountWorkspaceContextProvider value={data}>
      <div className="min-h-screen">
        <header className="h-16 fixed top-0 left-0 right-0 z-50 flex items-center px-4 bg-white border-b">
          <div className="flex items-center flex-1">
          </div>
          <div className="flex items-center space-x-4">
            <TeamAccountNavigationMenu workspace={data} />
          </div>
        </header>

        <main className="pt-16 bg-gray-50 min-h-screen w-full">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </TeamAccountWorkspaceContextProvider>
  );
}

async function getLayoutStyle(account: string) {
  const cookieStore = await cookies();
  return (
    (cookieStore.get('layout-style')?.value as PageLayoutStyle) ??
    getTeamAccountSidebarConfig(account).style
  );
}

export default withI18n(TeamWorkspaceLayout);