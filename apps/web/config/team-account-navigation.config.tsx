import { CreditCard, FolderKanban, HelpCircle, LayoutDashboard, Settings, Users } from 'lucide-react';

import { NavigationConfigSchema } from '@kit/ui/navigation-schema';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

const iconClasses = 'w-4';

const getRoutes = (account: string) => [
  {
    label: 'common:routes.application',
    children: [
      {
        label: 'common:routes.dashboard',
        path: `/home/${account}`,
        Icon: <LayoutDashboard className={iconClasses} />,
        end: true,
      },
      {
        label: 'common:routes.projects',
        path: `/home/${account}/projects`,
        Icon: <FolderKanban className={iconClasses} />,
     },
    ],
  },
  {
    label: 'common:routes.settings',
    collapsible: false,
    children: [
      {
        label: 'common:routes.settings',
        path: createPath(pathsConfig.app.accountSettings, account),
        Icon: <Settings className={iconClasses} />,
      },
      {
        label: 'common:routes.members',
        path: createPath(pathsConfig.app.accountMembers, account),
        Icon: <Users className={iconClasses} />,
      },
      featureFlagsConfig.enableTeamAccountBilling
        ? {
            label: 'common:routes.billing',
            path: createPath(pathsConfig.app.accountBilling, account),
            Icon: <CreditCard className={iconClasses} />,
          }
        : undefined,
    ].filter(Boolean),
  },
  {
    label: 'common:routes.help',
    collapsible: false,
    children: [
      {
        label: 'common:routes.userGuide',
        path: '/docs/user-guide.pdf',
        Icon: <HelpCircle className={iconClasses} />,
        // This will be handled with an onClick in the component
      },
    ],
  },
];

export function getTeamAccountSidebarConfig(account: string) {
  return NavigationConfigSchema.parse({
    routes: getRoutes(account),
    style: process.env.NEXT_PUBLIC_TEAM_NAVIGATION_STYLE,
    sidebarCollapsed: process.env.NEXT_PUBLIC_TEAM_SIDEBAR_COLLAPSED,
  });
}

function createPath(path: string, account: string) {
  return path.replace('[account]', account);
}
