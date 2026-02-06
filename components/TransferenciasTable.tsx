"use client";

import { useEffect, useMemo, useState } from "react";

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
  valor: string | null;
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function fmtMoney(v: string | null) {
  if (!v) return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

export default function TransferenciasTable() {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("");
  const [pais, setPais] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("pageSize", String(pageSize));
    if (q.trim()) sp.set("q", q.trim());
    if (pos) sp.set("pos", pos);
    if (pais) sp.set("pais", pais);
    return sp.toString();
  }, [page, pageSize, q, pos, pais]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch(`/api/transferencias?${query}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error ?? "Erro na API");
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
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [q, pos, pais, pageSize]);

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* filtros */}
      <div className="p-4 border-b flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar atleta ou clube..."
          className="h-10 w-full sm:w-[280px] rounded-lg border px-3"
        />

        <select
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          className="h-10 rounded-lg border px-3"
        >
          <option value="">Posição</option>
          <option value="Ponta">Ponta</option>
          <option value="Meia">Meia</option>
          <option value="Atacante">Atacante</option>
          <option value="Volante">Volante</option>
          <option value="Lateral">Lateral</option>
          <option value="Zagueiro">Zagueiro</option>
          <option value="Goleiro">Goleiro</option>
        </select>

        <input
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          placeholder="País destino"
          className="h-10 w-[180px] rounded-lg border px-3 hidden md:block"
        />

        <div className="ml-auto flex items-center gap-3">
          {error ? (
            <span className="text-sm text-red-500">{error}</span>
          ) : (
            <span className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : `${total} registros`}
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

      {/* tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="p-3 text-left">Atleta</th>
              <th className="p-3">Idade</th>
              <th className="p-3">Posição</th>
              <th className="p-3 hidden lg:table-cell">Formador</th>
              <th className="p-3 hidden xl:table-cell">Origem</th>
              <th className="p-3">Destino</th>
              <th className="p-3">Data</th>
              <th className="p-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  Carregando...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-muted-foreground"
                >
                  Nenhum resultado.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-medium">{r.atletaNome}</td>
                  <td className="p-3">{r.atletaIdade ?? "—"}</td>
                  <td className="p-3">{r.atletaPosicao ?? "—"}</td>
                  <td className="p-3 hidden lg:table-cell">
                    {r.clubeFormador ?? "—"}
                  </td>
                  <td className="p-3 hidden xl:table-cell">
                    {r.clubeOrigem ?? "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col">
                      <span>{r.clubeDestino ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.paisClubeDestino ?? ""}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">{fmtDate(r.dataTransferencia)}</td>
                  <td className="p-3 text-right tabular-nums">
                    {fmtMoney(r.valor)}
                  </td>
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
          Anterior
        </button>

        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-4 py-2 rounded-lg border disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
