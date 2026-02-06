"use client";

import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface AdminButtonProps {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export default function AdminButton({
  label,
  icon: Icon,
  onClick,
  href,
  className,
}: AdminButtonProps) {
  const baseClasses =
    "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f2d249] text-black font-semibold text-sm shadow-sm hover:bg-[#e2c23f] transition";

  if (href) {
    return (
      <Link href={href} className={clsx(baseClasses, className)}>
        {Icon && <Icon size={16} />}
        {label}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={clsx(baseClasses, className)}>
      {Icon && <Icon size={16} />}
      {label}
    </button>
  );
}
