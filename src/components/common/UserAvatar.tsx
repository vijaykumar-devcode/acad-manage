import { cn } from '../../lib/utils';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatar({ name = 'User', avatarUrl, className, fallbackClassName }: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img 
        src={avatarUrl} 
        alt={name} 
        className={cn("h-8 w-8 rounded-full object-cover shrink-0", className)} 
      />
    );
  }

  return (
    <div className={cn("h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold shrink-0", className, fallbackClassName)}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
