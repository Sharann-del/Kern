import * as Avatar from '@radix-ui/react-avatar';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/providers/AuthProvider';
import { useAppStore } from '@/stores/appStore';

function initialsFromProfile(fullName: string | null, email: string | null): string {
  const name = fullName?.trim();
  if (name) return name.slice(0, 1).toUpperCase();
  const e = email?.trim();
  if (e) return e.slice(0, 1).toUpperCase();
  return '?';
}

export function UserMenu() {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const openKeyboardShortcutsModal = useAppStore((s) => s.openKeyboardShortcutsModal);

  const fullName = profile?.full_name?.trim() || null;
  const email = profile?.email ?? user?.email ?? '';
  const avatarUrl = profile?.avatar_url?.trim() || null;
  const initials = initialsFromProfile(fullName, email || null);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0 outline-none ring-offset-2 ring-offset-[#222220] transition-opacity duration-[80ms] ease-in-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-kern-accent/40"
          aria-label="User menu"
        >
          <Avatar.Root className="flex size-full select-none items-center justify-center overflow-hidden rounded-full bg-kern-accent font-medium text-sm text-kern-on-accent">
            {avatarUrl ? (
              <Avatar.Image src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
            <Avatar.Fallback delayMs={avatarUrl ? 600 : 0}>{initials}</Avatar.Fallback>
          </Avatar.Root>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="z-[60] min-w-[180px] rounded-kern-md border border-kern-border bg-kern-surface p-1 shadow-ds-md outline-none"
          sideOffset={8}
          align="end"
        >
          <div className="px-2 py-1.5">
            <p className="text-[13px] font-semibold text-kern-text">
              {fullName || 'Account'}
            </p>
            {email ? (
              <p className="text-[12px] text-kern-text-2">{email}</p>
            ) : null}
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-kern-border" />
          <DropdownMenu.Item
            className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm text-kern-text outline-none data-[highlighted]:bg-kern-surface-2"
            onSelect={() => navigate('/settings')}
          >
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm text-kern-text outline-none data-[highlighted]:bg-kern-surface-2"
            onSelect={() => openKeyboardShortcutsModal()}
          >
            Keyboard shortcuts
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-kern-border" />
          <DropdownMenu.Item
            className="cursor-pointer rounded-kern-sm px-2 py-1.5 text-sm text-kern-danger outline-none data-[highlighted]:bg-kern-surface-2"
            onSelect={async () => {
              await signOut();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
