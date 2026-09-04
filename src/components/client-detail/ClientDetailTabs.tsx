"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  ClientDTO,
  BodyMetricDTO,
  LoadEntryDTO,
  ProgramDTO,
  NutritionTargetDTO,
  NutritionLogDTO,
} from "@/lib/types";
import { ProfileTab } from "./ProfileTab";
import { ProgramTab } from "./ProgramTab";
import { NutritionTab } from "./NutritionTab";
import { ProgressTab } from "./ProgressTab";

type Props = {
  client: ClientDTO;
  bodyMetrics: BodyMetricDTO[];
  loadEntries: LoadEntryDTO[];
  programs: ProgramDTO[];
  nutritionTarget: NutritionTargetDTO;
  nutritionLogs: NutritionLogDTO[];
};

const TABS = [
  { key: "profil", label: "Profil" },
  { key: "program", label: "Program & Latihan" },
  { key: "nutrisi", label: "Nutrisi" },
  { key: "progress", label: "Progress" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ClientDetailTabs(props: Props) {
  const [tab, setTab] = useState<TabKey>("profil");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--accent)]">
            &larr; Klien
          </Link>
          <h1 className="text-xl font-semibold">{props.client.name}</h1>
        </div>
      </div>

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

      {tab === "profil" && <ProfileTab client={props.client} />}
      {tab === "program" && (
        <ProgramTab
          clientId={props.client.id}
          programs={props.programs}
          loadEntries={props.loadEntries}
        />
      )}
      {tab === "nutrisi" && (
        <NutritionTab
          apiBase={`/api/clients/${props.client.id}`}
          target={props.nutritionTarget}
          logs={props.nutritionLogs}
          canEditTarget
        />
      )}
      {tab === "progress" && (
        <ProgressTab apiBase={`/api/clients/${props.client.id}`} bodyMetrics={props.bodyMetrics} />
      )}
    </div>
  );
}
