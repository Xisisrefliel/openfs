import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Form-page vocabulary — shared by all form pages (Profil,            */
/* NeueSchueler, …). A page is one continuous surface: quiet section   */
/* headers separated by hairline rules, with a sticky index rail that  */
/* tracks scroll position. See design-guideline.md.                    */
/* ------------------------------------------------------------------ */

export type FormSectionDef = { id: string; label: string };

const MIN_VISIBLE_SECTION_HEIGHT = 24;

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

function sameItems(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every((item, index) => item === right[index])
  );
}

function getScrollRoot(element: HTMLElement): HTMLElement | Window {
  let current = element.parentElement;
  while (current) {
    const overflowY = window.getComputedStyle(current).overflowY;
    if (/(auto|scroll|overlay)/.test(overflowY)) return current;
    current = current.parentElement;
  }
  return window;
}

function getRootRect(root: HTMLElement | Window) {
  if (!(root instanceof HTMLElement)) {
    return { top: 0, bottom: window.innerHeight, height: window.innerHeight };
  }
  const rect = root.getBoundingClientRect();
  return { top: rect.top, bottom: rect.bottom, height: rect.height };
}

function visibleHeight(elementRect: DOMRect, rootRect: { top: number; bottom: number }) {
  return Math.max(
    0,
    Math.min(elementRect.bottom, rootRect.bottom) -
      Math.max(elementRect.top, rootRect.top),
  );
}

function distanceFromCenter(elementRect: DOMRect, center: number) {
  if (elementRect.top <= center && elementRect.bottom >= center) return 0;
  return Math.min(
    Math.abs(elementRect.top - center),
    Math.abs(elementRect.bottom - center),
  );
}

function useScrollSpy(ids: string[]) {
  const idsKey = ids.join("\u0000");
  const firstId = ids[0] ?? "";
  const [state, setState] = useState({
    active: firstId,
    visible: firstId ? [firstId] : [],
  });

  useEffect(() => {
    if (ids.length === 0) {
      setState({ active: "", visible: [] });
      return;
    }
    const fallbackId = ids[0];
    if (!fallbackId) {
      setState({ active: "", visible: [] });
      return;
    }

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el instanceof HTMLElement);
    if (elements.length === 0) {
      setState({ active: fallbackId, visible: [fallbackId] });
      return;
    }

    const firstElement = elements[0];
    if (!firstElement) {
      setState({ active: fallbackId, visible: [fallbackId] });
      return;
    }

    const root = getScrollRoot(firstElement);
    let frame = 0;
    const update = () => {
      frame = 0;
      const rootRect = getRootRect(root);
      const center = rootRect.top + rootRect.height / 2;
      const metrics = elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          id: element.id,
          distance: distanceFromCenter(rect, center),
          visibleHeight: visibleHeight(rect, rootRect),
          height: rect.height,
        };
      });
      const visibleIds = metrics
        .filter(
          (metric) =>
            metric.visibleHeight >= Math.min(MIN_VISIBLE_SECTION_HEIGHT, metric.height),
        )
        .map((metric) => metric.id);
      const nextVisible = visibleIds.length > 0 ? visibleIds : [fallbackId];
      const nextActive =
        metrics.toSorted((left, right) => left.distance - right.distance)[0]?.id ??
        fallbackId;

      setState((current) =>
        current.active === nextActive && sameItems(current.visible, nextVisible)
          ? current
          : { active: nextActive, visible: nextVisible },
      );
    };

    const requestUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    root.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      root.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [idsKey]);

  return state;
}

export function FormSectionIndex({ sections }: { sections: FormSectionDef[] }) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections]);
  const { active, visible } = useScrollSpy(ids);
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [highlight, setHighlight] = useState<{ top: number; height: number } | null>(
    null,
  );
  const visibleSet = useMemo(() => new Set(visible), [visible]);
  const visibleRange = useMemo(() => {
    let first = -1;
    let last = -1;
    sections.forEach((section, index) => {
      if (!visibleSet.has(section.id)) return;
      if (first === -1) first = index;
      last = index;
    });
    return first === -1 ? null : { first, last };
  }, [sections, visibleSet]);
  const visibleKey = visible.join("\u0000");

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !visibleRange) {
      setHighlight(null);
      return;
    }

    const updateHighlight = () => {
      const firstId = sections[visibleRange.first]?.id;
      const lastId = sections[visibleRange.last]?.id;
      const firstEl = firstId ? buttonRefs.current[firstId] : null;
      const lastEl = lastId ? buttonRefs.current[lastId] : null;
      if (!firstEl || !lastEl) {
        setHighlight(null);
        return;
      }

      const navRect = nav.getBoundingClientRect();
      const firstRect = firstEl.getBoundingClientRect();
      const lastRect = lastEl.getBoundingClientRect();
      const next = {
        top: firstRect.top - navRect.top,
        height: lastRect.bottom - firstRect.top,
      };

      setHighlight((current) =>
        current &&
        Math.abs(current.top - next.top) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5
          ? current
          : next,
      );
    };

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHighlight);
    observer?.observe(nav);
    for (const id of visible) {
      const button = buttonRefs.current[id];
      if (button) observer?.observe(button);
    }

    return () => {
      window.removeEventListener("resize", updateHighlight);
      observer?.disconnect();
    };
  }, [sections, visible, visibleKey, visibleRange]);

  return (
    <nav
      ref={navRef}
      className="sticky top-2 hidden h-fit w-44 shrink-0 flex-col gap-px self-start pt-1 lg:flex"
    >
      {highlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 left-0 rounded-md bg-muted"
          style={{ top: highlight.top, height: highlight.height }}
        />
      )}
      {sections.map((s) => {
        const isActive = active === s.id;
        const isVisible = visibleSet.has(s.id);
        return (
          <button
            key={s.id}
            ref={(node) => {
              buttonRefs.current[s.id] = node;
            }}
            type="button"
            aria-current={isActive ? "location" : undefined}
            onClick={() =>
              document
                .getElementById(s.id)
                ?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            className={cn(
              // Active state uses a faux-bold text-shadow rather than font-weight so the
              // glyph advances stay identical — the label never reflows or shifts.
              "relative z-10 rounded-md px-2.5 py-1.5 text-left text-[13px] [text-shadow:0_0_0_transparent,0_0_0_transparent] transition-[color,text-shadow] duration-150 hover:duration-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring/50",
              isVisible
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
              isActive && "[text-shadow:0.3px_0_0_currentColor,-0.3px_0_0_currentColor]",
              !highlight && isVisible && "bg-muted",
            )}
          >
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}
