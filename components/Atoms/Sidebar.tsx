"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";

import { navGroups } from "@/config/nav";
import type { NavGroup } from "@/config/nav";
import { Role } from "@prisma/client";
import { useAuth } from "@/auth/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);

  // Use user role if available, default to CLIENT
  const effectiveRole: Role = user?.role ?? "CLIENT";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = window.localStorage.getItem("sb_collapsed");
    const initialCollapsed = saved === "1";
    setCollapsed(initialCollapsed);

    const width = initialCollapsed ? "84px" : "248px";
    document.documentElement.style.setProperty("--sb-width", width);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const width = collapsed ? "84px" : "248px";
    document.documentElement.style.setProperty("--sb-width", width);
    window.localStorage.setItem("sb_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const displayName = user?.name || user?.email || "Usuário";
  const displaySub = "Serrano Football Club";
  const isDense = effectiveRole === "ADMIN";

  const handleLogout = () => {
    logout?.();
    router.push("/login");
  };

  return (
    <aside
      className={clsx(
        "fixed left-0 top-0 z-30 flex h-dvh flex-col border-r border-white/10 bg-[#003399] text-white select-none",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[84px]" : "w-[248px]"
      )}
    >
      {/* topo: logo + botão de colapsar */}
      <div className="flex items-center justify-between gap-2 px-2.5 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/logo-serrano.svg"
            alt="Serrano FC"
            className={clsx(
              "object-contain transition-[width,height] duration-200 ease-out",
              collapsed ? "h-8 w-8" : "h-12 w-12"
            )}
          />
          {!collapsed && (
            <span className="text-sm font-bold tracking-[0.02em] transition-opacity duration-150">
              Serrano FC
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          title={collapsed ? "Expandir" : "Recolher"}
          className="grid h-[26px] w-[26px] place-items-center rounded-lg border border-white/20 bg-transparent text-white transition-colors hover:bg-white/15 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* cartão de usuário */}
      <Link
        href="/perfil"
        className={clsx(
          "mx-2 my-1 flex items-center rounded-xl bg-white/10 px-3 py-2.5 text-white no-underline transition-colors hover:bg-white/15 cursor-pointer",
          collapsed && "justify-center px-2"
        )}
      >
        <div
          className={clsx(
            "h-7 w-7 rounded-full border border-white/40 bg-linear-to-br from-white to-[#d9e0ff]",
            collapsed && "h-8 w-8"
          )}
        />
        {!collapsed && (
          <div className="ml-2 flex flex-col leading-tight">
            <span className="text-[13px] font-semibold">{displayName}</span>
            <span className="text-[11px] text-white/70">{displaySub}</span>
          </div>
        )}
      </Link>

      {/* navegação */}
      <div className="flex-1 overflow-y-auto px-1.5 pb-3 pt-1 sidebar-scroll">
        {(navGroups as NavGroup[]).map((g) => {
          const visible =
            g.items?.filter((it) => it.roles?.includes(effectiveRole)) ?? [];
          if (visible.length === 0) return null;

          return (
            <div key={g.label} className="mt-2">
              {effectiveRole === "ADMIN" && !collapsed && (
                <div className="px-2.5 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">
                  {g.label}
                </div>
              )}

              {visible.map((item) => {
                const isActive =
                  pathname === item.to ||
                  (item.to !== "/" && pathname.startsWith(item.to));

                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={clsx(
                      "mx-1.5 my-0.5 flex min-h-8 items-center rounded-[10px] text-sm no-underline transition-colors",
                      isDense ? "px-2 py-1" : "px-2.5 py-1.5",
                      collapsed && "justify-center gap-0 px-2",
                      isActive
                        ? "bg-[#002774] text-white"
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    <span
                      className={clsx(
                        "grid place-items-center rounded-lg transition-[width,height] duration-200 ease-out",
                        isDense ? "h-[22px] w-[22px]" : "h-6 w-6",
                        collapsed && (isDense ? "h-[26px] w-[26px]" : "h-7 w-7")
                      )}
                    >
                      <item.icon size={16} />
                    </span>
                    {!collapsed && (
                      <span className="ml-2 text-[13px]">{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* rodapé: logout com cara de botão */}
      <div className="mt-auto px-2.5 pb-3 pt-1">
        <button
          type="button"
          onClick={handleLogout}
          className={clsx(
            "flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-white/90",
            "transition-colors hover:bg-white/20 hover:text-white cursor-pointer",
            collapsed && "w-10 mx-auto px-0 justify-center"
          )}
          title="Sair"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
