"use client";

import PageTitle from "@/components/Atoms/PageTitle";
import TransferenciasTable from "@/components/TransferenciasTable";
import { useI18n } from "@/contexts/I18nContext";

export default function AdminTransferenciasPage() {
  const { t } = useI18n();

  const headerActions = (
    <div className="hidden text-xs text-slate-500 md:block">
      {t.adminTransferencias.dica}
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-[1400px] bg-gray-50 p-6">
      <PageTitle
        base="Admin"
        title={t.adminTransferencias.title}
        subtitle={t.adminTransferencias.subtitle}
        actions={headerActions}
        className="mb-6"
      />

      <TransferenciasTable />
    </section>
  );
}
