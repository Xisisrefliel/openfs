/* ------------------------------------------------------------------ */
/* Ausbildungsvertrag — schriftlicher Fahrschulvertrag mit den nach    */
/* § 32 FahrlG erforderlichen Entgeltangaben (Grundbetrag, Fahrstunde, */
/* Vorstellungsentgelte) und den branchenüblichen Vertragsbedingungen  */
/* (Kündigungsstaffel, Ausfallentschädigung, FahrschAusbO, DSGVO).     */
/*                                                                     */
/* VertragSheet renders the A4 document. The dialog shows a preview    */
/* plus editable Preise (persisted in localStorage) and portals a copy */
/* into <div id="print-root"> so window.print() emits only the         */
/* contract — same pattern as QuittungDialog.                          */
/* ------------------------------------------------------------------ */

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Printer, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { StudentRecord } from "@/hooks/use-students";
import type { CompanyProfile } from "@/lib/accounting-types";

type VertragPreise = {
  grundbetrag: string;
  fahrstunde: string;
  sonderfahrt: string;
  theoriePruefung: string;
  praxisPruefung: string;
  lernmaterial: string;
};

const PREISE_STORAGE_KEY = "fahrschule.vertrag.preise";

const EMPTY_PREISE: VertragPreise = {
  grundbetrag: "",
  fahrstunde: "",
  sonderfahrt: "",
  theoriePruefung: "",
  praxisPruefung: "",
  lernmaterial: "",
};

const PREIS_LABELS: Record<keyof VertragPreise, string> = {
  grundbetrag: "Grundbetrag",
  fahrstunde: "Fahrstunde (45 Min.)",
  sonderfahrt: "Sonderfahrt (45 Min.)",
  theoriePruefung: "Vorstellung theor. Prüfung",
  praxisPruefung: "Vorstellung prakt. Prüfung",
  lernmaterial: "Lernmaterial (optional)",
};

function loadPreise(): VertragPreise {
  try {
    const raw = localStorage.getItem(PREISE_STORAGE_KEY);
    if (!raw) return EMPTY_PREISE;
    return { ...EMPTY_PREISE, ...(JSON.parse(raw) as Partial<VertragPreise>) };
  } catch {
    return EMPTY_PREISE;
  }
}

/** "450" / "450,00 €" / "450,00 EUR" → "450,00 EUR"; leer → null */
function formatPreis(value: string): string | null {
  const cleaned = value.replace(/€|eur/gi, "").trim();
  if (!cleaned) return null;
  const normalized = /,\d{1,2}$/.test(cleaned) ? cleaned : `${cleaned},00`;
  return `${normalized} EUR`;
}

/** "Lorscher Straße 6, 60489 Frankfurt am Main" → "Frankfurt am Main" */
function cityFromAddress(address: string): string {
  const last = address.split(",").pop() ?? "";
  return last.replace(/\d/g, "").trim();
}

function todayFormatted(): string {
  return new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Clause({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1" style={{ breakInside: "avoid" }}>
      <span className="font-semibold">
        § {number} {title}
      </span>
      <div className="flex flex-col gap-1 text-justify">{children}</div>
    </div>
  );
}

function VertragSheet({
  student,
  issuer,
  preise,
}: {
  student: StudentRecord;
  issuer: CompanyProfile;
  preise: VertragPreise;
}) {
  const klassen = student.classes || "—";
  const preisRows: { label: string; value: string | null }[] = [
    {
      label:
        "Grundbetrag (allgemeine Aufwendungen einschließlich des gesamten theoretischen Unterrichts)",
      value: formatPreis(preise.grundbetrag),
    },
    {
      label: "Fahrstunde – Übungsstunde, je Unterrichtseinheit zu 45 Minuten",
      value: formatPreis(preise.fahrstunde),
    },
    {
      label:
        "Besondere Ausbildungsfahrt (Überland-, Autobahn-, Nachtfahrt), je 45 Minuten",
      value: formatPreis(preise.sonderfahrt),
    },
    {
      label: "Vorstellung zur theoretischen Prüfung",
      value: formatPreis(preise.theoriePruefung),
    },
    {
      label: "Vorstellung zur praktischen Prüfung (einschließlich Prüfungsfahrt)",
      value: formatPreis(preise.praxisPruefung),
    },
  ];
  const lernmaterial = formatPreis(preise.lernmaterial);
  if (lernmaterial) {
    preisRows.push({ label: "Lernmaterial / Lehrmittel", value: lernmaterial });
  }

  return (
    <div className="flex w-full flex-col gap-5 bg-white p-10 font-sans text-[12px] leading-relaxed text-black">
      {/* Kopf: Fahrschule + Dokument */}
      <div className="flex items-start justify-between gap-8">
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold">{issuer.name}</span>
          <span>{issuer.address}</span>
          <span>
            {[issuer.phone && `Tel. ${issuer.phone}`, issuer.email]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {issuer.website && <span>{issuer.website}</span>}
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-2xl font-bold tracking-wide">AUSBILDUNGSVERTRAG</span>
          <span className="font-medium">Vertrags-Nr. {student.contractNumber}</span>
          {student.customerNumber && <span>Kunden-Nr. {student.customerNumber}</span>}
          <span>Datum: {student.registrationDate || todayFormatted()}</span>
        </div>
      </div>

      <div className="h-px bg-black/20" />

      {/* Vertragsparteien */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wide text-black/60">
          Zwischen
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{issuer.name}</span>
          <span>{issuer.address}</span>
          <span className="text-black/60">— nachfolgend „Fahrschule" —</span>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-black/60">und</span>
        <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
          <span>
            <span className="text-black/60">Name:</span>{" "}
            <span className="font-medium">
              {student.firstName} {student.lastName}
            </span>
          </span>
          <span>
            <span className="text-black/60">Geburtsdatum:</span>{" "}
            {student.birthday || "________________"}
          </span>
          <span>
            <span className="text-black/60">Anschrift:</span>{" "}
            {student.address || "________________________________"}
          </span>
          <span>
            <span className="text-black/60">Telefon:</span>{" "}
            {student.phone || "________________"}
          </span>
          <span>
            <span className="text-black/60">E-Mail:</span>{" "}
            {student.email || "________________________________"}
          </span>
          <span>
            <span className="text-black/60">Bei Minderjährigen vertreten durch:</span>{" "}
            ________________________________
          </span>
        </div>
        <span className="text-black/60">
          — nachfolgend „Fahrschüler/in" — wird folgender Ausbildungsvertrag geschlossen:
        </span>
      </div>

      <Clause number={1} title="Gegenstand der Ausbildung">
        <p>
          Die Fahrschule übernimmt die theoretische und praktische Ausbildung des
          Fahrschülers / der Fahrschülerin zum Erwerb der Fahrerlaubnis der Klasse(n){" "}
          <span className="font-semibold">{klassen}</span>. Die Ausbildung erfolgt nach
          Maßgabe der Fahrschüler-Ausbildungsordnung (FahrschAusbO) auf Grundlage der
          amtlichen Rahmenpläne; sie umfasst den theoretischen Unterricht, den praktischen
          Fahrunterricht einschließlich der gesetzlich vorgeschriebenen besonderen
          Ausbildungsfahrten (Überland-, Autobahn- und Nachtfahrten) sowie die Vorstellung
          zur theoretischen und praktischen Prüfung. Die Fahrschule verpflichtet sich, die
          Ausbildung gewissenhaft und zielstrebig durchzuführen.
        </p>
      </Clause>

      <Clause number={2} title="Entgelte (§ 32 FahrlG)">
        <p>
          Es gelten die folgenden Entgelte. Sie entsprechen dem Preisaushang der
          Fahrschule nach § 32 Fahrlehrergesetz (FahrlG) sowie den Grundsätzen der
          Preisklarheit und Preiswahrheit.
        </p>
        <table className="w-full border-collapse">
          <tbody>
            {preisRows.map((row) => (
              <tr key={row.label} className="border-b border-black/10">
                <td className="py-1 pr-2">{row.label}</td>
                <td className="py-1 text-right font-medium tabular-nums whitespace-nowrap">
                  {row.value ?? "____________ EUR"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Nicht in den Entgelten enthalten sind die Gebühren der Technischen Prüfstelle
          (TÜV/DEKRA) für die theoretische und praktische Prüfung sowie die Gebühren der
          Fahrerlaubnisbehörde. Diese sind durchlaufende Posten und vom Fahrschüler / von
          der Fahrschülerin unmittelbar bzw. gesondert zu tragen.
        </p>
      </Clause>

      <Clause number={3} title="Zahlungsbedingungen">
        <p>
          Der Grundbetrag ist bei Vertragsabschluss fällig. Die Entgelte für Fahrstunden
          und besondere Ausbildungsfahrten sind jeweils nach Inanspruchnahme, spätestens
          vor Antritt der nächsten Fahrstunde, zu zahlen. Die Vorstellungsentgelte sowie
          die Gebühren der Technischen Prüfstelle sind spätestens drei Werktage vor dem
          jeweiligen Prüfungstermin zu entrichten. Bei Zahlungsverzug ist die Fahrschule
          berechtigt, die weitere Ausbildung und die Vorstellung zur Prüfung bis zum
          Ausgleich der offenen Forderungen zurückzustellen.
        </p>
      </Clause>

      <Clause number={4} title="Terminabsagen und Ausfallentschädigung">
        <p>
          Vereinbarte Fahrstunden sind verbindlich. Werden sie nicht mindestens zwei
          Werktage vor dem vereinbarten Termin abgesagt, ist die Fahrschule berechtigt,
          eine Ausfallentschädigung in Höhe von drei Vierteln (75 %) des vereinbarten
          Fahrstundenentgelts zu verlangen, es sei denn, der Fahrschüler / die
          Fahrschülerin hat die Verhinderung nicht zu vertreten oder die Fahrschule konnte
          den Termin anderweitig vergeben.
        </p>
      </Clause>

      <Clause number={5} title="Pflichten des Fahrschülers / der Fahrschülerin">
        <p>
          Der Fahrschüler / die Fahrschülerin verpflichtet sich, die Ausbildungstermine
          pünktlich wahrzunehmen, die erforderlichen Lernmittel zu nutzen und an der
          Ausbildung aktiv mitzuwirken. Zum Fahrunterricht darf nicht erscheinen, wer
          unter Einfluss von Alkohol, berauschenden Mitteln oder die Fahrtüchtigkeit
          beeinträchtigenden Medikamenten steht; in diesem Fall kann die Fahrschule die
          Fahrstunde absagen, das vereinbarte Entgelt bleibt geschuldet. Körperliche oder
          geistige Einschränkungen, die die Eignung zum Führen von Kraftfahrzeugen
          berühren können, sowie bestehende oder frühere Fahrerlaubnisse, Fahrverbote oder
          anhängige Verfahren sind der Fahrschule mitzuteilen. Eine erforderliche Sehhilfe
          ist zum Fahrunterricht mitzuführen.
        </p>
      </Clause>

      <Clause number={6} title="Dauer und Ende der Ausbildung">
        <p>
          Der Vertrag endet mit dem Bestehen der praktischen Prüfung. Nimmt der
          Fahrschüler / die Fahrschülerin länger als ein Jahr keine Ausbildungsleistung in
          Anspruch, endet der Vertrag ebenfalls; bereits erbrachte Leistungen werden nach
          diesem Vertrag abgerechnet.
        </p>
      </Clause>

      <Clause number={7} title="Kündigung">
        <p>
          Der Fahrschüler / die Fahrschülerin kann den Vertrag jederzeit ohne Einhaltung
          einer Frist in Textform kündigen. Die Fahrschule kann den Vertrag nur aus
          wichtigem Grund kündigen. Kündigt der Fahrschüler / die Fahrschülerin, ohne dass
          die Fahrschule dies durch vertragswidriges Verhalten veranlasst hat, oder
          kündigt die Fahrschule aus wichtigem Grund, steht der Fahrschule neben dem
          Entgelt für die in Anspruch genommenen Fahrstunden und Prüfungsvorstellungen der
          folgende Anteil des Grundbetrags zu:
        </p>
        <ul className="list-disc pl-5">
          <li>vor Beginn der Ausbildung: 1/5 des Grundbetrags,</li>
          <li>
            vor Absolvierung eines Drittels des theoretischen Unterrichts: 2/5 des
            Grundbetrags,
          </li>
          <li>
            vor Absolvierung von zwei Dritteln des theoretischen Unterrichts: 3/5 des
            Grundbetrags,
          </li>
          <li>danach: 4/5 des Grundbetrags.</li>
        </ul>
        <p>
          Kündigt die Fahrschule ohne wichtigen Grund oder kündigt der Fahrschüler / die
          Fahrschülerin wegen vertragswidrigen Verhaltens der Fahrschule, besteht kein
          Anspruch auf den Grundbetrag; bereits in Anspruch genommene Fahrstunden werden
          abgerechnet.
        </p>
      </Clause>

      <Clause number={8} title="Ausbildungsbescheinigung">
        <p>
          Wird die Ausbildung vor ihrem Abschluss beendet, erhält der Fahrschüler / die
          Fahrschülerin nach Ausgleich aller fälligen Entgelte unverzüglich eine
          Bescheinigung über die durchgeführte Ausbildung nach Maßgabe der FahrschAusbO,
          damit die Ausbildung bei einer anderen Fahrschule fortgesetzt werden kann.
        </p>
      </Clause>

      <Clause number={9} title="Datenschutz">
        <p>
          Die Fahrschule verarbeitet die personenbezogenen Daten des Fahrschülers / der
          Fahrschülerin zur Durchführung dieses Vertrags (Art. 6 Abs. 1 lit. b DSGVO).
          Soweit für die Anmeldung zur Prüfung erforderlich, werden Daten an die
          Technische Prüfstelle (TÜV/DEKRA) und die zuständige Fahrerlaubnisbehörde
          übermittelt. Dem Fahrschüler / der Fahrschülerin stehen die Rechte auf Auskunft,
          Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und
          Widerspruch sowie ein Beschwerderecht bei der zuständigen Aufsichtsbehörde zu.
        </p>
      </Clause>

      <Clause number={10} title="Widerrufsrecht">
        <p>
          Wird dieser Vertrag außerhalb der Geschäftsräume der Fahrschule oder
          ausschließlich über Fernkommunikationsmittel geschlossen, steht dem Fahrschüler
          / der Fahrschülerin ein Widerrufsrecht von 14 Tagen ab Vertragsschluss zu (§§
          312g, 355 BGB). Der Widerruf ist durch eindeutige Erklärung gegenüber der
          Fahrschule (z. B. Brief oder E-Mail an die oben genannten Kontaktdaten) zu
          erklären. Verlangt der Fahrschüler / die Fahrschülerin, dass die Ausbildung
          bereits vor Ablauf der Widerrufsfrist beginnt, ist im Falle des Widerrufs
          Wertersatz für die bis dahin erbrachten Leistungen zu zahlen.
        </p>
      </Clause>

      <Clause number={11} title="Schlussbestimmungen">
        <p>
          Änderungen und Ergänzungen dieses Vertrags bedürfen der Textform. Sollten
          einzelne Bestimmungen dieses Vertrags unwirksam sein oder werden, bleibt die
          Wirksamkeit der übrigen Bestimmungen unberührt. Es gilt das Recht der
          Bundesrepublik Deutschland.
        </p>
      </Clause>

      {/* Unterschriften */}
      <div className="mt-6 flex flex-col gap-8" style={{ breakInside: "avoid" }}>
        <span>
          {cityFromAddress(issuer.address)}, den{" "}
          {student.registrationDate || todayFormatted()}
        </span>
        <div className="grid grid-cols-3 gap-8">
          <div className="flex flex-col items-center gap-1">
            <div className="w-full border-t border-black/60" />
            <span className="text-[11px] text-black/60">Unterschrift Fahrschule</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-full border-t border-black/60" />
            <span className="text-[11px] text-black/60">Unterschrift Fahrschüler/in</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-full border-t border-black/60" />
            <span className="text-center text-[11px] text-black/60">
              Gesetzliche/r Vertreter/in (bei Minderjährigen)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VertragDialog({
  student,
  onClose,
}: {
  student: StudentRecord | null;
  onClose: () => void;
}) {
  const [issuer, setIssuer] = useState<CompanyProfile | null>(null);
  const [preise, setPreise] = useState<VertragPreise>(loadPreise);

  useEffect(() => {
    if (student == null || issuer != null) return;
    let cancelled = false;
    fetch("/api/profile")
      .then((response) => response.json())
      .then((profile: CompanyProfile) => {
        if (!cancelled) setIssuer(profile);
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(
            "Firmenprofil konnte nicht geladen werden — Angaben im Dokument unvollständig.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [student, issuer]);

  const updatePreis = (key: keyof VertragPreise, value: string) => {
    setPreise((current) => {
      const next = { ...current, [key]: value };
      try {
        localStorage.setItem(PREISE_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const printRoot = document.getElementById("print-root");
  const missingPreise = (Object.keys(PREIS_LABELS) as (keyof VertragPreise)[]).filter(
    (key) => key !== "lernmaterial" && !preise[key].trim(),
  );

  return (
    <Dialog
      open={student != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Ausbildungsvertrag
            {student ? ` – ${student.firstName} ${student.lastName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Schriftlicher Fahrschulvertrag mit Entgeltangaben nach § 32 FahrlG und
            Ausbildung nach FahrschAusbO.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(PREIS_LABELS) as (keyof VertragPreise)[]).map((key) => (
            <Field key={key}>
              <FieldLabel htmlFor={`vertrag-preis-${key}`}>
                {PREIS_LABELS[key]}
              </FieldLabel>
              <Input
                id={`vertrag-preis-${key}`}
                value={preise[key]}
                onChange={(event) => updatePreis(key, event.target.value)}
                placeholder="z. B. 65,00"
              />
            </Field>
          ))}
        </FieldGroup>

        {missingPreise.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Es fehlen Preise ({missingPreise.map((key) => PREIS_LABELS[key]).join(", ")}
              ). Ohne vollständige Entgeltangaben nach § 32 FahrlG ist der Vertrag nicht
              vollständig — die fehlenden Beträge erscheinen als Leerfelder zum
              handschriftlichen Ausfüllen.
            </span>
          </div>
        )}

        {student == null || issuer == null ? (
          <div className="flex min-h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="max-h-[55vh] overflow-auto rounded-lg border shadow-sm">
              <VertragSheet student={student} issuer={issuer} preise={preise} />
            </div>
            {/* Print copy outside the app root — the only thing printed. */}
            {printRoot &&
              createPortal(
                <VertragSheet student={student} issuer={issuer} preise={preise} />,
                printRoot,
              )}
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Schließen
          </Button>
          <Button
            type="button"
            disabled={student == null || issuer == null}
            onClick={() => window.print()}
          >
            <Printer data-icon="inline-start" />
            Drucken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
