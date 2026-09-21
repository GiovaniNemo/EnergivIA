"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, CheckCircle2, Zap, HelpCircle, UserPlus, Layers } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

const navItems = [
  { id: "como-funciona", label: "Como Funciona", icon: Rocket },
  { id: "beneficios", label: "Resultados", icon: CheckCircle2 },
  { id: "cenarios", label: "Cenários", icon: Layers },
  { id: "diferenciais", label: "Diferenciais", icon: Zap },
  { id: "faq", label: "FAQ", icon: HelpCircle },
];

export function BubbleSidebar() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const mostVisible = visibleEntries.reduce((prev, current) =>
            current.intersectionRatio > prev.intersectionRatio ? current : prev
          );
          setActiveSection(mostVisible.target.id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -40% 0px",
        threshold: [0, 0.2, 0.5, 0.8, 1],
      }
    );

    navItems.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="fixed left-4 top-1/2 z-[100] hidden -translate-y-1/2 flex-col gap-3 lg:flex">
      <motion.nav
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        className="flex flex-col items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 p-2 shadow-2xl backdrop-blur-xl"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const isHovered = hoveredItem === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className="group relative"
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, x: -10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -5, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute left-[calc(100%+16px)] top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-xl"
                  >
                    {item.label}
                    <div className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-slate-700 bg-slate-900" />
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                onClick={() => handleClick(item.id)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors focus:outline-none"
                aria-label={item.label}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBubbleIndicator"
                    className="absolute inset-0 rounded-full bg-emerald-500/20 border border-emerald-500/40"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                {isHovered && !isActive && (
                  <motion.div
                    layoutId="hoverBubbleIndicator"
                    className="absolute inset-0 rounded-full bg-slate-800"
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  />
                )}
                <Icon
                  className={[
                    "relative z-10 h-5 w-5 transition-colors duration-200",
                    isActive ? "text-amber-400" : isHovered ? "text-slate-200" : "text-slate-400",
                  ].join(" ")}
                />
              </button>
            </div>
          );
        })}

        <div className="my-1 h-px w-8 bg-slate-800" />

        <div
          className="group relative"
          onMouseEnter={() => setHoveredItem("whatsapp")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <AnimatePresence>
            {hoveredItem === "whatsapp" && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -5, scale: 0.95 }}
                className="absolute left-[calc(100%+16px)] top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap rounded-lg border border-emerald-500/40 bg-slate-900 px-3 py-1.5 text-xs font-medium text-emerald-400 shadow-xl"
              >
                Ver demonstração
                <div className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-emerald-500/40 bg-slate-900" />
              </motion.div>
            )}
          </AnimatePresence>
          <a
            href="https://wa.me/5544988117969?text=Ol%C3%A1!%20Gostaria%20de%20ver%20uma%20demonstra%C3%A7%C3%A3o%20da%20EnergivIA."
            target="_blank"
            rel="noopener noreferrer"
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/20"
            aria-label="Ver demonstração via WhatsApp"
          >
            <FaWhatsapp className="h-5 w-5" />
          </a>
        </div>

        <div
          className="group relative mt-1"
          onMouseEnter={() => setHoveredItem("login")}
          onMouseLeave={() => setHoveredItem(null)}
        >
          <AnimatePresence>
            {hoveredItem === "login" && (
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -5, scale: 0.95 }}
                className="absolute left-[calc(100%+16px)] top-1/2 flex -translate-y-1/2 items-center whitespace-nowrap rounded-lg border border-amber-400/40 bg-slate-900 px-3 py-1.5 text-xs font-medium text-amber-300 shadow-xl"
              >
                Criar conta grátis
                <div className="absolute -left-[5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-amber-400/40 bg-slate-900" />
              </motion.div>
            )}
          </AnimatePresence>
          <a
            href="/login"
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-amber-400/10 text-amber-300 transition-colors hover:bg-amber-400/20"
            aria-label="Entrar / Criar Conta"
          >
            <UserPlus className="h-5 w-5" />
          </a>
        </div>
      </motion.nav>
    </div>
  );
}
