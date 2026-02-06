"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Pencil,
  Trash,
  User as UserIcon,
  Mail,
  RefreshCcw,
} from "lucide-react";

import AdminRow from "@/components/AdminRow";
import AdminButton from "@/components/Atoms/AdminButton";
import ConfirmDeleteDialog from "@/components/Atoms/ConfirmDeleteDialog";
import CopySecretDialog from "@/components/Atoms/CopySecretDialog";

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

function roleLabel(role: Role) {
  return role === "ADMIN" ? "Admin" : "Cliente";
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
  const bytes = new Uint32Array(remaining);
  crypto.getRandomValues(bytes);

  for (let i = 0; i < remaining; i++) {
    pwd += all[bytes[i] % all.length];
  }

  // embaralha
  const arr = pwd.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = bytes.length
      ? bytes[i % bytes.length] % (i + 1)
      : Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr.join("");
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
        throw new Error(text || "Falha ao carregar usuários");
      }

      const data = (await res.json()) as User[];
      setUsers(data);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar usuários");
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
        throw new Error("Senha temporária inválida. Gere novamente.");
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
        throw new Error(data.error || "Falha ao criar usuário");
      }

      const created = (await res.json()) as User;
      setUsers((prev) => [created, ...prev]);

      // prepara popup de copiar
      const cred = [
        `Email: ${payload.email.trim()}`,
        `Senha temporária: ${tempPassword}`,
        `Acesso: ${payload.role === "ADMIN" ? "Admin" : "Cliente"}`,
        `Obs: no primeiro login, será obrigatório trocar a senha.`,
      ].join("\n");

      setCopyPayload(cred);
      setCopyOpen(true);

      // limpa estado e fecha modal
      setNewUser({ name: "", email: "", role: "CLIENT" });
      setTempPassword("");
      setShowCreateModal(false);

      setSuccess("Usuário criado com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Erro ao criar usuário");
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
        throw new Error(data.error || "Falha ao atualizar usuário");
      }

      const updated = (await res.json()) as User;
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));

      setShowEditModal(false);
      setEditUser(null);

      setSuccess("Usuário atualizado com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err?.message || "Erro ao atualizar usuário");
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
      const msg =
        (data && (data.error || data.message)) || `Erro HTTP ${res.status}`;
      throw new Error(msg);
    }

    setUsers((prev) => prev.filter((u) => u.id !== delTarget.id));
    setDelOpen(false);
    setDelTarget(null);

    setSuccess("Usuário deletado com sucesso!");
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <section className="p-6 max-w-6xl mx-auto">
      {/* popup copiar senha */}
      <CopySecretDialog
        open={copyOpen}
        title="Credenciais do usuário"
        description="Copie e envie para o usuário. Ele será obrigado a trocar a senha no primeiro login."
        payloadTitle="Copiar credenciais"
        payload={copyPayload}
        onClose={() => {
          setCopyOpen(false);
          setCopyPayload("");
        }}
      />

      <ConfirmDeleteDialog
        open={delOpen}
        title="Deletar usuário"
        description="Isso é irreversível. O usuário será removido do sistema."
        itemName={delTarget?.email ?? ""}
        expectedPhrase={expectedPhrase}
        onCancel={() => {
          setDelOpen(false);
          setDelTarget(null);
        }}
        onConfirm={confirmDelete}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Admin → Usuários</h1>

        <AdminButton
          label="Novo Usuário"
          icon={PlusCircle}
          onClick={() => setShowCreateModal(true)}
        />
      </div>

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

      <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] text-xs font-semibold text-gray-500 uppercase border-b border-gray-300 pb-2 mb-2">
        <span></span>
        <span>Usuário</span>
        <span>Criado em</span>
        <span></span>
        <span className="text-right pr-3">Ações</span>
      </div>

      {isLoadingUsers ? (
        <div className="py-10 text-center text-gray-500">
          Carregando usuários...
        </div>
      ) : users.length === 0 ? (
        <div className="py-10 text-center text-gray-500">
          Nenhum usuário encontrado
        </div>
      ) : (
        users.map((u) => (
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
        ))
      )}

      {/* Modal Criação */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/45">
          <div
            className="absolute inset-0"
            onClick={() => !isSubmitting && setShowCreateModal(false)}
          />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="w-full max-w-[520px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Criar usuário
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    A senha é gerada automaticamente e será trocada no primeiro
                    login.
                  </div>
                </div>

                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Nome
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) =>
                        setNewUser({ ...newUser, name: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-gray-300 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      placeholder="Nome completo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) =>
                        setNewUser({ ...newUser, email: e.target.value })
                      }
                      required
                      disabled={isSubmitting}
                      className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-gray-300 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                      placeholder="usuario@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Tipo de acesso
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({
                        ...newUser,
                        role: e.target.value as Role,
                      })
                    }
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded-[10px] border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                  >
                    <option value="CLIENT">Cliente</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                {/* senha gerada */}
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Senha temporária
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={tempPassword}
                      className="flex-1 px-3 py-2 rounded-[10px] border border-gray-300 bg-gray-50 text-sm text-gray-900 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setTempPassword(generateStrongPassword(22))}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                      title="Gerar outra"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Gerar
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    O usuário será obrigado a trocar a senha no primeiro login.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60"
                  >
                    {isSubmitting ? "Criando..." : "Criar"}
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
            <div className="w-full max-w-[520px] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Editar usuário
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Ajuste apenas o nome (como antes).
                  </div>
                </div>

                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                >
                  Fechar
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateUser(editUser.id);
                }}
                className="p-4 space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded-[10px] border border-gray-300 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500">
                    Dados do usuário
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {editUser.email}
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Tipo:{" "}
                    <span className="font-semibold">
                      {roleLabel(editUser.role)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSubmitting}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-[#f2d249] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60"
                  >
                    {isSubmitting ? "Salvando..." : "Salvar"}
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
