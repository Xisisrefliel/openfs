/* ------------------------------------------------------------------ */
/* Archiv — gelöschte Einträge (Papierkorb). Alles, was über die App   */
/* gelöscht wurde (Fahrschüler, Termine, Fahrlehrer, Fahrzeuge,        */
/* Preispläne), landet hier und kann wiederhergestellt oder endgültig  */
/* entfernt werden. Daten kommen aus /api/archive (use-archive).       */
/* ------------------------------------------------------------------ */

import { useState } from "react";
import {
  ArchiveRestore,
  Archive as ArchiveIcon,
  CalendarDays,
  Car,
  GraduationCap,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "./components/PageHeader.tsx";
import {
  purgeArchived,
  restoreArchived,
  useArchive,
  type ArchiveEntity,
  type ArchiveItem,
} from "@/hooks/use-archive";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

const ENTITY_META: Record<
  ArchiveEntity,
  { label: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  student: { label: "Fahrschüler/in", Icon: GraduationCap },
  calendar_event: { label: "Termin", Icon: CalendarDays },
  instructor: { label: "Fahrlehrer/in", Icon: Users },
  vehicle: { label: "Fahrzeug", Icon: Car },
  price_plan: { label: "Preisplan", Icon: Tag },
};

const deletedAtFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDeletedAt(deletedAt: string): string {
  const date = new Date(deletedAt);
  if (Number.isNaN(date.getTime())) return "Unbekannt";
  return deletedAtFormatter.format(date);
}

function ArchiveRow({
  item,
  busy,
  onRestore,
  onPurge,
}: {
  item: ArchiveItem;
  busy: boolean;
  onRestore: () => void;
  onPurge: () => void;
}) {
  const { label, Icon } = ENTITY_META[item.entity];

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{item.label}</span>
          <span className="text-xs text-muted-foreground">
            Gelöscht am {formatDeletedAt(item.deletedAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Badge variant="outline">{label}</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={onRestore}
        >
          <ArchiveRestore data-icon="inline-start" />
          Wiederherstellen
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={busy}
              aria-label={`${item.label} endgültig löschen`}
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Endgültig löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                „{item.label}" ({label}) wird unwiderruflich aus dem Archiv entfernt und
                kann danach nicht mehr wiederhergestellt werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={onPurge}>Endgültig löschen</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function Archiv() {
  const { items, loading, refresh } = useArchive();
  const [busyId, setBusyId] = useState<number | null>(null);

  const run = async (id: number, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await action();
      await refresh();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader>
        <span className="text-sm font-medium">Archiv</span>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <p className="pb-2 text-sm text-muted-foreground">
            Gelöschte Einträge bleiben hier erhalten und können wiederhergestellt werden.
          </p>

          {loading ? (
            <>
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </>
          ) : items.length === 0 ? (
            <Empty className="min-h-48 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ArchiveIcon />
                </EmptyMedia>
                <EmptyTitle>Das Archiv ist leer</EmptyTitle>
                <EmptyDescription>
                  Gelöschte Fahrschüler, Termine, Fahrlehrer, Fahrzeuge und Preispläne
                  erscheinen hier.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="stagger-in flex flex-col gap-2">
              {items.map((item) => (
                <ArchiveRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onRestore={() =>
                    run(
                      item.id,
                      () => restoreArchived(item.id),
                      `„${item.label}" wiederhergestellt.`,
                    )
                  }
                  onPurge={() =>
                    run(
                      item.id,
                      () => purgeArchived(item.id),
                      `„${item.label}" endgültig gelöscht.`,
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Archiv;
