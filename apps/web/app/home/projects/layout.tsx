import React, { Suspense } from 'react';
import { use } from 'react';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

class ErrorBoundaryFallback extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const workspace = use(loadUserWorkspace());
  
  return (
    <UserWorkspaceContextProvider value={workspace}>
      {children}
    </UserWorkspaceContextProvider>
  );
}

export default withI18n(function ProjectsLayout({ children }: { children: React.ReactNode }) {
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