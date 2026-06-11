import { useState } from "react";
import {
  ArrowRight,
  Award,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Globe,
  Info,
  ListChecks,
  MapPin,
  Quote,
  Share2,
  Store,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "./components/PageHeader.tsx";
import {
  saveSchoolProfile,
  useSchoolProfile,
  type SchoolProfile,
} from "@/hooks/use-school-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type IconCmp = React.ComponentType<{ className?: string }>;

/* ------------------------------------------------------------------ */
/* Primitives composed from shadcn (same shapes as Profil.tsx)          */
/* ------------------------------------------------------------------ */

function Section({
  title,
  description,
  Icon,
  accent,
  children,
}: {
  title: string;
  description?: string;
  Icon: IconCmp;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-2.5">
          <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", accent)}>
            <Icon className="size-[18px]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function IconInput({
  Icon,
  ...props
}: { Icon: IconCmp } & React.ComponentProps<typeof Input>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input {...props} className={cn("pl-9", props.className)} />
    </div>
  );
}

/** Controlled tag editor — Badge chips with X, Enter/Backspace to edit. */
function TagEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-background p-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      {value.map(tag => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            aria-label={`${tag} entfernen`}
            onClick={() => onChange(value.filter(t => t !== tag))}
            className="rounded-full p-0.5 transition-colors hover:bg-foreground/10"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={e => {
          if (e.key === "Enter") {
            e.preventDefault();
            add();
          }
          if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[140px] flex-1 bg-transparent px-1.5 py-0.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export function Schulprofil() {
  const { profile, setProfile, refresh } = useSchoolProfile();
  const [dirty, setDirty] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const update = (patch: Partial<SchoolProfile>) =>
    setProfile(current => ({ ...current, ...patch }));

  const updateHours = (index: number, hours: string) =>
    setProfile(current => ({
      ...current,
      opening_hours: current.opening_hours.map((entry, i) =>
        i === index ? { ...entry, hours } : entry
      ),
    }));

  const markDirty = () => setDirty(true);

  const discard = () => {
    setDirty(false);
    setFormVersion(v => v + 1);
    void refresh();
  };

  const save = async () => {
    try {
      setProfile(await saveSchoolProfile(profile));
      setDirty(false);
      toast.success("Schulprofil gespeichert.");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Schulprofil konnte nicht gespeichert werden."
      );
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      {/* Header */}
      <PageHeader
        end={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={!dirty}
              className="hidden sm:inline-flex"
              onClick={discard}
            >
              Verwerfen
            </Button>
            <Button type="button" disabled={!dirty} onClick={save}>
              <Check />
              Speichern
            </Button>
          </>
        }
      />

      {/* Body */}
      <div
        key={formVersion}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-lg rounded-b-2xl border border-border/70 bg-background p-4 2xl:p-6"
        onInputCapture={markDirty}
        onClickCapture={event => {
          if ((event.target as HTMLElement).closest("button")) markDirty();
        }}
      >
        <div className="stagger-in mx-auto flex w-full max-w-[1080px] flex-col gap-4 2xl:gap-5">
          {/* Über uns */}
          <Section
            title="Über uns"
            description="So stellt sich Ihre Fahrschule öffentlich vor"
            Icon={Store}
            accent="bg-indigo-500/10 text-indigo-600"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Slogan" htmlFor="slogan" hint="Ein kurzer, prägnanter Satz.">
                <IconInput
                  Icon={Quote}
                  id="slogan"
                  placeholder="z. B. Sicher ans Ziel."
                  value={profile.slogan}
                  onChange={e => update({ slogan: e.target.value })}
                />
              </Field>
              <Field label="Gegründet" htmlFor="founded" hint="Jahr der Gründung (optional).">
                <IconInput
                  Icon={CalendarDays}
                  id="founded"
                  inputMode="numeric"
                  placeholder="z. B. 1998"
                  value={profile.founded_year ?? ""}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                    update({ founded_year: digits ? Number(digits) : null });
                  }}
                />
              </Field>
              <Field label="Webseite" htmlFor="website">
                <IconInput
                  Icon={Globe}
                  id="website"
                  type="url"
                  placeholder="https://…"
                  value={profile.website}
                  onChange={e => update({ website: e.target.value })}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Beschreibung" htmlFor="description">
                  <Textarea
                    id="description"
                    rows={4}
                    placeholder="Beschreiben Sie Ihre Fahrschule in wenigen Sätzen…"
                    value={profile.description}
                    onChange={e => update({ description: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Section>

          {/* Social Media */}
          <Section
            title="Social Media"
            description="Verlinken Sie Ihre Kanäle und Ihren Google-Maps-Eintrag"
            Icon={Share2}
            accent="bg-pink-500/10 text-pink-600"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Instagram" htmlFor="instagram">
                <IconInput
                  Icon={Camera}
                  id="instagram"
                  placeholder="https://instagram.com/…"
                  value={profile.instagram}
                  onChange={e => update({ instagram: e.target.value })}
                />
              </Field>
              <Field label="Facebook" htmlFor="facebook">
                <IconInput
                  Icon={ThumbsUp}
                  id="facebook"
                  placeholder="https://facebook.com/…"
                  value={profile.facebook}
                  onChange={e => update({ facebook: e.target.value })}
                />
              </Field>
              <Field label="Google Maps" htmlFor="maps">
                <IconInput
                  Icon={MapPin}
                  id="maps"
                  placeholder="https://maps.google.com/…"
                  value={profile.google_maps_url}
                  onChange={e => update({ google_maps_url: e.target.value })}
                />
              </Field>
            </div>
          </Section>

          {/* Öffnungszeiten */}
          <Section
            title="Öffnungszeiten"
            description="Wann ist Ihr Büro erreichbar?"
            Icon={Clock}
            accent="bg-sky-500/10 text-sky-600"
          >
            <div className="flex flex-col divide-y">
              {profile.opening_hours.map((entry, i) => (
                <div
                  key={entry.day}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="w-32 shrink-0 text-sm font-medium">{entry.day}</span>
                  <Input
                    value={entry.hours}
                    onChange={e => updateHours(i, e.target.value)}
                    placeholder="z. B. 09:00 – 18:00 oder Geschlossen"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Leistungen */}
          <Section
            title="Leistungen"
            description="Welche Angebote umfasst Ihre Fahrschule?"
            Icon={ListChecks}
            accent="bg-emerald-500/10 text-emerald-600"
          >
            <Field label="Leistungen" hint="Enter drücken zum Hinzufügen — z. B. Klasse B, Intensivkurse, Theorieunterricht online.">
              <TagEditor
                value={profile.services}
                onChange={services => {
                  update({ services });
                  markDirty();
                }}
                placeholder="Leistung hinzufügen…"
              />
            </Field>
          </Section>

          {/* Highlights */}
          <Section
            title="Highlights"
            description="Was macht Ihre Fahrschule besonders?"
            Icon={Award}
            accent="bg-amber-500/10 text-amber-600"
          >
            <Field label="Highlights" hint="Enter drücken zum Hinzufügen — z. B. Moderne Fahrzeugflotte, Hohe Bestehensquote.">
              <TagEditor
                value={profile.highlights}
                onChange={highlights => {
                  update({ highlights });
                  markDirty();
                }}
                placeholder="Highlight hinzufügen…"
              />
            </Field>
          </Section>

          {/* Footer */}
          <Card>
            <CardContent className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="size-4 shrink-0" />
                <span className="text-sm">
                  Änderungen werden erst nach dem Speichern öffentlich sichtbar.
                </span>
              </div>
              <Button className="shrink-0" onClick={save}>
                Speichern
                <ArrowRight />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Schulprofil;
