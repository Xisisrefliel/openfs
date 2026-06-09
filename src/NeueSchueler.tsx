import { useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  CalendarDays,
  Car,
  Check,
  ClipboardList,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  User,
} from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type IconCmp = React.ComponentType<{ className?: string }>;

const classOptions = ["A", "B", "B197", "BE"];
const vehicleOptions = ["Audi A3", "Cupra Born", "VW Golf", "Nicht zugeteilt"];
const instructorOptions = [
  "Nadine Aksoy",
  "Emre Guel",
  "Sven Kappel",
  "Nicht zugeteilt",
];
const documentOptions = ["Personalausweis", "Passbild", "Sehtest", "Vertrag"];

/* Pflichtstunden (Sonderfahrten) — feste Vorgaben, Stand bei Anmeldung 0. */
const requiredLessons = [
  { label: "Nachtfahrt", target: "0/135 min" },
  { label: "Autobahnfahrt", target: "0/180 min" },
  { label: "Überlandfahrt", target: "0/225 min" },
  { label: "Theorieunterricht", target: "0/14 Einheiten" },
];

const TODAY = "09.06.2026";

const formatDate = (date: Date) =>
  [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear(),
  ].join(".");

const parseDate = (value: string): Date | undefined => {
  const [day, month, year] = value.split(".").map(Number);
  if (!day || !month || !year) return undefined;
  return new Date(year, month - 1, day);
};

/* IDs are assigned by the system, not entered by hand. Generate a sequential
   pair (customer + contract) that continues the existing numbering range. */
function generateIds() {
  const offset = Math.floor(Math.random() * 60);
  const contract = 1043 + offset;
  return {
    customerNumber: String(10059 + offset),
    contractNumber: `V-2026-${contract}`,
  };
}

type Status = "aktiv" | "inaktiv";

type FormState = {
  firstName: string;
  lastName: string;
  birthday: string;
  classes: string;
  phone: string;
  email: string;
  address: string;
  instructor: string;
  vehicle: string;
  customerNumber: string;
  registrationDate: string;
  contractNumber: string;
  drivingSchool: string;
  balance: string;
  status: Status;
  documents: string[];
};

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  birthday: "",
  classes: "B",
  phone: "",
  email: "",
  address: "",
  instructor: "Nicht zugeteilt",
  vehicle: "Nicht zugeteilt",
  customerNumber: "",
  registrationDate: TODAY,
  contractNumber: "",
  drivingSchool: "Fahrschule Guel",
  balance: "0,00 EUR",
  status: "aktiv",
  documents: [],
};

function Section({
  title,
  description,
  Icon,
  accent,
  className,
  children,
}: {
  title: string;
  description?: string;
  Icon: IconCmp;
  accent: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-6 items-center justify-center rounded-md",
              accent
            )}
          >
            <Icon className="size-3.5" />
          </span>
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function NeueSchueler() {
  const [form, setForm] = useState<FormState>(() => ({
    ...initialForm,
    ...generateIds(),
  }));
  const [dirty, setDirty] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const toggleDocument = (doc: string, checked: boolean) => {
    setForm(current => ({
      ...current,
      documents: checked
        ? [...current.documents, doc]
        : current.documents.filter(item => item !== doc),
    }));
    setDirty(true);
  };

  const reset = () => {
    setForm({ ...initialForm, ...generateIds() });
    setDirty(false);
  };

  const canSubmit = form.firstName.trim() !== "" && form.lastName.trim() !== "";

  const submit = () => {
    if (!canSubmit) return;
    toast.success("Schüler/in angelegt", {
      description: `${form.firstName} ${form.lastName} wurde zur Fahrschule hinzugefügt.`,
    });
    reset();
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <PageHeader
        end={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!dirty}
              onClick={reset}
              className="hidden sm:inline-flex"
            >
              Verwerfen
            </Button>
            <Button type="button" size="sm" disabled={!canSubmit} onClick={submit}>
              <Check data-icon="inline-start" />
              Schüler anlegen
            </Button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto p-4 2xl:p-6">
        <div className="stagger-in mx-auto grid w-full max-w-[1080px] gap-4 lg:grid-cols-6 2xl:gap-5">
          {/* Stammdaten */}
          <Section
            title="Stammdaten"
            description="Persönliche Angaben des Fahrschülers"
            Icon={User}
            accent="bg-indigo-500/10 text-indigo-600"
            className="lg:col-span-4"
          >
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="firstName">Vorname</FieldLabel>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={event => update("firstName", event.target.value)}
                  placeholder="Lena"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="lastName">Nachname</FieldLabel>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={event => update("lastName", event.target.value)}
                  placeholder="Braun"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="birthday">Geburtsdatum</FieldLabel>
                <Input
                  id="birthday"
                  value={form.birthday}
                  onChange={event => update("birthday", event.target.value)}
                  placeholder="TT.MM.JJJJ"
                />
              </Field>
              <Field>
                <FieldLabel>Klasse</FieldLabel>
                <Select
                  value={form.classes}
                  onValueChange={value => update("classes", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {classOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </Section>

          {/* Zuteilung */}
          <Section
            title="Zuteilung"
            description="Fahrlehrer/in und Fahrzeug"
            Icon={GraduationCap}
            accent="bg-amber-500/10 text-amber-600"
            className="lg:col-span-2"
          >
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel>Fahrlehrer/in</FieldLabel>
                <Select
                  value={form.instructor}
                  onValueChange={value => update("instructor", value)}
                >
                  <SelectTrigger>
                    <GraduationCap className="text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {instructorOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Fahrzeug</FieldLabel>
                <Select
                  value={form.vehicle}
                  onValueChange={value => update("vehicle", value)}
                >
                  <SelectTrigger>
                    <Car className="text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {vehicleOptions.map(option => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          </Section>

          {/* Kontakt */}
          <Section
            title="Kontakt"
            Icon={Phone}
            accent="bg-sky-500/10 text-sky-600"
            className="lg:col-span-2"
          >
            <FieldGroup className="gap-3">
              <Field>
                <FieldLabel htmlFor="phone">Telefon</FieldLabel>
                <div className="relative">
                  <Phone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-9"
                    value={form.phone}
                    onChange={event => update("phone", event.target.value)}
                    placeholder="+49 151 23456780"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">E-Mail</FieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    value={form.email}
                    onChange={event => update("email", event.target.value)}
                    placeholder="lena.braun@example.com"
                  />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="address">Adresse</FieldLabel>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    className="min-h-16 pl-9"
                    value={form.address}
                    onChange={event => update("address", event.target.value)}
                    placeholder="Weidingweg 31, 64297 Darmstadt"
                  />
                </div>
              </Field>
            </FieldGroup>
          </Section>

          {/* Dokumente */}
          <Section
            title="Dokumente"
            description="Vorliegende Unterlagen"
            Icon={FileText}
            accent="bg-emerald-500/10 text-emerald-600"
            className="lg:col-span-2"
          >
            <div className="flex flex-col gap-2">
              {documentOptions.map(doc => {
                const checked = form.documents.includes(doc);
                return (
                  <Label
                    key={doc}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm font-normal transition-colors",
                      checked ? "border-emerald-500/40 bg-emerald-500/5" : "hover:bg-muted"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={value => toggleDocument(doc, value === true)}
                    />
                    {doc}
                  </Label>
                );
              })}
            </div>
          </Section>

          {/* Ausbildung */}
          <Section
            title="Ausbildung"
            description="Pflichtstunden zum Start der Ausbildung"
            Icon={ClipboardList}
            accent="bg-violet-500/10 text-violet-600"
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Bereich</TableHead>
                    <TableHead className="text-right">Stand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requiredLessons.map(lesson => (
                    <TableRow key={lesson.label}>
                      <TableCell>{lesson.label}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {lesson.target}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Vertrag */}
          <Section
            title="Vertrag"
            description="Vertragsdaten, Fahrschule und Abrechnungszuordnung"
            Icon={Building2}
            accent="bg-rose-500/10 text-rose-600"
            className="lg:col-span-6"
          >
            <div className="flex flex-col gap-4">
              <FieldGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Field>
                  <FieldLabel>Kundennummer</FieldLabel>
                  <div className="flex h-8 items-center gap-2 rounded-lg border bg-muted/40 px-3 font-mono text-sm tabular-nums text-muted-foreground">
                    <Sparkles className="size-3.5 shrink-0 text-muted-foreground/70" />
                    {form.customerNumber}
                  </div>
                  <FieldDescription>Automatisch vergeben</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Vertragsnummer</FieldLabel>
                  <div className="flex h-8 items-center gap-2 rounded-lg border bg-muted/40 px-3 font-mono text-sm tabular-nums text-muted-foreground">
                    <Sparkles className="size-3.5 shrink-0 text-muted-foreground/70" />
                    {form.contractNumber}
                  </div>
                  <FieldDescription>Automatisch vergeben</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>Anmeldedatum</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 justify-start px-2.5 font-normal data-[empty=true]:text-muted-foreground"
                        data-empty={!form.registrationDate}
                      >
                        <CalendarDays data-icon="inline-start" className="text-muted-foreground" />
                        {form.registrationDate || "Datum wählen"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseDate(form.registrationDate)}
                        defaultMonth={parseDate(form.registrationDate)}
                        weekStartsOn={1}
                        onSelect={date => {
                          if (date) update("registrationDate", formatDate(date));
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
                <Field>
                  <FieldLabel htmlFor="drivingSchool">Fahrschule</FieldLabel>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="drivingSchool"
                      className="pl-9"
                      value={form.drivingSchool}
                      onChange={event => update("drivingSchool", event.target.value)}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="balance">Bilanz</FieldLabel>
                  <Input
                    id="balance"
                    value={form.balance}
                    onChange={event => update("balance", event.target.value)}
                  />
                </Field>
                <Field className="md:col-span-1">
                  <FieldLabel>Status</FieldLabel>
                  <ToggleGroup
                    type="single"
                    value={form.status}
                    onValueChange={value => {
                      if (value === "aktiv" || value === "inaktiv") {
                        update("status", value);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    spacing={0}
                    aria-label="Status"
                    className="w-full"
                  >
                    <ToggleGroupItem value="aktiv" className="flex-1">
                      Aktiv
                    </ToggleGroupItem>
                    <ToggleGroupItem value="inaktiv" className="flex-1">
                      Inaktiv
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
              </FieldGroup>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

export default NeueSchueler;
