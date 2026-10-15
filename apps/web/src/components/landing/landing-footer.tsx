import Link from "next/link";
import Image from "next/image";

const appLoginUrl = "/login";
const appSignupUrl = "/cadastro";

interface LandingFooterProps {
  className?: string;
}

export function LandingFooter({ className = "" }: LandingFooterProps): JSX.Element {
  return (
    <footer
      className={`border-t border-white/5 bg-[#02040a] px-4 py-12 sm:px-6 text-slate-400 ${className}`}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link href="/" className="flex items-center group transition-opacity hover:opacity-95">
            <Image
              src="/logo-dark.png"
              alt="EnergiVIA"
              width={480}
              height={136}
              className="h-11 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 180px, 240px"
            />
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-5 text-sm">
            <Link href="/#como-funciona" className="hover:text-white transition-colors">
              Como funciona
            </Link>
            <Link href="/#resultados" className="hover:text-white transition-colors">
              Resultados
            </Link>
            <Link href="/#cenarios" className="hover:text-white transition-colors">
              Cenários
            </Link>
            <Link href="/#diferenciais" className="hover:text-white transition-colors">
              Diferenciais
            </Link>
            <Link href="/#faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <a
              href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Ver demonstração
            </a>
            <Link href={appLoginUrl} className="hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href={appSignupUrl} className="hover:text-white transition-colors">
              Criar conta
            </Link>
            <Link href="/termos-de-uso" className="hover:text-white transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">
              Privacidade
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-sm sm:text-left text-slate-400">
          © {new Date().getFullYear()} EnergiVIA. O seu parceiro via I.A. CNPJ: 66.304.358/0001-16
        </p>
      </div>
    </footer>
  );
}
