import { Suspense } from "react";
import LoginClient from "./LoginClient";
import pt from "@/locales/pt";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-dvh grid place-items-center bg-[#0b1739]">
          <div className="text-white">{pt.login.carregando}</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
