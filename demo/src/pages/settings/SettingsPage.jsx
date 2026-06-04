import { useMemo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { BookOpen, DollarSign, GraduationCap, Shield, Users } from 'lucide-react';
import StaffManagementPage from "../staff/StaffManagementPage";
import MajorManagementPage from "../majors/MajorManagementPage";
import ScholarshipListPage from "../policies/ScholarshipListPage";
import TuitionListPage from "../policies/TuitionListPage";
import KnowledgeBasePage from "../knowledge/KnowledgeBasePage";

export default function SettingsPage() {
  const { t } = useTranslation();
  const tabs = useMemo(
    () => [
      { key: "staff", label: t('settings.tabs.staff'), icon: Users, desc: t('settings.descriptions.staff') },
      { key: "majors", label: t('settings.tabs.majors'), icon: GraduationCap, desc: t('settings.descriptions.majors') },
      { key: "scholarships", label: t('settings.tabs.scholarships'), icon: Shield, desc: t('settings.descriptions.scholarships') },
      { key: "tuition", label: t('settings.tabs.tuition'), icon: DollarSign, desc: t('settings.descriptions.tuition') },
      { key: "knowledge", label: t('settings.tabs.knowledge'), icon: BookOpen, desc: t('settings.descriptions.knowledge') },
    ],
    [t]
  );
  const [active, setActive] = useState("staff");
  const activeTab = tabs.find(t => t.key === active) || tabs[0];

  return (
    <div className="page-container">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] shadow-[var(--shadow-xs)]">
          <Shield className="h-3.5 w-3.5 text-[var(--color-primary-600)]" />
          {t('settings.adminCenter')}
        </div>
        <h1 className="mt-2 page-title">{t('settings.title')}</h1>
        <p className="page-subtitle">{t('settings.subtitle')}</p>
      </div>

      <Card>
        <CardHeader className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)] pb-0 rounded-t-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-lg">{activeTab.label}</CardTitle>
              <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{activeTab.desc}</p>
            </div>
            <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white p-1 shadow-[var(--shadow-xs)] lg:w-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActive(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-tertiary)]"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-white" : ""}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-white p-5">
            {active === "staff" && <StaffManagementPage />}
            {active === "majors" && <MajorManagementPage />}
            {active === "scholarships" && <ScholarshipListPage />}
            {active === "tuition" && <TuitionListPage />}
            {active === "knowledge" && <KnowledgeBasePage />}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
