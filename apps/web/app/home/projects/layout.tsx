/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from 'react';
import { use } from 'react';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';
import React from 'react';

class ErrorBoundaryFallback extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
}> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function WorkspaceProvider({ children }: React.PropsWithChildren) {
  const workspace = use(loadUserWorkspace());
  
  return (
    <UserWorkspaceContextProvider value={workspace}>
      {children}
    </UserWorkspaceContextProvider>
  );
}

export default withI18n(function ProjectsLayout({ children }: React.PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-red-100 p-4">Debug: Layout is rendering</div>
      <ErrorBoundaryFallback fallback={<div className="p-4">Error loading workspace</div>}>
        <Suspense fallback={<div className="p-4">Loading workspace...</div>}>
          <WorkspaceProvider>
            {children}
          </WorkspaceProvider>
        </Suspense>
      </ErrorBoundaryFallback>
    </div>
  );
});