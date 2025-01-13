import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@kit/ui/utils';

function LogoImage({
  className,
  width = 305,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <div className={cn("relative", className)}>
      <Image
        src="/images/mpiq_logo.png"
        alt="Logo"
        className={className}
        width={width}
        height="60"
      />
    </div>
  );
}

export function AppLogo({
  href,
  label,
  className,
}: {
  href?: string | null;
  className?: string;
  label?: string;
}) {
  if (href === null) {
    return <LogoImage className={className} />;
  }

  return (
    <Link aria-label={label ?? 'Home'} href={href ?? '/home/projects'}>
      <LogoImage className={className} />
    </Link>
  );
}