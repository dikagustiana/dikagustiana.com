import { cn } from '@/lib/utils';

interface AuthorBoxProps {
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  profileUrl?: string | null;
  className?: string;
}

/**
 * The byline at the end of an essay. With no photo it shows no placeholder
 * circle, and with no bio it shows no stand-in line: on 9 October 2026 every
 * published essay ended with a grey avatar and the italic "Author and
 * analyst", which reads as an unfinished template under the owner's name. A
 * site-wide default bio comes only from the owner (question Q18).
 */
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
        {avatarUrl && (
          <img
            src={avatarUrl}
            alt={name}
            className="w-16 h-16 rounded-full object-cover"
          />
        )}
        <div>
          <p className="font-semibold text-foreground">{name}</p>
          {bio && <p className="mt-1 text-sm text-muted-foreground">{bio}</p>}
        </div>
      </Wrapper>
    </div>
  );
}
