"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import ImportTransferenciasCsvButton from "@/components/Atoms/ImportTransferenciasCSVButton";
import { Trash2 } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type Row = {
  id: string;
  atletaNome: string;
  atletaIdade: number | null;
  atletaPosicao: string | null;
  clubeFormador: string | null;
  clubeOrigem: string | null;
  clubeDestino: string | null;
  paisClubeDestino: string | null;
  dataTransferencia: string | null;
  valor: any; // Decimal pode vir como string/obj; formatador lida
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function fmtMoney(v: any) {
  if (v == null) return "—";
  // Prisma Decimal às vezes vem como { toString() } ou string
  const s = typeof v === "string" ? v : typeof v?.toString === "function" ? v.toString() : String(v);
  if (!s) return "—";
  const n = Number(s);
  if (Number.isNaN(n)) return s;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export default function TransferenciasTable() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("");
  const [pais, setPais] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [tick, setTick] = useState(0); // força refetch

  // seleção (apenas página atual)
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  const allOnPageSelected = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.every((r) => selected[r.id]);
  }, [rows, selected]);

  const someOnPageSelected = useMemo(() => {
    if (rows.length === 0) return false;
    return rows.some((r) => selected[r.id]);
  }, [rows, selected]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (q.trim()) sp.set("q", q.trim());
    if (pos) sp.set("pos", pos);
    if (pais) sp.set("pais", pais);
    return sp.toString();
  }, [page, pageSize, q, pos, pais]);

  function refetch() {
    setTick((t) => t + 1);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch(`/api/transferencias?${query}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? t.transferenciasTable.erroApi);
        return data;
      })
      .then((data) => {
        if (!alive) return;
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setRows([]);
        setTotal(0);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [query, tick]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [q, pos, pais, pageSize]);

  // limpa seleção quando mudar página/filtros (pra não deletar sem querer)
  useEffect(() => {
    setSelected({});
  }, [query]);

  // delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);

  const expectedPhrase = useMemo(() => {
    return `${t.transferenciasTable.deletarPhrase} ${selectedIds.length} ${t.transferenciasTable.transferenciasLabel}`;
  }, [selectedIds.length]);

  async function deleteSelected() {
    const ids = selectedIds;
    if (ids.length === 0) return;

    const r = await fetch("/api/transferencias", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error ?? t.transferenciasTable.erroDeletar);

    setDeleteOpen(false);
    setSelected({});
    refetch();
  }

  function toggleAllOnPage() {
    if (rows.length === 0) return;
    const next = { ...selected };

    if (allOnPageSelected) {
      // desmarca todos da página
      for (const r of rows) delete next[r.id];
    } else {
      // marca todos da página
      for (const r of rows) next[r.id] = true;
    }
    setSelected(next);
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* toolbar / filtros */}
      <div className="p-4 border-b flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.transferenciasTable.buscar}
          className="h-10 w-full sm:w-[280px] rounded-lg border px-3"
        />

        <select
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          className="h-10 rounded-lg border px-3"
        >
          <option value="">{t.transferenciasTable.posicao}</option>
          <option value="Ponta">{t.transferenciaPosicoes.ponta}</option>
          <option value="Meia">{t.transferenciaPosicoes.meia}</option>
          <option value="Atacante">{t.transferenciaPosicoes.atacante}</option>
          <option value="Volante">{t.transferenciaPosicoes.volante}</option>
          <option value="Lateral">{t.transferenciaPosicoes.lateral}</option>
          <option value="Zagueiro">{t.transferenciaPosicoes.zagueiro}</option>
          <option value="Goleiro">{t.transferenciaPosicoes.goleiro}</option>
        </select>

        <input
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          placeholder={t.transferenciasTable.paisDestino}
          className="h-10 w-[180px] rounded-lg border px-3 hidden md:block"
        />

        <div className="ml-auto flex items-center gap-2">
          {/* Import */}
          <ImportTransferenciasCsvButton
            onImported={() => {
              // volta pra primeira página e recarrega
              setPage(1);
              refetch();
            }}
          />

          {/* Delete batch */}
          <button
            disabled={selectedIds.length === 0}
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border bg-background hover:bg-muted/40 disabled:opacity-50"
            title={
              selectedIds.length === 0
                ? t.transferenciasTable.selecionePeloMenos
                : `${t.transferenciasTable.deletar} ${selectedIds.length} selecionadas`
            }
          >
            <Trash2 className="w-4 h-4" />
            {t.transferenciasTable.deletar}
            {selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </button>

          {/* status / page size */}
          <div className="flex items-center gap-3 pl-2">
            {error ? (
              <span className="text-sm text-red-500">{error}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {loading ? t.transferenciasTable.carregando : `${total} ${t.transferenciasTable.registros}`}
              </span>
            )}

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-10 rounded-lg border px-2"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 w-11">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  ref={(el) => {
                    if (!el) return;
                    el.indeterminate = !allOnPageSelected && someOnPageSelected;
                  }}
                  onChange={toggleAllOnPage}
                  aria-label={t.transferenciasTable.selecionarTodos}
                  className="h-4 w-4"
                />
              </th>
              <th className="p-3 text-left">{t.transferenciasTable.atleta}</th>
              <th className="p-3">{t.transferenciasTable.idade}</th>
              <th className="p-3">{t.transferenciasTable.posicao}</th>
              <th className="p-3 hidden lg:table-cell">{t.transferenciasTable.formador}</th>
              <th className="p-3 hidden xl:table-cell">{t.transferenciasTable.origem}</th>
              <th className="p-3">{t.transferenciasTable.destino}</th>
              <th className="p-3">{t.transferenciasTable.data}</th>
              <th className="p-3 text-right">{t.transferenciasTable.valor}</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  {t.transferenciasTable.carregando}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  {t.transferenciasTable.nenhumResultado}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={!!selected[r.id]}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Selecionar ${r.atletaNome}`}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="p-3 font-medium">{r.atletaNome}</td>
                  <td className="p-3 text-center">{r.atletaIdade ?? "—"}</td>
                  <td className="p-3 text-center">{r.atletaPosicao ?? "—"}</td>
                  <td className="p-3 hidden lg:table-cell">{r.clubeFormador ?? "—"}</td>
                  <td className="p-3 hidden xl:table-cell">{r.clubeOrigem ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span>{r.clubeDestino ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.paisClubeDestino ?? ""}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-center">{fmtDate(r.dataTransferencia)}</td>
                  <td className="p-3 text-right tabular-nums">{fmtMoney(r.valor)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* paginação */}
      <div className="p-4 border-t flex items-center justify-between">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-4 py-2 rounded-lg border disabled:opacity-50"
        >
          {t.transferenciasTable.anterior}
        </button>

        <span className="text-sm text-muted-foreground">
          {t.transferenciasTable.pagina} {page} {t.transferenciasTable.de} {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-4 py-2 rounded-lg border disabled:opacity-50"
        >
          {t.transferenciasTable.proxima}
        </button>
      </div>

      {/* confirm delete */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        title={t.transferenciasTable.deletarTitle}
        description={t.transferenciasTable.deletarDesc}
        expectedPhrase={expectedPhrase}
        itemName={`${selectedIds.length} selecionadas`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={deleteSelected}
      />
    </div>
  );
}
