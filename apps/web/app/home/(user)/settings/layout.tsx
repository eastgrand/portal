import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Trans } from '@kit/ui/trans';
import { withI18n } from '~/lib/i18n/with-i18n';

// local imports
import { HomeLayoutPageHeader } from '../_components/home-page-header';

function UserSettingsLayout(props: React.PropsWithChildren) {
  return (
    <div className="flex flex-col min-h-full w-full">
      <HomeLayoutPageHeader
        title={<Trans i18nKey={'account:routes.settings'} />}
        description={<AppBreadcrumbs />}
      />

      {props.children}
    </div>
  );
}

export default withI18n(UserSettingsLayout);