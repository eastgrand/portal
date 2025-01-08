import { Suspense } from 'react';
import { use } from 'react';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

function LoadWorkspaceContent({ children }: React.PropsWithChildren) {
  try {
    const workspace = use(loadUserWorkspace());
    
    return (
      <UserWorkspaceContextProvider value={workspace}>
        {children}
      </UserWorkspaceContextProvider>
    );
  } catch (error) {
    console.error('Error loading workspace:', error);
    return (
      <div className="flex min-h-screen flex-col">
        <div className="bg-red-100 p-4">Error loading workspace</div>
        <div className="p-4">{error instanceof Error ? error.message : 'Unknown error'}</div>
      </div>
    );
  }
}

export default withI18n(function ProjectsLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-red-100 p-4">Debug: Layout is rendering</div>
      <Suspense fallback={
        <div className="flex min-h-screen flex-col">
          <div className="p-4">Loading workspace...</div>
        </div>
      }>
        <LoadWorkspaceContent>
          {children}
        </LoadWorkspaceContent>
      </Suspense>
    </div>
  );
});