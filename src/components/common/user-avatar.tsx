import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type UserAvatarProps = {
  name: string;
  className?: string;
};

export function UserAvatar({ name, className }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Avatar className={className}>
      <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">{initials}</AvatarFallback>
    </Avatar>
  );
}
