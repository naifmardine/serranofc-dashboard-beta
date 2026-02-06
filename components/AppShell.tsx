// components/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Atoms/Sidebar";
import { useTokenSync } from "@/hooks/useTokenSync";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Sincroniza token do localStorage para cookie
  useTokenSync();

  // rotas sem sidebar
  const hideSidebar = pathname === "/login";

  if (hideSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-(--sb-width) flex-1 p-4 transition-[margin-left] duration-200 ease-out">
        {children}
      </main>
    </div>
  );
}
