"use client";

import clsx from "clsx";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Eye, Pencil, Trash } from "lucide-react";

interface Action {
  icon: LucideIcon;
  onClick?: () => void;
  href?: string;
  color?: "blue" | "yellow" | "red";
}

interface AdminRowProps {
  foto?: string | null;
  title: string;
  subtitle?: string;
  createdAt?: string;
  actions?: Action[];
}

export default function AdminRow({
  foto,
  title,
  subtitle,
  createdAt,
  actions = [],
}: AdminRowProps) {
  return (
    <div className="grid grid-cols-[0.4fr_1.6fr_1fr_1fr_0.7fr] items-center border-b border-gray-200 py-3">
      {/* FOTO */}
      <div className="flex items-center justify-center">
        {foto ? (
          <img
            src={foto}
            className="w-10 h-10 rounded-full object-cover"
            alt={title}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 grid place-items-center text-gray-600 font-bold">
            {title[0]}
          </div>
        )}
      </div>

      {/* TÍTULO / SUB */}
      <div className="flex flex-col">
        <span className="font-semibold text-gray-900">{title}</span>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>

      {/* DATA */}
      <div className="text-sm text-gray-800">{createdAt ?? "--/--/----"}</div>

      {/* VAZIO (ou qualquer coluna futura) */}
      <div></div>

      {/* AÇÕES */}
      <div className="flex items-center gap-2 justify-end pr-3">
        {actions.map((a, i) => {
          const colorMap = {
            blue: "bg-blue-500 hover:bg-blue-600",
            yellow: "bg-yellow-500 hover:bg-yellow-600",
            red: "bg-red-500 hover:bg-red-600",
          };

          const className =
            "p-2 rounded-md text-white transition " +
            (a.color ? colorMap[a.color] : "bg-gray-500");

          if (a.href) {
            return (
              <a key={i} href={a.href} className={className}>
                <a.icon size={16} />
              </a>
            );
          }

          return (
            <button key={i} onClick={a.onClick} className={className}>
              <a.icon size={16} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
