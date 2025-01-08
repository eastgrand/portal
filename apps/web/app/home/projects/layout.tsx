/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/require-await */
import { use } from 'react';
import { UserWorkspaceContextProvider } from '@kit/accounts/components';
import { withI18n } from '~/lib/i18n/with-i18n';
import { loadUserWorkspace } from '../(user)/_lib/server/load-user-workspace';

async function ProjectsLayout({ children }: React.PropsWithChildren) {
  const workspace = use(loadUserWorkspace());

  return (
    <UserWorkspaceContextProvider value={workspace}>
      <div className="flex min-h-screen flex-col">
        <div className="bg-red-100 p-4">Debug: Layout is rendering with workspace</div>
        {children}
      </div>
    </UserWorkspaceContextProvider>
  );
}

export default withI18n(ProjectsLayout);