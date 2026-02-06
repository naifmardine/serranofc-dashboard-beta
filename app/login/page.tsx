import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-dvh grid place-items-center bg-[#0b1739]">
          <div className="text-white">Carregando...</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
