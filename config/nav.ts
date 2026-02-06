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
  Share2,
  Download,
  Settings,
  IdCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Role } from "@prisma/client";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { to: "/perfil", label: "Perfil", icon: IdCard, roles: ["CLIENT", "ADMIN"] },
      { to: "/dashboard", label: "Dashboard", icon: Home, roles: ["CLIENT", "ADMIN"] },
      { to: "/jogadores", label: "Jogadores", icon: Users, roles: ["CLIENT", "ADMIN"] },
      { to: "/relatorios", label: "Relatórios", icon: FileBarChart, roles: ["CLIENT", "ADMIN"] },
    ],
  },
  {
    label: "Análise",
    items: [
      { to: "/serrano-ai", label: "Serrano.AI", icon: Brain, roles: ["ADMIN"] },
      { to: "/mercado", label: "Mercado", icon: LineChart, roles: ["ADMIN"] },
      { to: "/projecoes", label: "Projeções", icon: ClipboardList, roles: ["ADMIN"] },
    ],
  },
  {
    label: "Admin",
    items: [
      { to: "/admin/jogadores", label: "Alterar Jogadores", icon: Users, roles: ["ADMIN"] },
      { to: "/admin/clubes", label: "Clubes", icon: Shield, roles: ["ADMIN"] },
      { to: "/admin/transferencias", label: "Transferências", icon: Banknote, roles: ["ADMIN"] },

      { to: "/admin/usuarios", label: "Usuários", icon: UserCircle2, roles: ["ADMIN"] },

      { to: "/compartilhar", label: "Compartilhar", icon: Share2, roles: ["ADMIN"] },
      { to: "/exportar", label: "Exportar", icon: Download, roles: ["ADMIN"] },
      { to: "/config", label: "Configurações", icon: Settings, roles: ["ADMIN"] },
    ],
  },
];
