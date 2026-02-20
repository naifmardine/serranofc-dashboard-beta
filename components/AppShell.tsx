"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Atoms/Sidebar";
import { useAuth } from "../app/auth/AuthContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isLogin = pathname === "/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLogin) {
      router.replace("/login");
      router.refresh();
    }
  }, [loading, user, isLogin, router]);

  if (loading) return <>{children}</>;
  if (isLogin || !user) return <>{children}</>;

  return (
    <div className="flex">
      <Sidebar />
      <main className="ml-(--sb-width) flex-1 p-4 transition-[margin-left] duration-200 ease-out">
        {children}
      </main>
    </div>
  );
}
