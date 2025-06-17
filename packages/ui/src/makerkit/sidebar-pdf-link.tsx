'use client';

import { useContext } from 'react';
import { cn, isRouteActive } from '../lib/utils';
import { Button } from '../shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../shadcn/tooltip';
import { SidebarContext } from './context/sidebar.context';
import { If } from './if';
import { usePathname } from 'next/navigation';

/**
 * SidebarPdfLink - A sidebar item that opens a PDF in a new tab
 * This is similar to SidebarItem but uses a regular anchor tag with target="_blank"
 */
export function SidebarPdfLink({
  path,
  children,
  Icon,
}: React.PropsWithChildren<{
  path: string;
  Icon: React.ReactNode;
}>) {
  const { collapsed } = useContext(SidebarContext);
  const currentPath = usePathname() ?? '';

  // PDFs won't ever be active in the sidebar
  const active = false;
  const variant = active ? 'secondary' : 'ghost';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip disableHoverableContent>
        <TooltipTrigger asChild>
          <Button
            asChild
            className={cn(
              'flex w-full text-sm shadow-none active:bg-secondary/60',
              {
                'justify-start space-x-2.5': !collapsed,
                'hover:bg-initial': active,
              },
            )}
            size={'sm'}
            variant={variant}
          >
            <a href={path} target="_blank" rel="noopener noreferrer">
              {Icon}
              <span
                className={cn('w-auto transition-opacity duration-300', {
                  'w-0 opacity-0': collapsed,
                })}
              >
                {children}
              </span>
            </a>
          </Button>
        </TooltipTrigger>

        <If condition={collapsed}>
          <TooltipContent side={'right'} sideOffset={10}>
            {children}
          </TooltipContent>
        </If>
      </Tooltip>
    </TooltipProvider>
  );
}
