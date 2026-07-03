"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { NavigationLinks } from "@/components/app/navigation-links";
import { UserProfile } from "@/components/app/user-profile";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Profile } from "@/lib/data/profiles";

type MobileNavigationProps = {
  profile: Profile;
};

export function MobileNavigation({ profile }: MobileNavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
          RH
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">Recovery Hub</p>
          <p className="text-xs text-muted-foreground">Legal operations</p>
        </div>
      </div>
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetTrigger asChild>
          <Button aria-label="Open navigation" size="icon-lg" type="button" variant="outline">
            <Menu aria-hidden="true" className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="flex w-80 max-w-[88vw] flex-col p-0" side="left">
          <SheetTitle className="sr-only">Recovery Hub navigation</SheetTitle>
          <div className="flex h-16 items-center gap-3 border-b border-border px-5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              RH
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">Recovery Hub</p>
              <p className="text-xs text-muted-foreground">Legal operations</p>
            </div>
          </div>
          <div className="flex-1 px-3 py-4">
            <NavigationLinks onNavigate={() => setOpen(false)} />
          </div>
          <UserProfile profile={profile} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
