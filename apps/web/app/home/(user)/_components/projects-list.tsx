'use client';

import { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { CaretSortIcon, PersonIcon } from '@radix-ui/react-icons';
import { CheckCircle, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

import { CreateTeamAccountDialog } from '@kit/team-accounts/components';

type UserRole = 'owner' | 'admin' | 'member' | 'super-admin';

interface ExtendedUser extends Omit<User, 'role'> {
  role?: UserRole;
  app_metadata: {
    role?: UserRole;
  };
}

function SelectionIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <CheckCircle
      className={cn(
        'ml-auto h-4 w-4',
        isSelected ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}

export function AccountSelector({
  className,
  user,
  features,
  account,
  accounts = [], // Provide default empty array
  selectedAccount,
  collapsed = false,
  collisionPadding = 20,
  role = 'member',
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
  collapsed?: boolean;
  collisionPadding?: number;
  role: UserRole;
  onAccountChange: (value: string | undefined) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
  const router = useRouter();
  const { t } = useTranslation('teams');

  const isSuperAdmin = role === 'super-admin' || 
                      user?.role === 'super-admin' || 
                      user?.app_metadata?.role === 'super-admin';
                      
  const hasTeamRole = isSuperAdmin || role === 'owner' || role === 'admin';
  const canInteractWithTeams = Boolean(hasTeamRole);

  const handleAccountSelection = useCallback((selectedValue: string) => {
    try {
      if (!selectedValue || !canInteractWithTeams) {
        console.log('Invalid selection or user cannot interact with teams:', {
          selectedValue,
          role,
          hasTeamRole,
          canInteractWithTeams
        });
        return;
      }
      
      setOpen(false);
      
      const isPersonal = selectedValue === 'personal';
      const path = isPersonal ? '/home/projects' : `/home/${selectedValue}/projects`;
      router.push(path);
      
      if (onAccountChange) {
        onAccountChange(isPersonal ? undefined : selectedValue);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error during account selection:', errorMessage);
    }
  }, [canInteractWithTeams, hasTeamRole, onAccountChange, role, router]);

  const value = useMemo(() => {
    return selectedAccount ?? 'personal';
  }, [selectedAccount]);

  const selected = accounts.find((account) => account.value === value);
  const pictureUrl = account?.picture_url;

  const PersonalAccountAvatar = () => (
    pictureUrl ? (
      <UserAvatar pictureUrl={pictureUrl} />
    ) : (
      <PersonIcon className="h-5 min-h-5 w-5 min-w-5" />
    )
  );

  const commandItems = useMemo(() => {
    if (!Array.isArray(accounts)) return [];
    
    return accounts.map((account) => {
      if (!account?.value) return null;
      
      return (
        <CommandItem
          key={account.value}
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
          value={account.value}
          onSelect={(currentValue) => handleAccountSelection(currentValue)}
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
                {account.label?.[0] ?? ''}
              </AvatarFallback>
            </Avatar>

            <span className={'mr-2 max-w-[165px] truncate'}>
              {account.label}
            </span>
          </div>

          <SelectionIcon isSelected={value === account.value} />
        </CommandItem>
      );
    }).filter(Boolean);
  }, [accounts, value, canInteractWithTeams, handleAccountSelection]);

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
                  <PersonalAccountAvatar />
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
                    <AvatarFallback className={'group-hover:bg-background rounded-sm'}>
                      {account.label?.[0] ?? ''}
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
                  onSelect={() => handleAccountSelection('personal')}
                  value={'personal'}
                >
                  <PersonalAccountAvatar />
                  <span className={'ml-2'}>
                    <Trans i18nKey={'teams:personalAccount'} />
                  </span>
                  <SelectionIcon isSelected={value === 'personal'} />
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {commandItems.length > 0 && (
                <CommandGroup
                  heading={
                    <Trans
                      i18nKey={'teams:yourTeams'}
                      values={{ teamsCount: commandItems.length }}
                    />
                  }
                >
                  {commandItems}
                </CommandGroup>
              )}
            </CommandList>
          </Command>

          <Separator />

          {(features.enableTeamCreation || hasTeamRole) && (
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
          )}
        </PopoverContent>
      </Popover>

      {(features.enableTeamCreation || hasTeamRole) && (
        <CreateTeamAccountDialog
          isOpen={isCreatingAccount}
          setIsOpen={setIsCreatingAccount}
        />
      )}
    </>
  );
}

function UserAvatar({ pictureUrl }: { pictureUrl?: string }) {
  return (
    <Avatar className={'h-6 w-6 rounded-sm'}>
      <AvatarImage src={pictureUrl} />
    </Avatar>
  );
}