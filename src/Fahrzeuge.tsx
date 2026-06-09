import { Car, Cog, Fuel, Gauge, Plus, ShieldCheck, User, Wrench } from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type IconCmp = React.ComponentType<{ className?: string }>;

type Detail = { Icon: IconCmp; label: string; value: string };

type Vehicle = {
  model: string;
  plate: string;
  klass: string;
  status: "aktiv" | "wartung";
  accent: string;
  details: Detail[];
};

const vehicles: Vehicle[] = [
  {
    model: "VW Golf",
    plate: "DA-FS 1234",
    klass: "B197",
    status: "aktiv",
    accent: "bg-sky-500/10 text-sky-600",
    details: [
      { Icon: Cog, label: "Getriebe", value: "Schaltgetriebe" },
      { Icon: Fuel, label: "Kraftstoff", value: "Diesel" },
      { Icon: Gauge, label: "Kilometerstand", value: "84.320 km" },
      { Icon: User, label: "Fahrlehrer/in", value: "Nadine Aksoy" },
      { Icon: Wrench, label: "Nächste HU", value: "03/2027" },
      { Icon: ShieldCheck, label: "Versicherung", value: "Allianz · gültig" },
    ],
  },
  {
    model: "Audi A3",
    plate: "DA-FS 5678",
    klass: "B Automatik",
    status: "wartung",
    accent: "bg-emerald-500/10 text-emerald-600",
    details: [
      { Icon: Cog, label: "Getriebe", value: "Automatik" },
      { Icon: Fuel, label: "Kraftstoff", value: "Benzin" },
      { Icon: Gauge, label: "Kilometerstand", value: "51.090 km" },
      { Icon: User, label: "Fahrlehrer/in", value: "Emre Gül" },
      { Icon: Wrench, label: "Nächste HU", value: "11/2026" },
      { Icon: ShieldCheck, label: "Versicherung", value: "HUK · gültig" },
    ],
  },
];

function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-lg",
              vehicle.accent
            )}
          >
            <Car className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-base">{vehicle.model}</CardTitle>
            <CardDescription className="font-mono tracking-tight">
              {vehicle.plate}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Badge variant={vehicle.status === "aktiv" ? "secondary" : "outline"}>
            {vehicle.status === "aktiv" ? "Aktiv" : "In Wartung"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Badge variant="outline" className="w-fit">
          Klasse {vehicle.klass}
        </Badge>
        <Separator />
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {vehicle.details.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Icon className="size-4" />
              </div>
              <div className="flex min-w-0 flex-col">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="truncate text-sm font-medium">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function Fahrzeuge() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <PageHeader
        end={
          <Button type="button" size="sm">
            <Plus data-icon="inline-start" />
            Fahrzeug hinzufügen
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto p-4 2xl:p-6">
        <div className="stagger-in grid gap-4 md:grid-cols-2 2xl:gap-5">
          {vehicles.map(vehicle => (
            <VehicleCard key={vehicle.plate} vehicle={vehicle} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Fahrzeuge;
