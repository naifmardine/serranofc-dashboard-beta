"use client";

import clsx from "clsx";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export default function AdminSectionCard({
  title,
  children,
  className,
}: Props) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-gray-200 bg-white px-5 py-4 space-y-5",
        className
      )}
    >
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      {children}
    </section>
  );
}
