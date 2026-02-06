import TransferenciasTable from "@/components/TransferenciasTable";

export default function AdminTransferenciasPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transferências</h1>
        <p className="text-sm text-muted-foreground">
          Base de mercado (histórico) — busca, filtros e paginação.
        </p>
      </div>

      <TransferenciasTable />
    </div>
  );
}
