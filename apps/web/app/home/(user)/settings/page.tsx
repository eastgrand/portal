import { use } from 'react';
import { PersonalAccountSettingsContainer } from '@kit/accounts/personal-account-settings';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Trans } from '@kit/ui/trans';

import authConfig from '~/config/auth.config';
import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

const features = {
  enableAccountDeletion: featureFlagsConfig.enableAccountDeletion,
  enablePasswordUpdate: authConfig.providers.password,
};

const callbackPath = pathsConfig.auth.callback;
const accountHomePath = pathsConfig.app.accountHome;

const paths = {
  callback: callbackPath + `?next=${accountHomePath}`,
};

export const generateMetadata = async () => {
  const i18n = await createI18nServerInstance();
  const title = i18n.t('account:settingsTab');

  return {
    title,
  };
};

function PersonalAccountSettingsPage() {
  const user = use(requireUserInServerComponent());

  return (
    <div className="flex flex-col min-h-full w-full bg-gray-50">
      <div className="flex flex-col gap-1 px-8 py-6">
        <AppBreadcrumbs />
        <h1 className="text-xl font-semibold">
          <Trans i18nKey="account:settingsTab" />
        </h1>
      </div>

      <div className="px-8 pb-8">
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <div className="flex w-full flex-1 flex-col lg:max-w-2xl">
              <PersonalAccountSettingsContainer
                userId={user.id}
                features={features}
                paths={paths}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withI18n(PersonalAccountSettingsPage);