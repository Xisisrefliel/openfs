/* ------------------------------------------------------------------ */
/* Fahrschüler detail page — replaces the old detail dialog. The main  */
/* pane transitions here from the roster table (/fahrschueler/:id);    */
/* sections live in grouped tabs on the sticky header, the same        */
/* pattern as /buchhaltung.                                            */
/* ------------------------------------------------------------------ */

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { DokumenteTab } from "./components/fahrschueler/DokumenteTab";
import { PreiseTab } from "./components/fahrschueler/PreiseTab";
import { StundenTab } from "./components/fahrschueler/StundenTab";
import { UebersichtTab } from "./components/fahrschueler/UebersichtTab";
import { ZahlungTab } from "./components/fahrschueler/ZahlungTab";
import type { Student } from "@/lib/student-data";
import { useInstructors } from "@/hooks/use-instructors";
import { updateStudent, useStudents } from "@/hooks/use-students";
import { useVehicleOptions } from "@/hooks/use-vehicle-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type TabKey = "uebersicht" | "stunden" | "dokumente" | "zahlung" | "preise";

const tabs: { value: TabKey; label: string }[] = [
  { value: "uebersicht", label: "Übersicht" },
  { value: "stunden", label: "Stundenübersicht" },
  { value: "dokumente", label: "Dokumente" },
  { value: "zahlung", label: "Zahlungserfassung" },
  { value: "preise", label: "Preise" },
];

export function FahrschuelerDetail({
  studentId,
  navigate,
}: {
  studentId: number;
  navigate: (to: string) => void;
}) {
  const { students, loading, refresh } = useStudents();
  const { assignableNames: instructorOptions } = useInstructors();
  const { vehicleOptions } = useVehicleOptions();
  const [tab, setTab] = useState<TabKey>("uebersicht");

  const student = students.find(entry => entry.id === studentId) ?? null;
  const hasDebt = student?.balance.startsWith("-") ?? false;

  const save = async (updates: Partial<Student>) => {
    await updateStudent(studentId, updates);
    await refresh();
  };

  const renderTab = () => {
    if (!student) return null;
    switch (tab) {
      case "uebersicht":
        return (
          <UebersichtTab
            student={student}
            instructorOptions={instructorOptions}
            vehicleOptions={vehicleOptions}
            onSave={save}
          />
        );
      case "stunden":
        return <StundenTab student={student} />;
      case "dokumente":
        return <DokumenteTab student={student} onSave={save} />;
      case "zahlung":
        return <ZahlungTab student={student} />;
      case "preise":
        return <PreiseTab student={student} onSave={save} navigate={navigate} />;
    }
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-background">
      <PageHeader
        center={
          <div className="max-w-[calc(100vw-26rem)] overflow-x-auto">
            <ToggleGroup
              type="single"
              value={tab}
              onValueChange={value => {
                if (value) setTab(value as TabKey);
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Fahrschüler Bereich"
            >
              {tabs.map(item => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  aria-label={item.label}
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        }
        end={
          student && (
            <>
              <Badge variant="secondary" className="max-lg:hidden">
                {student.status === "aktiv" ? "Aktiv" : "Inaktiv"}
              </Badge>
              <Badge
                variant="outline"
                className={
                  hasDebt
                    ? "bg-red-50 text-red-700 ring-red-600/20 max-lg:hidden"
                    : "bg-green-50 text-green-700 ring-green-600/20 max-lg:hidden"
                }
              >
                Bilanz {student.balance}
              </Badge>
            </>
          )
        }
      >
        <div className="flex min-w-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Zurück zur Fahrschülerliste"
            onClick={() => navigate("/fahrschueler")}
          >
            <ArrowLeft />
          </Button>
          {student && (
            <span className="truncate text-sm font-medium">
              {student.firstName} {student.lastName}
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground xl:inline">
                {student.contractNumber} · Klasse {student.classes}
              </span>
            </span>
          )}
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto p-4 2xl:p-6">
        {loading && !student ? (
          <div className="flex min-h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : !student ? (
          <Empty className="min-h-64 border-0">
            <EmptyHeader>
              <EmptyTitle>Fahrschüler nicht gefunden</EmptyTitle>
              <EmptyDescription>
                Der Eintrag existiert nicht oder wurde entfernt.
              </EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/fahrschueler")}
            >
              <ArrowLeft data-icon="inline-start" />
              Zur Übersicht
            </Button>
          </Empty>
        ) : (
          <div className="animate-enter">
            <div key={tab} className="animate-agenda-fade">
              {renderTab()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
