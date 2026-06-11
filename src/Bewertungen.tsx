import { useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  MessageSquareText,
  Reply,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "./components/PageHeader.tsx";
import {
  deleteReview,
  REVIEW_SOURCES,
  updateReview,
  useReviews,
  type Review,
  type ReviewSource,
  type ReviewStatus,
} from "@/hooks/use-reviews";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SourceFilter = "alle" | ReviewSource;
type StatusFilter = "alle" | ReviewStatus;

const STATUS_LABELS: Record<ReviewStatus, string> = {
  neu: "Neu",
  beantwortet: "Beantwortet",
  ausgeblendet: "Ausgeblendet",
};

const SOURCE_ACCENTS: Record<ReviewSource, string> = {
  Google: "bg-sky-500/10 text-sky-600",
  Facebook: "bg-indigo-500/10 text-indigo-600",
  Webseite: "bg-emerald-500/10 text-emerald-600",
  Intern: "bg-amber-500/10 text-amber-600",
};

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${rating} von 5 Sternen`}
    >
      {[1, 2, 3, 4, 5].map(value => (
        <Star
          key={value}
          aria-hidden
          className={cn(
            "size-4",
            value <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

function SummaryCards({ reviews }: { reviews: Review[] }) {
  const total = reviews.length;
  const newCount = reviews.filter(review => review.status === "neu").length;
  const average =
    total > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / total
      : 0;
  const bySource = REVIEW_SOURCES.map(source => ({
    source,
    count: reviews.filter(review => review.source === source).length,
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-5">
      <Card>
        <CardHeader>
          <CardDescription>Durchschnittliche Bewertung</CardDescription>
          <CardTitle className="text-2xl tabular-nums">
            {total > 0 ? average.toLocaleString("de-DE", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }) : "–"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Stars rating={Math.round(average)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Bewertungen gesamt</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{total}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {newCount > 0
              ? `${newCount} ${newCount === 1 ? "neue Bewertung wartet" : "neue Bewertungen warten"} auf eine Antwort`
              : "Alle Bewertungen sind bearbeitet"}
          </div>
        </CardContent>
      </Card>

      <Card className="sm:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardDescription>Verteilung nach Quelle</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
            {bySource.map(({ source, count }) => (
              <div key={source} className="flex items-center justify-between gap-2">
                <dt className="text-sm text-muted-foreground">{source}</dt>
                <dd className="text-sm font-medium tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function ReplyDialog({
  review,
  open,
  saving,
  onOpenChange,
  onSave,
}: {
  review: Review | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (reply: string) => void;
}) {
  const [reply, setReply] = useState("");

  // Reset the draft to the stored reply whenever a (new) review opens.
  const [lastReviewId, setLastReviewId] = useState<number | null>(null);
  if (review && review.id !== lastReviewId) {
    setLastReviewId(review.id);
    setReply(review.reply);
  }
  if (!review && lastReviewId !== null) {
    setLastReviewId(null);
  }

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Auf Bewertung antworten</DialogTitle>
          <DialogDescription>
            Antwort an {review.author} ({review.source}) verfassen. Die
            Bewertung wird als „Beantwortet“ markiert.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{review.author}</span>
            <Stars rating={review.rating} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{review.text}</p>
        </div>

        <Field>
          <FieldLabel htmlFor="review-reply">Antwort</FieldLabel>
          <Textarea
            id="review-reply"
            rows={5}
            placeholder="Vielen Dank für Ihre Bewertung…"
            value={reply}
            onChange={event => setReply(event.target.value)}
          />
        </Field>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={saving || !reply.trim()}
            onClick={() => onSave(reply.trim())}
          >
            Antwort speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({
  review,
  onReply,
  onToggleHidden,
  onDelete,
}: {
  review: Review;
  onReply: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const hidden = review.status === "ausgeblendet";

  return (
    <Card className={cn(hidden && "opacity-60")}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              SOURCE_ACCENTS[review.source]
            )}
          >
            <MessageSquareText className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{review.author}</CardTitle>
            <CardDescription>
              {review.source} · {formatDate(review.date)}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <Badge variant={review.status === "neu" ? "default" : review.status === "beantwortet" ? "secondary" : "outline"}>
              {STATUS_LABELS[review.status]}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Bewertung von ${review.author} beantworten`}
              onClick={onReply}
            >
              <Reply />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                hidden
                  ? `Bewertung von ${review.author} einblenden`
                  : `Bewertung von ${review.author} ausblenden`
              }
              onClick={onToggleHidden}
            >
              {hidden ? <Eye /> : <EyeOff />}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label={`Bewertung von ${review.author} löschen`}
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Stars rating={review.rating} />
        <p className="text-sm">{review.text}</p>
        {review.reply && (
          <>
            <Separator />
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Antwort der Fahrschule
              </div>
              <p className="mt-1 text-sm">{review.reply}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function Bewertungen() {
  const { reviews, loading, refresh } = useReviews();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("alle");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle");
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredReviews = useMemo(
    () =>
      reviews.filter(
        review =>
          (sourceFilter === "alle" || review.source === sourceFilter) &&
          (statusFilter === "alle" || review.status === statusFilter)
      ),
    [reviews, sourceFilter, statusFilter]
  );

  const replyingReview =
    reviews.find(review => review.id === replyingId) ?? null;

  const mutate = async (action: () => Promise<unknown>, success: string) => {
    setSaving(true);
    try {
      await action();
      await refresh();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Aktion fehlgeschlagen."
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveReply = async (reply: string) => {
    if (replyingId === null) return;
    const ok = await mutate(
      () => updateReview(replyingId, { reply, status: "beantwortet" }),
      "Antwort gespeichert. Bewertung als „Beantwortet“ markiert."
    );
    if (ok) setReplyingId(null);
  };

  const toggleHidden = (review: Review) => {
    const nextStatus: ReviewStatus =
      review.status === "ausgeblendet"
        ? review.reply
          ? "beantwortet"
          : "neu"
        : "ausgeblendet";
    void mutate(
      () => updateReview(review.id, { status: nextStatus }),
      nextStatus === "ausgeblendet"
        ? "Bewertung ausgeblendet."
        : "Bewertung wieder eingeblendet."
    );
  };

  const removeReview = (review: Review) => {
    const confirmed = window.confirm(
      `Bewertung von "${review.author}" (${review.source}) wirklich löschen?`
    );
    if (!confirmed) return;
    void mutate(() => deleteReview(review.id), "Bewertung gelöscht.");
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader className="h-auto min-h-11 flex-wrap py-2 2xl:min-h-12">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Tabs
            value={statusFilter}
            onValueChange={value => setStatusFilter(value as StatusFilter)}
          >
            <TabsList>
              <TabsTrigger value="alle">Alle</TabsTrigger>
              <TabsTrigger value="neu">Neu</TabsTrigger>
              <TabsTrigger value="beantwortet">Beantwortet</TabsTrigger>
              <TabsTrigger value="ausgeblendet">Ausgeblendet</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={sourceFilter}
            onValueChange={value => setSourceFilter(value as SourceFilter)}
          >
            <SelectTrigger size="sm" className="w-40" aria-label="Quelle filtern">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="alle">Alle Quellen</SelectItem>
                {REVIEW_SOURCES.map(source => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto rounded-t-lg rounded-b-2xl border border-border/70 bg-background p-4 2xl:p-6">
        {loading ? (
          <div className="flex flex-col gap-4 2xl:gap-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-5">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : (
          <div className="stagger-in flex flex-col gap-4 2xl:gap-5">
            <SummaryCards reviews={reviews} />
            {filteredReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Keine Bewertungen für die gewählten Filter gefunden.
              </div>
            ) : (
              filteredReviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onReply={() => setReplyingId(review.id)}
                  onToggleHidden={() => toggleHidden(review)}
                  onDelete={() => removeReview(review)}
                />
              ))
            )}
          </div>
        )}
      </div>

      <ReplyDialog
        review={replyingReview}
        open={replyingId !== null && replyingReview !== null}
        saving={saving}
        onOpenChange={open => {
          if (!open) setReplyingId(null);
        }}
        onSave={reply => void saveReply(reply)}
      />
    </div>
  );
}

export default Bewertungen;
