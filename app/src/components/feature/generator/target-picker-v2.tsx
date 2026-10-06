"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  SearchableSelect,
  type SearchableSelectGroup,
} from "./searchable-select";

export interface TargetOption {
  id: string;
  slug: string;
  name: string;
  provider: string | null;
  modality: string;
  sortOrder: number;
  iconUrl?: string | null;
  createdAt?: string | Date;
  tier?: string | null;
  capabilities?: string[] | null;
  releasedAt?: string | Date | null;
  brandColor?: string | null;
}

interface Props {
  byProvider: Record<string, TargetOption[]>;
  popular: TargetOption[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export function TargetPickerV2({ byProvider, popular, selectedId, onChange }: Props) {
  const t = useTranslations("generator.ui");
  const all = React.useMemo(() => Object.values(byProvider).flat(), [byProvider]);

  const byId = React.useMemo(() => {
    const m = new Map<string, TargetOption>();
    for (const t of all) m.set(t.id, t);
    return m;
  }, [all]);

  const selectedModel = selectedId ? (byId.get(selectedId) ?? null) : null;

  const [filterProvider, setFilterProvider] = React.useState<string>(
    selectedModel?.provider ?? "",
  );

  // Sync filter when selection changes externally
  React.useEffect(() => {
    if (selectedId) {
      const model = byId.get(selectedId);
      if (model?.provider) setFilterProvider(model.provider);
    }
  }, [selectedId, byId]);

  const providerNames = React.useMemo(
    () => Object.keys(byProvider).sort((a, b) => a.localeCompare(b, "tr")),
    [byProvider],
  );

  const filteredModels = React.useMemo(() => {
    if (!filterProvider) {
      return all.slice().sort((a, b) => a.name.localeCompare(b.name, "tr"));
    }
    return (byProvider[filterProvider] ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [filterProvider, byProvider, all]);

  // Popular items shown at top of model select (filtered to current provider if any)
  const popularShown = React.useMemo(() => {
    if (!popular.length) return [];
    const filtered = filterProvider
      ? popular.filter((t) => t.provider === filterProvider)
      : popular;
    return filtered.filter((t) => t.id !== selectedId);
  }, [popular, filterProvider, selectedId]);

  const handleProviderChange = (val: string | null) => {
    const provider = val ?? "";
    setFilterProvider(provider);
    if (provider && selectedModel?.provider !== provider) {
      onChange(null);
    }
  };

  const handleModelChange = (val: string | null) => {
    onChange(val);
    if (val) {
      const model = byId.get(val);
      if (model?.provider) setFilterProvider(model.provider);
    }
  };

  const providerGroups: SearchableSelectGroup[] = React.useMemo(
    () => [
      {
        items: [
          { value: "", label: t("allProviders") },
          ...providerNames.map((p) => ({
            value: p,
            label: p,
            hint: `(${byProvider[p]?.length ?? 0})`,
          })),
        ],
      },
    ],
    [providerNames, byProvider, t],
  );

  const modelGroups: SearchableSelectGroup[] = React.useMemo(() => {
    const groups: SearchableSelectGroup[] = [
      {
        items: [{ value: "", label: t("letSystemDecide") }],
      },
    ];

    if (popularShown.length > 0) {
      groups.push({
        label: t("popularThisWeek"),
        items: popularShown.map((m) => ({
          value: m.id,
          label: m.name,
          keywords: m.provider ? [m.provider] : undefined,
        })),
      });
    }

    if (filterProvider) {
      groups.push({
        items: filteredModels.map((m) => ({
          value: m.id,
          label: m.name,
          keywords: m.provider ? [m.provider] : undefined,
        })),
      });
    } else {
      for (const p of providerNames) {
        const models = byProvider[p];
        if (!models?.length) continue;
        groups.push({
          label: p,
          items: models
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) => ({
              value: m.id,
              label: m.name,
              keywords: [p],
            })),
        });
      }
    }

    return groups;
  }, [filterProvider, filteredModels, providerNames, byProvider, popularShown, t]);

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="w-full sm:w-[42%] sm:shrink-0">
        <SearchableSelect
          value={filterProvider || null}
          onChange={handleProviderChange}
          groups={providerGroups}
          placeholder={t("allProviders")}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noResults")}
          ariaLabel={t("providerSelect")}
        />
      </div>

      <div className="flex-1 min-w-0">
        <SearchableSelect
          value={selectedId}
          onChange={handleModelChange}
          groups={modelGroups}
          placeholder={t("letSystemDecide")}
          searchPlaceholder={t("searchPlaceholder")}
          emptyMessage={t("noResults")}
          ariaLabel={t("modelSelect")}
        />
      </div>
    </div>
  );
}
