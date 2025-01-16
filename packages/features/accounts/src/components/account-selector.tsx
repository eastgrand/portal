/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { CaretSortIcon, PersonIcon } from '@radix-ui/react-icons';
import { CheckCircle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ExtendedUser extends User {
  raw_app_meta_data?: {
    role?: string;
  };
}

import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Button } from '@kit/ui/button';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@kit/ui/command';
import { If } from '@kit/ui/if';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { CreateTeamAccountDialog } from '../../../team-accounts/src/components/create-team-account-dialog';
import { usePersonalAccountData } from '../hooks/use-personal-account-data';

function UserAvatar(props: { pictureUrl?: string }) {
  return (
    <Avatar className={'h-6 w-6 rounded-sm'}>
      <AvatarImage src={props.pictureUrl} />
      <AvatarFallback>
        <PersonIcon className="h-5 min-h-5 w-5 min-w-5" />
      </AvatarFallback>
    </Avatar>
  );
}

const PersonalAccountAvatar = ({ pictureUrl }: { pictureUrl: string | null | undefined }) => (
  pictureUrl ? (
    <UserAvatar pictureUrl={pictureUrl} />
  ) : (
    <PersonIcon className="h-5 min-h-5 w-5 min-w-5" />
  )
);

export function AccountSelector({
  className,
  user,
  features,
  account,
  accounts,
  selectedAccount,
  userId,
  collapsed = false,
  collisionPadding = 20,
  userRole = 'member',
  onAccountChange,
}: {
  className?: string;
  user: ExtendedUser;
  account?: {
    id: string | null;
    name: string | null;
    picture_url: string | null;
  };
  features: {
    enableTeamCreation: boolean;
  };
  accounts: Array<{
    label: string | null;
    value: string | null;
    image?: string | null;
  }>;
  selectedAccount?: string;
  userId?: string;
  collapsed?: boolean;
  collisionPadding?: number;
  userRole?: 'member' | 'owner' | 'admin' | 'super-admin';
  onAccountChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
  const { t } = useTranslation('teams');
  const { data: personalAccountData } = usePersonalAccountData(
    userId ?? user.id,
    account,
  );

  const isSuperAdmin = useMemo(() => {
    return userRole === 'super-admin';
  }, [userRole]);

  const canCreateTeam = useMemo(() => {
    return isSuperAdmin && features.enableTeamCreation;
  }, [isSuperAdmin, features.enableTeamCreation]);

  const value = useMemo(() => {
    return selectedAccount ?? 'personal';
  }, [selectedAccount]);

  const pictureUrl = personalAccountData?.picture_url;

  const Icon = ({ item }: { item: string }) => {
    return (
      <CheckCircle
        className={cn(
          'ml-auto h-4 w-4',
          value === item ? 'opacity-100' : 'opacity-0',
        )}
      />
    );
  };

  // Determine permissions based on role
  const canInteractWithTeams = true;

  const handleAccountSelect = (currentValue: string) => {
    setOpen(false);

    if (currentValue === 'personal') {
      onAccountChange(undefined);
      window.location.href = '/home';
    } else {
      onAccountChange(currentValue);
      window.location.href = `/home/${currentValue}`;
    }
  };

  const selected = accounts.find((account) => account.value === value);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            data-test={'account-selector-trigger'}
            size={collapsed ? 'icon' : 'default'}
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'dark:shadow-primary/10 group w-full min-w-0 px-2 lg:w-auto lg:max-w-fit',
              {
                'justify-start': !collapsed,
                'm-auto justify-center px-2 lg:w-full': collapsed,
              },
              className,
            )}
          >
            <If
              condition={selected}
              fallback={
                <span className={'flex max-w-full items-center space-x-4'}>
                  <PersonalAccountAvatar pictureUrl={pictureUrl} />

                  <span
                    className={cn('truncate', {
                      hidden: collapsed,
                    })}
                  >
                    <Trans i18nKey={'teams:personalAccount'} />
                  </span>
                </span>
              }
            >
              {(account) => (
                <span className={'flex max-w-full items-center space-x-4'}>
                  <Avatar className={'h-6 w-6 rounded-sm'}>
                    <AvatarImage src={account.image ?? undefined} />

                    <AvatarFallback
                      className={'group-hover:bg-background rounded-sm'}
                    >
                      {account.label ? account.label[0] : ''}
                    </AvatarFallback>
                  </Avatar>

                  <span
                    className={cn('truncate', {
                      hidden: collapsed,
                    })}
                  >
                    {account.label}
                  </span>
                </span>
              )}
            </If>

            <CaretSortIcon
              className={cn('ml-2 h-4 w-4 shrink-0 opacity-50', {
                hidden: collapsed,
              })}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          data-test={'account-selector-content'}
          className="w-full p-0"
          collisionPadding={collisionPadding}
        >
          <Command>
            <CommandInput placeholder={t('searchAccount')} className="h-9" />

            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => handleAccountSelect('personal')}
                  value={'personal'}
                >
                  <PersonalAccountAvatar pictureUrl={pictureUrl} />

                  <span className={'ml-2'}>
                    <Trans i18nKey={'teams:personalAccount'} />
                  </span>
                  <Icon item={'personal'} />
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <If condition={accounts.length > 0}>
                <CommandGroup
                  heading={
                    <Trans
                      i18nKey={'teams:yourTeams'}
                      values={{ teamsCount: accounts.length }}
                    />
                  }
                >
                  {(accounts ?? []).map((account) => (
                    <CommandItem
                      data-test={'account-selector-team'}
                      data-name={account.label}
                      data-slug={account.value}
                      className={cn(
                        'group my-1 flex justify-between transition-colors',
                        {
                          ['bg-muted']: value === account.value,
                          ['cursor-default opacity-70']: !canInteractWithTeams,
                        }
                      )}
                      key={account.value}
                      value={account.value ?? ''}
                      onSelect={handleAccountSelect}
                    >
                      <div className={'flex items-center'}>
                        <Avatar className={'mr-2 h-6 w-6 rounded-sm'}>
                          <AvatarImage src={account.image ?? undefined} />

                          <AvatarFallback
                            className={cn('rounded-sm', {
                              ['bg-background']: value === account.value,
                              ['group-hover:bg-background']: value !== account.value,
                            })}
                          >
                            {account.label ? account.label[0] : ''}
                          </AvatarFallback>
                        </Avatar>

                        <span className={'mr-2 max-w-[165px] truncate'}>
                          {account.label}
                        </span>
                      </div>

                      <Icon item={account.value ?? ''} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </If>

              {canCreateTeam && (
                <>
                  <CommandSeparator />
                  <div className={'p-1'}>
                    <Button
                      data-test={'create-team-account-trigger'}
                      variant="ghost"
                      size={'sm'}
                      className="w-full justify-start text-sm font-normal"
                      onClick={() => {
                        setIsCreatingAccount(true);
                        setOpen(false);
                      }}
                    >
                      <Plus className="mr-3 h-4 w-4" />
                      <span>
                        <Trans i18nKey={'teams:createTeam'} />
                      </span>
                    </Button>
                  </div>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {canCreateTeam && (
        <CreateTeamAccountDialog
          isOpen={isCreatingAccount}
          setIsOpen={setIsCreatingAccount}
        />
      )}
    </>
  );
}