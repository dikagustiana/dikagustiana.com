import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthorBoxProps {
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
  className?: string;
}

export function AuthorBox({ name, bio, avatarUrl, profileUrl, className }: AuthorBoxProps) {
  const Wrapper = profileUrl ? 'a' : 'div';
  const wrapperProps = profileUrl ? { href: profileUrl, target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <div className={cn(
      "border-t border-border pt-8 mt-10",
      className
    )}>
      <Wrapper 
        {...wrapperProps}
        className={cn(
          "flex items-start gap-4",
          profileUrl && "hover:opacity-80 transition-opacity cursor-pointer"
        )}
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl}
            alt={name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="font-semibold text-foreground mb-1">{name}</p>
          {bio ? (
            <p className="text-sm text-muted-foreground">{bio}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Author and analyst</p>
          )}
        </div>
      </Wrapper>
    </div>
  );
}
