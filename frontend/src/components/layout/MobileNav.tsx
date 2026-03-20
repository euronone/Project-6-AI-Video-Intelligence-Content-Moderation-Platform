'use client';

import { useState } from 'react';
import Link, { type LinkProps } from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Film,
  LayoutDashboard,
  Menu,
  Radio,
  Settings,
  Shield,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { label: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Videos', href: ROUTES.videos, icon: Film },
  { label: 'Upload', href: ROUTES.videoUpload, icon: Upload },
  { label: 'Moderation Queue', href: ROUTES.moderationQueue, icon: ShieldAlert },
  { label: 'Policies', href: ROUTES.moderationPolicies, icon: Shield },
  { label: 'Live Streams', href: ROUTES.live, icon: Radio },
  { label: 'Analytics', href: ROUTES.analytics, icon: BarChart3 },
  { label: 'Settings', href: ROUTES.settings, icon: Settings },
];

interface MobileLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  onOpenChange: (open: boolean) => void;
}

function MobileLink({ href, onOpenChange, children, className, ...props }: MobileLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href.toString());
        onOpenChange(false);
      }}
      className={cn('text-sidebar-foreground/80 hover:text-sidebar-foreground', className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 px-6 pr-10">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <SheetTitle className="text-base font-semibold tracking-tight">VidShield AI</SheetTitle>
        </div>

        <Separator className="bg-sidebar-border" />

        <ScrollArea className="flex-1 px-3 py-4 h-[calc(100vh-5rem)]">
          <nav aria-label="Mobile navigation">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <MobileLink
                    href={item.href}
                    onOpenChange={setOpen}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    )}
                    aria-current={pathname === item.href ? 'page' : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </MobileLink>
                </li>
              ))}
            </ul>
          </nav>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
