import {
  Home,
  Users,
  FileBarChart,
  Brain,
  LineChart,
  ClipboardList,
  Shield,
  Banknote,
  UserCircle2,
  Download,
  IdCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Role } from "@prisma/client";

export interface NavItem {
  to: string;
  label: string;
  labelKey: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavGroup {
  label: string;
  labelKey: string;
  items: NavItem[];
}

/**
 * Roles (centralizado) — reduz risco de typo e mantém compat com Prisma Role.
 * Se seu enum tiver mais roles no futuro, você adiciona aqui.
 */
const R = {
  ADMIN: "ADMIN" as Role,
  CLIENT: "CLIENT" as Role,
} as const;

// Padrões de permissão
const ROLES_BOTH: Role[] = [R.CLIENT, R.ADMIN];
const ROLES_ADMIN_ONLY: Role[] = [R.ADMIN];

function item(to: string, label: string, labelKey: string, icon: LucideIcon, roles: Role[]): NavItem {
  return { to, label, labelKey, icon, roles };
}

function group(label: string, labelKey: string, items: NavItem[]): NavGroup {
  return { label, labelKey, items };
}

/**
 * Guardrails em DEV: pega bugs cedo sem afetar prod.
 * - to duplicado
 * - path sem "/" no começo
 * - item admin fora de ADMIN (opcional, mas útil)
 */
function devValidateNav(groups: NavGroup[]) {
  if (process.env.NODE_ENV === "production") return;

  const seen = new Set<string>();
  const problems: string[] = [];

  for (const g of groups) {
    for (const it of g.items) {
      if (!it.to.startsWith("/")) {
        problems.push(`NavItem.to inválido (precisa começar com "/"): "${it.to}"`);
      }
      if (seen.has(it.to)) {
        problems.push(`NavItem.to duplicado: "${it.to}"`);
      }
      seen.add(it.to);

      // Guardrail opcional: qualquer rota /admin deve ser ADMIN-only
      if (it.to === "/admin" || it.to.startsWith("/admin/")) {
        const isAdminOnly = it.roles.length === 1 && it.roles[0] === R.ADMIN;
        if (!isAdminOnly) {
          problems.push(`Rota admin não está ADMIN-only: "${it.to}" roles=${JSON.stringify(it.roles)}`);
        }
      }

      // Guardrail: roles vazias
      if (!it.roles || it.roles.length === 0) {
        problems.push(`NavItem.roles vazio em "${it.to}"`);
      }
    }
  }

  if (problems.length) {
    // Não quebra build, mas deixa explícito no console.
    // Se você preferir "fail fast", troque por throw new Error(...)
    console.warn("[navConfig] Problemas detectados:\n- " + problems.join("\n- "));
  }
}

export const navGroups: NavGroup[] = [
  group("Principal", "principal", [
    item("/perfil", "Perfil", "perfil", IdCard, ROLES_BOTH),
    item("/dashboard", "Dashboard", "dashboard", Home, ROLES_BOTH),
    item("/jogadores", "Jogadores", "jogadores", Users, ROLES_BOTH),
    item("/relatorios", "Relatórios", "relatorios", FileBarChart, ROLES_BOTH),
  ]),

  group("Análise", "analise", [
    item("/admin/serrano-ai", "Serrano.AI", "serranoAi", Brain, ROLES_ADMIN_ONLY),
  ]),

  group("Admin", "admin", [
    item("/admin/jogadores", "Alterar Jogadores", "alterarJogadores", Users, ROLES_ADMIN_ONLY),
    item("/admin/clubes", "Clubes", "clubes", Shield, ROLES_ADMIN_ONLY),
    item("/admin/transferencias", "Transferências", "transferencias", Banknote, ROLES_ADMIN_ONLY),
    item("/admin/usuarios", "Usuários", "usuarios", UserCircle2, ROLES_ADMIN_ONLY),
  ]),
];

// roda validação em dev sem mudar API/export
devValidateNav(navGroups);