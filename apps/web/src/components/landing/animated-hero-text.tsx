"use client";

import { motion } from "framer-motion";

export function AnimatedHeroText() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 1,
      },
    },
  };

  return (
    <motion.h1
      variants={container}
      initial="hidden"
      animate="show"
      className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl leading-[1.12]"
    >
      <motion.span variants={item} className="inline-block">
        Gere
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        propostas
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        solares
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        completas
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        em
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300 drop-shadow-[0_2px_14px_rgba(251,191,36,0.15)]">
          segundos
        </span>
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        e
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        feche
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        mais
      </motion.span>{" "}
      <motion.span variants={item} className="inline-block">
        vendas
      </motion.span>
    </motion.h1>
  );
}
