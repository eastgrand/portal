'use client';

import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

import { AccountSelector } from '@kit/accounts/account-selector';

import featureFlagsConfig from '~/config/feature-flags.config';
import pathsConfig from '~/config/paths.config';

interface ExtendedUser extends User {
  raw_app_meta_data?: {
    role?: string;
  };
}

const features = {
  enableTeamCreation: featureFlagsConfig.enableTeamCreation,
};

export function TeamAccountAccountsSelector(params: {
  selectedAccount: string;
  userId: string;
  accounts: Array<{
    label: string | null;
    value: string | null;
    image: string | null;
  }>;
  user: ExtendedUser; // Add this new required prop
  collapsed?: boolean;
}) {
  const router = useRouter();

  return (
    <AccountSelector
      selectedAccount={params.selectedAccount}
      accounts={params.accounts}
      userId={params.userId}
      collapsed={params.collapsed}
      features={features}
      user={params.user} // Pass the user prop to AccountSelector
      onAccountChange={(value) => {
        const path = value
          ? pathsConfig.app.accountHome.replace('[account]', value)
          : pathsConfig.app.home;

        router.replace(path);
      }}
    />
  );
}