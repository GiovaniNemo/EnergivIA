import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { GlassyAuthCard } from "@/components/landing/glassy-auth-card";

export const metadata: Metadata = {
  title: "Acesso e Cadastro | EnergivIA",
  description: "Acesse ou crie sua conta na plataforma EnergivIA para integradores solares.",
};

export default function LoginPage(): JSX.Element {
  return (
    <main className="min-h-screen w-full bg-[#02040a] flex flex-col justify-between py-6 px-4 selection:bg-[#10b981]/30 selection:text-white">
      {/* Top Header with Brand */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-2 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
        >
          <Image
            src="/logo-dark.png"
            alt="EnergivIA"
            width={480}
            height={136}
            className="h-9 sm:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
            priority
            unoptimized
          />
        </Link>
        <Link
          href="/"
          className="text-xs sm:text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          &larr; Voltar ao site
        </Link>
      </header>

      {/* Main Glassy Auth Form Component */}
      <div className="flex-1 flex items-center justify-center py-6">
        <GlassyAuthCard initialMode="signup" redirectUrl="/auth/login" />
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-500">
        &copy; {new Date().getFullYear()} EnergivIA. Todos os direitos reservados.
      </footer>
    </main>
  );
}
