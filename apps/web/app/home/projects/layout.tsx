import React, { Suspense } from 'react';
import { use } from 'react';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import { Page, PageNavigation } from '@kit/ui/page';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';
import { HomeMenuNavigation } from '../(user)/_components/home-menu-navigation';

function LayoutContent({ children, workspace }: { 
  children: React.ReactNode;
  workspace: Awaited<ReturnType<typeof loadUserWorkspace>>;
}) {
  return (
    <Page style="header">
      <PageNavigation>
        <HomeMenuNavigation workspace={workspace} />
      </PageNavigation>
      <main>
        {children}
      </main>
    </Page>
  );
}

function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const workspace = use(loadUserWorkspace());
  
  return (
    <UserWorkspaceContextProvider value={workspace}>
      <LayoutContent workspace={workspace}>
        {children}
      </LayoutContent>
    </UserWorkspaceContextProvider>
  );
}

function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="bg-red-100 p-4">Debug: Layout is rendering</div>
      <Suspense fallback={<div className="p-4">Loading workspace...</div>}>
        <WorkspaceProvider>
          {children}
        </WorkspaceProvider>
      </Suspense>
    </div>
  );
}

export default withI18n(ProjectsLayout);