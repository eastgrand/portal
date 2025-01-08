import React, { Suspense } from 'react';
import { use } from 'react';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const workspace = use(loadUserWorkspace());
  
  return (
    <UserWorkspaceContextProvider value={workspace}>
      {children}
    </UserWorkspaceContextProvider>
  );
}

function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
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