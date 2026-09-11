"use client";

import { useState } from "react";
import type {
  BodyMetricDTO,
  LoadEntryDTO,
  ProgramDTO,
  NutritionTargetDTO,
  NutritionLogDTO,
} from "@/lib/types";
import { MemberProgramView } from "./MemberProgramView";
import { NutritionTab } from "@/components/client-detail/NutritionTab";
import { ProgressTab } from "@/components/client-detail/ProgressTab";
import { MemberAccountTab } from "./MemberAccountTab";

const API_BASE = "/api/member";

type Props = {
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    trainerName: string;
  };
  bodyMetrics: BodyMetricDTO[];
  loadEntries: LoadEntryDTO[];
  programs: ProgramDTO[];
  nutritionTarget: NutritionTargetDTO;
  nutritionLogs: NutritionLogDTO[];
};

const TABS = [
  { key: "program", label: "Program & Latihan" },
  { key: "nutrisi", label: "Nutrisi" },
  { key: "progress", label: "Progress" },
  { key: "akun", label: "Akun" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function MemberDashboardTabs(props: Props) {
  const [tab, setTab] = useState<TabKey>("program");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Halo, {props.client.name}</h1>

      <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px ${
              tab === t.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "program" && (
        <MemberProgramView
          clientId={props.client.id}
          programs={props.programs}
          loadEntries={props.loadEntries}
        />
      )}
      {tab === "nutrisi" && (
        <NutritionTab
          apiBase={API_BASE}
          target={props.nutritionTarget}
          logs={props.nutritionLogs}
          canEditTarget={false}
        />
      )}
      {tab === "progress" && (
        <ProgressTab apiBase={API_BASE} bodyMetrics={props.bodyMetrics} />
      )}
      {tab === "akun" && (
        <MemberAccountTab
          name={props.client.name}
          email={props.client.email}
          phone={props.client.phone}
          trainerName={props.client.trainerName}
        />
      )}
    </div>
  );
}
