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
const QUICK_SCROLL_DURATION_MS = 140;

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

function scrollToSection(id: string, behavior: ScrollBehavior) {
  const resolvedBehavior =
    behavior === "smooth" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : behavior;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: resolvedBehavior, block: "center" });
}

function stretchHighlightTowardPointer(
  element: HTMLDivElement | null,
  clientX: number,
  clientY: number,
) {
  if (!element) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    resetHighlightStretch(element);
    return;
  }

  const rect = element.getBoundingClientRect();
  const signedX = Math.max(
    -1,
    Math.min(1, (clientX - (rect.left + rect.width / 2)) / Math.max(rect.width / 2, 1)),
  );
  const signedY = Math.max(
    -1,
    Math.min(1, (clientY - (rect.top + rect.height / 2)) / Math.max(rect.height / 2, 1)),
  );
  const strengthX = Math.abs(signedX);
  const strengthY = Math.abs(signedY);
  const scaleX = 1 + strengthX * 0.014 - strengthY * 0.004;
  const scaleY = 1 + strengthY * 0.022 - strengthX * 0.003;
  const originX = signedX < -0.08 ? "right" : signedX > 0.08 ? "left" : "center";
  const originY = signedY < -0.08 ? "bottom" : signedY > 0.08 ? "top" : "center";

  element.style.transformOrigin = `${originX} ${originY}`;
  element.style.transform = `scaleX(${scaleX}) scaleY(${scaleY})`;
}

function resetHighlightStretch(element: HTMLDivElement | null) {
  if (!element) return;
  element.style.transformOrigin = "center";
  element.style.transform = "scaleX(1) scaleY(1)";
}

function quickScrollToSection(id: string, animationFrameRef: { current: number | null }) {
  const element = document.getElementById(id);
  if (!element) return;

  if (animationFrameRef.current !== null) {
    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.scrollIntoView({ behavior: "instant", block: "center" });
    return;
  }

  const root = getScrollRoot(element);
  const rootRect = getRootRect(root);
  const elementRect = element.getBoundingClientRect();
  const start = root instanceof HTMLElement ? root.scrollTop : window.scrollY;
  const max =
    root instanceof HTMLElement
      ? root.scrollHeight - root.clientHeight
      : document.documentElement.scrollHeight - window.innerHeight;
  const target = Math.max(
    0,
    Math.min(
      max,
      start +
        elementRect.top +
        elementRect.height / 2 -
        (rootRect.top + rootRect.height / 2),
    ),
  );
  const distance = target - start;
  const startedAt = performance.now();

  const tick = (now: number) => {
    const progress = Math.min((now - startedAt) / QUICK_SCROLL_DURATION_MS, 1);
    const eased = 1 - (1 - progress) ** 3;
    const next = start + distance * eased;

    if (root instanceof HTMLElement) root.scrollTop = next;
    else window.scrollTo({ top: next });

    if (progress < 1) {
      animationFrameRef.current = window.requestAnimationFrame(tick);
    } else {
      animationFrameRef.current = null;
    }
  };

  animationFrameRef.current = window.requestAnimationFrame(tick);
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
  const highlightSurfaceRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [highlight, setHighlight] = useState<{ top: number; height: number } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    moved: boolean;
    lastId: string | null;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const scrollAnimationFrameRef = useRef<number | null>(null);
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

  useEffect(
    () => () => {
      if (scrollAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    },
    [],
  );

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

  // The section whose rail button is nearest the pointer's vertical position —
  // used while dragging so the scrub never falls into the gaps between buttons.
  const sectionIdAt = (clientY: number) => {
    let bestId: string | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const s of sections) {
      const rect = buttonRefs.current[s.id]?.getBoundingClientRect();
      if (!rect) continue;
      const distance =
        clientY < rect.top
          ? rect.top - clientY
          : clientY > rect.bottom
            ? clientY - rect.bottom
            : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestId = s.id;
      }
    }
    return bestId;
  };

  // Click jumps to a section; press-and-drag scrubs through them — the active
  // highlight tracks the pointer so the rail behaves like a scrollbar thumb.
  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      moved: false,
      lastId: null,
    };
    suppressClickRef.current = false;
  };

  const handlePointerHover = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType !== "mouse") return;
    const nav = navRef.current;
    if (!nav) return;
    const rect = nav.getBoundingClientRect();
    const isHovering =
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom;

    if (isHovering) {
      stretchHighlightTowardPointer(highlightSurfaceRef.current, e.clientX, e.clientY);
    } else {
      resetHighlightStretch(highlightSurfaceRef.current);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    handlePointerHover(e);
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (!drag.moved) {
      if (Math.abs(e.clientY - drag.startY) < 4) return;
      drag.moved = true;
      suppressClickRef.current = true;
      setIsDragging(true);
      navRef.current?.setPointerCapture(drag.pointerId);
    }
    e.preventDefault();
    const id = sectionIdAt(e.clientY);
    if (id && id !== drag.lastId) {
      drag.lastId = id;
      quickScrollToSection(id, scrollAnimationFrameRef);
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (drag.moved) setIsDragging(false);
    dragRef.current = null;
  };

  return (
    <nav
      ref={navRef}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerHover}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => resetHighlightStretch(highlightSurfaceRef.current)}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={cn(
        "sticky top-2 hidden h-fit w-44 shrink-0 touch-none flex-col gap-px self-start pt-1 select-none lg:flex",
        isDragging && "cursor-grabbing",
      )}
    >
      {highlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 transition-[transform,height] duration-200 ease-out motion-reduce:transition-none"
          style={{
            transform: `translateY(${highlight.top}px)`,
            height: highlight.height,
          }}
        >
          <div
            ref={highlightSurfaceRef}
            className="size-full rounded-md bg-muted transition-transform duration-75 ease-out motion-reduce:transition-none"
          />
        </div>
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
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              scrollToSection(s.id, "smooth");
            }}
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
