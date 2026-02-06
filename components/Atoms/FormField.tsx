"use client";

type Props = {
  label: string;
  children: React.ReactNode;
};

export default function FormField({ label, children }: Props) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {label}
      </span>
      {children}
    </label>
  );
}
