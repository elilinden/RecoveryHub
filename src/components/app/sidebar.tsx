import { NavigationLinks } from "@/components/app/navigation-links";
import { UserProfile } from "@/components/app/user-profile";
import type { Profile } from "@/lib/data/profiles";

type SidebarProps = {
  profile: Profile;
};

export function Sidebar({ profile }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          RH
        </div>
        <div>
          <p className="text-base font-semibold text-sidebar-foreground">Recovery Hub</p>
          <p className="text-xs text-muted-foreground">Legal operations</p>
        </div>
      </div>
      <div className="flex-1 px-3 py-4">
        <NavigationLinks />
      </div>
      <UserProfile profile={profile} />
    </aside>
  );
}
