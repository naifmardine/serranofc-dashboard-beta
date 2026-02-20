import PageTitle from "@/components/Atoms/PageTitle";
import TransferenciasTable from "@/components/TransferenciasTable";

export default function AdminTransferenciasPage() {
  const headerActions = (
    <div className="hidden text-xs text-slate-500 md:block">
      Dica: use o checkbox do topo para selecionar toda a página.
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-[1400px] bg-gray-50 p-6">
      <PageTitle
        base="Admin"
        title="Transferências"
        subtitle="Base de mercado (histórico) — importação, filtros, paginação e deleção em lote."
        actions={headerActions}
        className="mb-6"
      />

      <TransferenciasTable />
    </section>
  );
}
