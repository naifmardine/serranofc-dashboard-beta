"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Pencil,
  Trash,
  User as UserIcon,
  Mail,
  RefreshCcw,
} from "lucide-react";

import PageTitle from "@/components/Atoms/PageTitle";
import AdminRow from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import CopySecretDialog from "@/components/Atoms/CopySecretDialog";
import { useI18n } from "@/contexts/I18nContext";

/**
 * NÃO importamos enums do Prisma no client.
 * Mantém o build do Vercel/Next estável e evita acoplamento.
 */
type Role = "ADMIN" | "CLIENT";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string;
  image: string | null;
}

type NewUserForm = {
  name: string;
  email: string;
  role: Role;
};

function formatCreatedAt(input: unknown) {
  if (!input) return "--/--/----";
  const d = new Date(input as any);
  if (Number.isNaN(d.getTime())) return "--/--/----";
  return d.toLocaleDateString("pt-BR");
}

// senha forte usando Web Crypto (sem libs)
function generateStrongPassword(length = 20) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*_-+=?";
  const all = upper + lower + digits + symbols;

  const pick = (charset: string) =>
    charset[Math.floor(Math.random() * charset.length)];

  // garante variedade mínima
  let pwd = pick(upper) + pick(lower) + pick(digits) + pick(symbols);

  const remaining = Math.max(0, length - pwd.length);
  const bytes = new Uint32Array(Math.max(remaining, 1));
  crypto.getRandomValues(bytes);

  for (let i = 0; i < remaining; i++) {
    pwd += all[bytes[i] % all.length];
  }

  // embaralha
  const arr = pwd.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = bytes[i % bytes.length] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join("");
}

export default function AdminUsersPage() {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const router = useRouter();

  const roleLabel = (role: Role) =>
    role === "ADMIN" ? t.adminUsuarios.administrador : t.adminUsuarios.cliente;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Mensagens
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({
    name: "",
    email: "",
    role: "CLIENT",
  });
  const [tempPassword, setTempPassword] = useState(""); // senha gerada (não input)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Popup copiar (pós-criação)
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyPayload, setCopyPayload] = useState("");

  // Modal de edição
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");

  // Delete (MESMO fluxo do jogadores)
  const [delOpen, setDelOpen] = useState(false);
  const [delTarget, setDelTarget] = useState<User | null>(null);

  // Permissão
  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Carregar usuários
  useEffect(() => {
    if (user?.role === "ADMIN") loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // sempre que abrir o modal, gera senha automática
  useEffect(() => {
    if (showCreateModal) {
      setTempPassword(generateStrongPassword(22));
    }
  }, [showCreateModal]);

  async function loadUsers() {
    setIsLoadingUsers(true);
    setError("");

    try {
      const res = await fetch("/api/usuarios", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("sfc_token") || ""}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || t.adminUsuarios.falhaCarregar);
      }

      const data = (await res.json()) as User[];
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || t.adminUsuarios.erroCarregar);
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      if (!tempPassword || tempPassword.length < 10) {
        throw new Error(t.adminUsuarios.senhaInvalida);
      }

      const payload = {
        ...newUser,
        password: tempPassword,
      };

      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sfc_token") || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.adminUsuarios.falhaCriar);
      }

      const created = (await res.json()) as User;
      setUsers((prev) => [created, ...prev]);

      // prepara popup de copiar
      const cred = [
        `${t.adminUsuarios.email}: ${payload.email.trim()}`,
        `${t.adminUsuarios.senhaTemporaria}: ${tempPassword}`,
        `${t.adminUsuarios.acesso}: ${payload.role === "ADMIN" ? t.adminUsuarios.administrador : t.adminUsuarios.cliente}`,
        t.adminUsuarios.senhaObs,
      ].join("\n");

      setCopyPayload(cred);
      setCopyOpen(true);

      // limpa estado e fecha modal
      setNewUser({ name: "", email: "", role: "CLIENT" });
      setTempPassword("");
      setShowCreateModal(false);

      setSuccess(t.adminUsuarios.usuarioCriado);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || t.adminUsuarios.erroCriar);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(u: User) {
    setEditUser(u);
    setEditName(u.name || "");
    setShowEditModal(true);
  }

  async function handleUpdateUser(id: string) {
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/usuarios", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("sfc_token") || ""}`,
        },
        body: JSON.stringify({ id, name: editName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.adminUsuarios.falhaAtualizar);
      }

      const updated = (await res.json()) as User;
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));

      setShowEditModal(false);
      setEditUser(null);

      setSuccess(t.adminUsuarios.usuarioAtualizado);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || t.adminUsuarios.erroAtualizar);
    } finally {
      setIsSubmitting(false);
    }
  }

  // === DELETE NO PADRÃO JOGADORES ===
  const expectedPhrase = useMemo(() => {
    if (!delTarget?.email) return "DELETAR";
    return `DELETAR ${String(delTarget.email).trim()}`;
  }, [delTarget]);

  async function confirmDelete() {
    if (!delTarget?.id) return;

    setError("");

    const res = await fetch("/api/usuarios", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("sfc_token") || ""}`,
      },
      body: JSON.stringify({ id: delTarget.id }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const msg = (data && (data.error || data.message)) || `Erro HTTP ${res.status}`;
      throw new Error(msg);
    }

    setUsers((prev) => prev.filter((u) => u.id !== delTarget.id));
    setDelOpen(false);
    setDelTarget(null);

    setSuccess(t.adminUsuarios.usuarioDeletado);
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">{t.common.carregando}</div>
      </div>
    );
  }

  const headerActions = (
    <AdminButton
      label={t.adminUsuarios.novoUsuario}
      icon={PlusCircle}
      onClick={() => setShowCreateModal(true)}
    />
  );

  return (
    <section className="mx-auto w-full max-w-6xl bg-gray-50 p-6">
      {/* popup copiar senha */}
      <CopySecretDialog
        open={copyOpen}
        title={t.adminUsuarios.credenciaisTitulo}
        description={t.adminUsuarios.credenciaisDesc}
        payloadTitle={t.adminUsuarios.copiarCredenciais}
        payload={copyPayload}
        onClose={() => {
          setCopyOpen(false);
          setCopyPayload("");
        }}
      />

      <ConfirmDeleteDialog
        open={delOpen}
        title={t.adminUsuarios.deletarTitle}
        description={t.adminUsuarios.deletarDesc}
        itemName={delTarget?.email ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={() => {
          setDelOpen(false);
          setDelTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <PageTitle
        base="Admin"
        title={t.adminUsuarios.title}
        subtitle={t.adminUsuarios.subtitle}
        actions={headerActions}
        className="mb-6"
        crumbLabel={t.adminUsuarios.title}
      />

      {(error || success) && (
        <div className="mb-4 space-y-2">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-700">
          <span />
          <span>{t.adminUsuarios.usuario}</span>
          <span>{t.adminUsuarios.criadoEm}</span>
          <span />
          <span className="pr-1 text-right">{t.adminUsuarios.acoes}</span>
        </div>

        {isLoadingUsers ? (
          <div className="py-10 text-center text-gray-500">{t.adminUsuarios.carregando}</div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-gray-500">{t.adminUsuarios.nenhumUsuario}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <AdminRow
                key={u.id}
                foto={u.image}
                title={u.name || "—"}
                subtitle={`${u.email} • ${roleLabel(u.role)}`}
                createdAt={formatCreatedAt(u.createdAt)}
                actions={[
                  { icon: Pencil, color: "yellow", onClick: () => openEditModal(u) },
                  {
                    icon: Trash,
                    color: "red",
                    onClick: () => {
                      setDelTarget(u);
                      setDelOpen(true);
                    },
                  },
                ]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/45">
          <div
            className="absolute inset-0"
            onClick={() => !isSubmitting && setShowCreateModal(false)}
          />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">{t.adminUsuarios.criarUsuario}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    {t.adminUsuarios.criarDesc}
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                >
                  {t.adminUsuarios.fechar}
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 p-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">{t.adminUsuarios.nome}</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-[10px] border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder={t.adminUsuarios.nomeCompleto}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">{t.adminUsuarios.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                      disabled={isSubmitting}
                      className="w-full rounded-[10px] border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                      placeholder="usuario@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold">{t.adminUsuarios.tipoAcesso}</label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value as Role })
                    }
                    disabled={isSubmitting}
                    className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  >
                    <option value="CLIENT">{t.adminUsuarios.cliente}</option>
                    <option value="ADMIN">{t.adminUsuarios.administrador}</option>
                  </select>
                </div>

                {/* senha gerada */}
                <div>
                  <label className="mb-1 block text-sm font-semibold">{t.adminUsuarios.senhaTemporaria}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={tempPassword}
                      className="flex-1 rounded-[10px] border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setTempPassword(generateStrongPassword(22))}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                      title={t.adminUsuarios.gerarOutra}
                    >
                      <RefreshCcw className="h-4 w-4" />
                      {t.adminUsuarios.gerar}
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    {t.adminUsuarios.senhaDesc}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                  >
                    {t.adminUsuarios.cancelar}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60"
                  >
                    {isSubmitting ? t.adminUsuarios.criando : t.adminUsuarios.criar}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edição */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 z-50 bg-black/45">
          <div
            className="absolute inset-0"
            onClick={() => !isSubmitting && setShowEditModal(false)}
          />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">{t.adminUsuarios.editarUsuario}</div>
                  <div className="mt-1 text-xs text-gray-600">
                    {t.adminUsuarios.editarDesc}
                  </div>
                </div>

                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                >
                  {t.adminUsuarios.fechar}
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateUser(editUser.id);
                }}
                className="space-y-4 p-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-semibold">{t.adminUsuarios.nome}</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-[10px] border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500">
                    {t.adminUsuarios.dadosUsuario}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {editUser.email}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {t.adminUsuarios.tipo}:{" "}
                    <span className="font-semibold">{roleLabel(editUser.role)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                  >
                    {t.adminUsuarios.cancelar}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60"
                  >
                    {isSubmitting ? t.adminUsuarios.salvando : t.adminUsuarios.salvar}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
