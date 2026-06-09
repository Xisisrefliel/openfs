import "./index.css";
import { useEffect } from "react";
import { Agentation } from "agentation";
import {
  Caret,
  ChartBar,
  CompanyGrid,
  Expenses,
  Heart,
  Home,
  People,
  Pen,
  Send,
  Transfer,
} from "./icons";

type IconCmp = (p: { className?: string }) => React.ReactNode;

const navItems: { label: string; Icon: IconCmp; active?: boolean; iconClassName: string }[] = [
  { label: "Home", Icon: Home, active: true, iconClassName: "text-gray-12" },
  { label: "Profil", Icon: Pen, iconClassName: "text-gray-12" },
  { label: "Theorie", Icon: ChartBar, iconClassName: "text-gray-12" },
  { label: "Unterricht", Icon: People, iconClassName: "text-gray-12" },
  { label: "Schüler Anmeldung", Icon: People, iconClassName: "text-gray-12" },
];

const navGroups: {
  label: string;
  Icon: IconCmp;
  iconClassName: string;
  items: { label: string; Icon: IconCmp; iconClassName: string }[];
}[] = [
  {
    label: "Marketing",
    Icon: Send,
    iconClassName: "text-rose-500",
    items: [
      { label: "Marketing", Icon: Send, iconClassName: "text-rose-500" },
      { label: "Schulprofil", Icon: Home, iconClassName: "text-rose-500" },
      { label: "Preisangebot", Icon: Expenses, iconClassName: "text-rose-500" },
      { label: "Bewertungen", Icon: Heart, iconClassName: "text-rose-500" },
    ],
  },
  {
    label: "Verwaltung",
    Icon: Transfer,
    iconClassName: "text-orange-500",
    items: [
      { label: "Terminanfragen", Icon: Send, iconClassName: "text-orange-500" },
      { label: "Fahrschule", Icon: Home, iconClassName: "text-orange-500" },
      { label: "Kalender", Icon: ChartBar, iconClassName: "text-orange-500" },
      { label: "Fahrlehrer/in", Icon: People, iconClassName: "text-orange-500" },
      { label: "Fahrzeuge", Icon: Transfer, iconClassName: "text-orange-500" },
      { label: "Fahrschüler", Icon: People, iconClassName: "text-orange-500" },
      { label: "Theorie Gruppen", Icon: ChartBar, iconClassName: "text-orange-500" },
      { label: "Buchhaltung", Icon: Expenses, iconClassName: "text-orange-500" },
      { label: "Statistik", Icon: ChartBar, iconClassName: "text-orange-500" },
      { label: "Plaudern", Icon: Send, iconClassName: "text-orange-500" },
      { label: "aus", Icon: Transfer, iconClassName: "text-orange-500" },
      { label: "Verträge", Icon: Expenses, iconClassName: "text-orange-500" },
      { label: "Prüfungsplaner", Icon: ChartBar, iconClassName: "text-orange-500" },
    ],
  },
];

function DevAgentation() {
  useEffect(() => {
    const ignoreCrossOriginScriptError = (event: ErrorEvent) => {
      if (event.message === "Script error.") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("error", ignoreCrossOriginScriptError, true);

    return () => {
      window.removeEventListener("error", ignoreCrossOriginScriptError, true);
    };
  }, []);

  return <Agentation />;
}

export function App() {
  return (
    <>
      <div className="flex min-h-screen">
        <aside className="flex h-screen w-[240px] 2xl:w-[300px] shrink-0 flex-col bg-gray-2 overflow-hidden pt-1 2xl:pt-2">
        <div className="relative flex w-full shrink-0 items-center px-2 py-2 2xl:px-3 2xl:py-3 rounded-md cursor-default before:absolute before:inset-1 before:rounded-lg before:bg-transparent before:transition-colors hover:before:bg-gray-a3">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center">
              <div
                className="size-6 2xl:size-8 rounded-full object-cover shrink-0 bg-gradient-to-br from-indigo-400 to-purple-600"
                style={{
                  WebkitMaskImage:
                    "radial-gradient(13px at 26px 50%, transparent 99%, black 100%)",
                  maskImage:
                    "radial-gradient(13px at 26px 50%, transparent 99%, black 100%)",
                  background: "linear-gradient(135deg, #6366f1, #9333ea)",
                }}
              />
              <div className="size-6 2xl:size-8 -ml-2 2xl:-ml-3 rounded-full border border-border bg-gray-1 flex items-center justify-center shrink-0">
                <CompanyGrid className="" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[14px] 2xl:text-[17px] font-medium tracking-tight text-gray-12">
                Fahrschule
              </span>
              <span className="rounded-[4px] bg-blue-3 px-1 py-0.5 2xl:px-1.5 text-[9px] 2xl:text-[11px] font-medium text-blue-11">
                ADMIN
              </span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-1 2xl:px-2 pb-3 subtle-scrollbar">
          <div className="flex flex-col pt-3 pb-1.5 px-0.5">
            {navItems.map(({ label, Icon, active, iconClassName }) => (
              <div
                key={label}
                className={
                  "flex w-full items-center gap-1.5 2xl:gap-2 h-[28px] 2xl:h-[36px] my-px pl-1.5 2xl:pl-2.5 pr-3 text-[14px] 2xl:text-[17px] font-[450] tracking-tight rounded-sm 2xl:rounded-md transition-colors duration-100 cursor-default " +
                  (active
                    ? "text-gray-12 bg-black/5"
                    : "text-gray-10 hover:bg-black/5 hover:text-gray-12")
                }
              >
                <div className="size-4 2xl:size-5 flex items-center justify-center shrink-0">
                  <Icon className={`size-4 2xl:size-5 ${iconClassName}`} />
                </div>
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col pt-1 pb-1.5 px-0.5">
            {navGroups.map(({ label, Icon, iconClassName, items }) => (
              <details key={label} className="group">
                <summary className="flex w-full list-none items-center gap-1.5 2xl:gap-2 h-[28px] 2xl:h-[36px] my-px pl-1.5 2xl:pl-2.5 pr-3 text-[14px] 2xl:text-[17px] font-[450] tracking-tight rounded-sm 2xl:rounded-md text-gray-10 hover:bg-black/5 hover:text-gray-12 transition-colors duration-100 cursor-default [&::-webkit-details-marker]:hidden">
                  <div className="size-4 2xl:size-5 flex items-center justify-center shrink-0">
                    <Icon className={`size-4 2xl:size-5 ${iconClassName}`} />
                  </div>
                  <span className="truncate flex-1">{label}</span>
                  <Caret className="shrink-0 transition-transform duration-150 group-open:rotate-90" />
                </summary>

                <div className="ml-4 2xl:ml-6 flex flex-col border-l border-border pl-1.5 2xl:pl-2">
                  {items.map(({ label, Icon, iconClassName }) => (
                    <div
                      key={label}
                      className="flex w-full items-center gap-1.5 2xl:gap-2 h-[26px] 2xl:h-[34px] my-px pl-1.5 2xl:pl-2 pr-3 text-[13px] 2xl:text-[17px] font-[450] tracking-tight rounded-sm 2xl:rounded-md text-gray-10 hover:bg-black/5 hover:text-gray-12 transition-colors duration-100 cursor-default"
                    >
                      <div className="size-3.5 2xl:size-4 flex items-center justify-center shrink-0">
                        <Icon className={`size-3.5 2xl:size-4 ${iconClassName}`} />
                      </div>
                      <span className="truncate">{label}</span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
        </aside>
      </div>
      {process.env.NODE_ENV === "development" && <DevAgentation />}
    </>
  );
}

export default App;
