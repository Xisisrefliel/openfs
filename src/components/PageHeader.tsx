import { cn } from "@/lib/utils";

type PageHeaderProps = {
  children?: React.ReactNode;
  center?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
};

export function PageHeader({ children, center, end, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-11 w-full shrink-0 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur-md 2xl:h-12 2xl:px-4",
        className
      )}
    >
      {children}
      {center && <div className="absolute left-1/2 -translate-x-1/2">{center}</div>}
      {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
    </header>
  );
}
