import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Form-page vocabulary — shared by all form pages (Profil,            */
/* NeueSchueler, …). A page is one continuous surface: quiet section   */
/* headers separated by hairline rules, with a sticky index rail that  */
/* tracks scroll position. See design-guideline.md.                    */
/* ------------------------------------------------------------------ */

export type FormSectionDef = { id: string; label: string };

export function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="flex scroll-mt-4 flex-col gap-5 border-t pt-8 first:border-t-0 first:pt-0"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
        {description && (
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Topmost visible section wins, in document order.
        const current = ids.find(id => visible.has(id));
        if (current) setActive(current);
      },
      { rootMargin: "0px 0px -55% 0px" }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

export function FormSectionIndex({ sections }: { sections: FormSectionDef[] }) {
  const active = useScrollSpy(sections.map(s => s.id));
  return (
    <nav className="sticky top-2 hidden h-fit w-44 shrink-0 flex-col gap-px self-start pt-1 lg:flex">
      {sections.map(s => {
        const isActive = active === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() =>
              document
                .getElementById(s.id)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className={cn(
              "rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
              isActive
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
