import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Euro,
  Megaphone,
  Pause,
  Pencil,
  Play,
  Plus,
  Target,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { toast } from "sonner";

import { PageHeader } from "./components/PageHeader.tsx";
import {
  createCampaign,
  deleteCampaign,
  updateCampaign,
  useCampaigns,
  type Campaign,
  type CampaignChannel,
  type CampaignInput,
  type CampaignStatus,
} from "@/hooks/use-campaigns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCents, formatEuro, parseEuroToCents } from "@/lib/money";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                  */
/* ------------------------------------------------------------------ */

const CHANNELS: CampaignChannel[] = [
  "Google Ads",
  "Instagram",
  "Facebook",
  "TikTok",
  "Flyer",
  "Empfehlung",
  "Webseite",
];

const channelAccents: Record<CampaignChannel, string> = {
  "Google Ads": "bg-amber-500/10 text-amber-600",
  Instagram: "bg-pink-500/10 text-pink-600",
  Facebook: "bg-blue-500/10 text-blue-600",
  TikTok: "bg-cyan-500/10 text-cyan-600",
  Flyer: "bg-orange-500/10 text-orange-600",
  Empfehlung: "bg-emerald-500/10 text-emerald-600",
  Webseite: "bg-sky-500/10 text-sky-600",
};

const statusLabels: Record<CampaignStatus, string> = {
  aktiv: "Aktiv",
  pausiert: "Pausiert",
  beendet: "Beendet",
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge
      variant={status === "aktiv" ? "secondary" : "outline"}
      className={cn(status === "pausiert" && "text-muted-foreground")}
    >
      {statusLabels[status]}
    </Badge>
  );
}

/** "2026-03-01" → "01.03.2026" */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function budgetPercent(campaign: Campaign): number {
  if (campaign.budgetCents <= 0) return 0;
  return Math.min(
    100,
    Math.round((campaign.spentCents / campaign.budgetCents) * 100)
  );
}

function costPerLeadCents(spentCents: number, leads: number): number | null {
  if (leads <= 0) return null;
  return Math.round(spentCents / leads);
}

/* ------------------------------------------------------------------ */
/* KPI cards                                                            */
/* ------------------------------------------------------------------ */

type Kpi = {
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
  label: string;
  value: string;
  hint: string;
  progress?: number;
};

function KpiCards({ campaigns }: { campaigns: Campaign[] }) {
  const totalBudget = campaigns.reduce((s, c) => s + c.budgetCents, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spentCents, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalSignups = campaigns.reduce((s, c) => s + c.signups, 0);
  const spentPct =
    totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const conversion =
    totalLeads > 0 ? Math.round((totalSignups / totalLeads) * 100) : 0;
  const cpl = costPerLeadCents(totalSpent, totalLeads);

  const kpis: Kpi[] = [
    {
      Icon: Euro,
      accent: "bg-emerald-500/10 text-emerald-600",
      label: "Budget",
      value: formatEuro(totalBudget),
      hint: `${formatEuro(totalSpent)} ausgegeben (${spentPct} %)`,
      progress: spentPct,
    },
    {
      Icon: Users,
      accent: "bg-sky-500/10 text-sky-600",
      label: "Leads",
      value: String(totalLeads),
      hint: `aus ${campaigns.length} Kampagnen`,
    },
    {
      Icon: UserPlus,
      accent: "bg-violet-500/10 text-violet-600",
      label: "Anmeldungen",
      value: String(totalSignups),
      hint: `${conversion} % Conversion`,
    },
    {
      Icon: Target,
      accent: "bg-amber-500/10 text-amber-600",
      label: "Kosten pro Lead",
      value: cpl === null ? "–" : formatEuro(cpl),
      hint: "Ausgaben ÷ Leads",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-5">
      {kpis.map(({ Icon, accent, label, value, hint, progress }) => (
        <Card key={label}>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-md",
                  accent
                )}
              >
                <Icon className="size-3.5" />
              </span>
              {label}
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {progress !== undefined && <Progress value={progress} />}
            <p className="text-xs text-muted-foreground">{hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chart — leads & signups per channel                                  */
/* ------------------------------------------------------------------ */

const chartConfig = {
  leads: { label: "Leads", color: "var(--chart-1)" },
  signups: { label: "Anmeldungen", color: "var(--chart-2)" },
} satisfies ChartConfig;

function ChannelChart({ campaigns }: { campaigns: Campaign[] }) {
  const chartData = useMemo(
    () =>
      CHANNELS.map(channel => {
        const inChannel = campaigns.filter(c => c.channel === channel);
        return {
          channel,
          leads: inChannel.reduce((s, c) => s + c.leads, 0),
          signups: inChannel.reduce((s, c) => s + c.signups, 0),
        };
      }).filter(row => row.leads > 0 || row.signups > 0),
    [campaigns]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
            <BarChart3 className="size-3.5" />
          </span>
          Leads nach Kanal
        </CardTitle>
        <CardDescription>
          Leads und Anmeldungen über alle Kampagnen
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Leads erfasst.
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[240px] w-full 2xl:h-[300px]"
          >
            <BarChart
              data={chartData}
              margin={{ top: 8, left: 0, right: 0, bottom: 0 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="channel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="leads" fill="var(--color-leads)" radius={6} />
              <Bar dataKey="signups" fill="var(--color-signups)" radius={6} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Create/Edit dialog                                                   */
/* ------------------------------------------------------------------ */

type CampaignDraft = {
  name: string;
  channel: CampaignChannel;
  budget: string;
  spent: string;
  leads: string;
  signups: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  notes: string;
};

function campaignToDraft(campaign: Campaign | null): CampaignDraft {
  if (!campaign) {
    return {
      name: "",
      channel: "Google Ads",
      budget: "",
      spent: "",
      leads: "0",
      signups: "0",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      status: "aktiv",
      notes: "",
    };
  }
  return {
    name: campaign.name,
    channel: campaign.channel,
    budget: formatCents(campaign.budgetCents),
    spent: formatCents(campaign.spentCents),
    leads: String(campaign.leads),
    signups: String(campaign.signups),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    status: campaign.status,
    notes: campaign.notes,
  };
}

/** Parse the draft into an API payload; throws Error with a German
 *  message on invalid money/number inputs. */
function draftToPayload(draft: CampaignDraft): Partial<CampaignInput> {
  const money = (value: string, label: string): number => {
    if (!value.trim()) return 0;
    const cents = parseEuroToCents(value);
    if (cents === null) {
      throw new Error(`${label}: Bitte einen Betrag wie 1.250,00 eingeben.`);
    }
    return cents;
  };
  const count = (value: string, label: string): number => {
    if (!value.trim()) return 0;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      throw new Error(`${label}: Bitte eine ganze Zahl eingeben.`);
    }
    return n;
  };

  return {
    name: draft.name,
    channel: draft.channel,
    budgetCents: money(draft.budget, "Budget"),
    spentCents: money(draft.spent, "Ausgegeben"),
    leads: count(draft.leads, "Leads"),
    signups: count(draft.signups, "Anmeldungen"),
    startDate: draft.startDate,
    endDate: draft.endDate,
    status: draft.status,
    notes: draft.notes,
  };
}

function CampaignEditDialog({
  campaign,
  open,
  onOpenChange,
  onSave,
  mode,
}: {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: Partial<CampaignInput>) => Promise<void>;
  mode: "create" | "edit";
}) {
  const [draft, setDraft] = useState<CampaignDraft | null>(null);

  useEffect(() => {
    setDraft(open ? campaignToDraft(campaign) : null);
  }, [open, campaign?.id]);

  function update<Key extends keyof CampaignDraft>(
    key: Key,
    value: CampaignDraft[Key]
  ) {
    setDraft(current => (current ? { ...current, [key]: value } : current));
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setDraft(null);
    }
  }

  if (!draft) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Kampagne erstellen" : "Kampagne bearbeiten"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Neue Marketingkampagne anlegen."
              : "Budget, Laufzeit und Ergebnisse aktualisieren."}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="campaign-name">Name</FieldLabel>
            <Input
              id="campaign-name"
              value={draft.name}
              onChange={event => update("name", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-channel">Kanal</FieldLabel>
            <Select
              value={draft.channel}
              onValueChange={value =>
                update("channel", value as CampaignChannel)
              }
            >
              <SelectTrigger id="campaign-channel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {CHANNELS.map(channel => (
                    <SelectItem key={channel} value={channel}>
                      {channel}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-status">Status</FieldLabel>
            <Select
              value={draft.status}
              onValueChange={value =>
                update("status", value as CampaignStatus)
              }
            >
              <SelectTrigger id="campaign-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="aktiv">Aktiv</SelectItem>
                  <SelectItem value="pausiert">Pausiert</SelectItem>
                  <SelectItem value="beendet">Beendet</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-budget">Budget (EUR)</FieldLabel>
            <Input
              id="campaign-budget"
              inputMode="decimal"
              placeholder="1.250,00"
              value={draft.budget}
              onChange={event => update("budget", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-spent">Ausgegeben (EUR)</FieldLabel>
            <Input
              id="campaign-spent"
              inputMode="decimal"
              placeholder="0,00"
              value={draft.spent}
              onChange={event => update("spent", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-leads">Leads</FieldLabel>
            <Input
              id="campaign-leads"
              inputMode="numeric"
              value={draft.leads}
              onChange={event => update("leads", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-signups">Anmeldungen</FieldLabel>
            <Input
              id="campaign-signups"
              inputMode="numeric"
              value={draft.signups}
              onChange={event => update("signups", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-start">Startdatum</FieldLabel>
            <Input
              id="campaign-start"
              type="date"
              value={draft.startDate}
              onChange={event => update("startDate", event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="campaign-end">
              Enddatum (leer = laufend)
            </FieldLabel>
            <Input
              id="campaign-end"
              type="date"
              value={draft.endDate}
              onChange={event => update("endDate", event.target.value)}
            />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="campaign-notes">Notizen</FieldLabel>
            <Input
              id="campaign-notes"
              value={draft.notes}
              onChange={event => update("notes", event.target.value)}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Abbrechen
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={async () => {
              try {
                await onSave(draftToPayload(draft));
                handleOpenChange(false);
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Kampagne konnte nicht gespeichert werden."
                );
              }
            }}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Campaign card                                                        */
/* ------------------------------------------------------------------ */

function CampaignCard({
  campaign,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  campaign: Campaign;
  onEdit: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
}) {
  const pct = budgetPercent(campaign);
  const cpl = costPerLeadCents(campaign.spentCents, campaign.leads);
  const period = `${formatDate(campaign.startDate)} – ${
    campaign.endDate ? formatDate(campaign.endDate) : "laufend"
  }`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              channelAccents[campaign.channel]
            )}
          >
            <Megaphone className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{campaign.name}</CardTitle>
            <CardDescription>{period}</CardDescription>
          </div>
        </div>
        <CardAction>
          <div className="flex items-center gap-2">
            <StatusBadge status={campaign.status} />
            {campaign.status !== "beendet" && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  campaign.status === "aktiv"
                    ? `${campaign.name} pausieren`
                    : `${campaign.name} fortsetzen`
                }
                onClick={onToggleStatus}
              >
                {campaign.status === "aktiv" ? <Pause /> : <Play />}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${campaign.name} bearbeiten`}
              onClick={onEdit}
            >
              <Pencil />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              aria-label={`${campaign.name} löschen`}
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge variant="outline" className="w-fit">
          {campaign.channel}
        </Badge>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-medium tabular-nums">
              {formatEuro(campaign.spentCents)} / {formatEuro(campaign.budgetCents)}
            </span>
          </div>
          <Progress value={pct} />
          <span className="text-xs text-muted-foreground">
            {pct} % des Budgets ausgegeben
          </span>
        </div>
        <Separator />
        <dl className="grid grid-cols-3 gap-x-6 gap-y-1">
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Leads</dt>
            <dd className="text-sm font-medium tabular-nums">
              {campaign.leads}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Anmeldungen</dt>
            <dd className="text-sm font-medium tabular-nums">
              {campaign.signups}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs text-muted-foreground">Kosten/Lead</dt>
            <dd className="text-sm font-medium tabular-nums">
              {cpl === null ? "–" : formatEuro(cpl)}
            </dd>
          </div>
        </dl>
        {campaign.notes && (
          <p className="text-xs text-muted-foreground">{campaign.notes}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export function Marketing() {
  const { campaigns, loading, refresh } = useCampaigns();
  const [editingCampaignId, setEditingCampaignId] = useState<number | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const editingMode: "create" | "edit" = isCreateOpen ? "create" : "edit";
  const editingCampaign = isCreateOpen
    ? null
    : campaigns.find(campaign => campaign.id === editingCampaignId) ?? null;
  const isDialogOpen = isCreateOpen || editingCampaign !== null;

  async function toggleStatus(campaign: Campaign) {
    const nextStatus: CampaignStatus =
      campaign.status === "aktiv" ? "pausiert" : "aktiv";
    try {
      await updateCampaign(campaign.id, { status: nextStatus });
      await refresh();
      toast.success(
        nextStatus === "pausiert"
          ? "Kampagne pausiert."
          : "Kampagne fortgesetzt."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Status konnte nicht geändert werden."
      );
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteCampaign(pendingDelete.id);
      await refresh();
      toast.success("Kampagne gelöscht.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Löschen fehlgeschlagen."
      );
    } finally {
      if (editingCampaignId === pendingDelete.id) {
        setEditingCampaignId(null);
      }
      setPendingDelete(null);
    }
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader
        end={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingCampaignId(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus data-icon="inline-start" />
            Kampagne erstellen
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-t-lg rounded-b-2xl border border-border/70 bg-background p-4 2xl:p-6">
        <div className="stagger-in flex flex-col gap-4 2xl:gap-5">
          {loading && (
            <div className="text-sm text-muted-foreground">
              Lade Kampagnen…
            </div>
          )}

          {!loading && (
            <>
              <KpiCards campaigns={campaigns} />
              <ChannelChart campaigns={campaigns} />
              <div className="grid gap-4 md:grid-cols-2 2xl:gap-5">
                {campaigns.map(campaign => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onEdit={() => setEditingCampaignId(campaign.id)}
                    onToggleStatus={() => void toggleStatus(campaign)}
                    onDelete={() => setPendingDelete(campaign)}
                  />
                ))}
              </div>
              {campaigns.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Noch keine Kampagnen angelegt.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <CampaignEditDialog
        campaign={editingCampaign}
        mode={editingMode}
        open={isDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setEditingCampaignId(null);
            setIsCreateOpen(false);
          }
        }}
        onSave={async payload => {
          if (editingMode === "create") {
            await createCampaign(payload);
            toast.success("Kampagne erstellt.");
          } else if (editingCampaignId !== null) {
            await updateCampaign(editingCampaignId, payload);
            toast.success("Kampagne aktualisiert.");
          } else {
            return;
          }
          await refresh();
          setEditingCampaignId(null);
          setIsCreateOpen(false);
        }}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kampagne löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `„${pendingDelete.name}“ (${pendingDelete.channel}) wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Marketing;
