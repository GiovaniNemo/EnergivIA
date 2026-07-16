/**
 * Smoke validation do módulo de financiamento (sem framework de teste).
 * Roda com: `pnpm --filter @energivia/api exec ts-node prisma/scripts/financing/validate-math.ts`
 *
 * Exit code 0 = todos os asserts OK. Exit code 1 = pelo menos um falhou.
 */

import {
  calculateIof,
  cetMonthly,
  IOF_UPFRONT_RATE,
  monthlyToAnnualRate,
  pmt,
  scoreOffer,
  totalAmount,
} from "../../../src/modules/financing/math/financing-math";
import {
  APPLICATION_TRANSITIONS,
  canTransition,
} from "../../../src/modules/financing/state-machine";

let passed = 0;
let failed = 0;

function expect<T>(label: string, actual: T, expected: T, epsilon = 0): void {
  let ok: boolean;
  if (typeof actual === "number" && typeof expected === "number") {
    ok = Math.abs(actual - expected) <= epsilon;
  } else {
    ok = JSON.stringify(actual) === JSON.stringify(expected);
  }
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}\n      esperado: ${expected}\n      obtido:   ${actual}`);
  }
}

function section(name: string): void {
  console.log(`\n${name}`);
}

// ============== PMT ==============
section("PMT (parcela do Sistema Price)");
// Caso clássico: 35.000 em 60 meses a 1,45% a.m. ≈ 877,39 (validado por calculadora financeira)
expect("R$ 35.000 / 60m / 1,45% a.m.", pmt(35_000, 0.0145, 60), 877.39, 0.05);

// Taxa zero → divide igual
expect("Taxa zero → P/n", pmt(12_000, 0, 12), 1000, 0.001);

// 100.000 / 120 / 1,18% a.m. ≈ 1500-ish
const big = pmt(100_000, 0.0118, 120);
expect("R$ 100k / 120m / 1,18% positivo", big > 0 && big < 100_000, true);

// Argumentos inválidos
let throwOk = false;
try {
  pmt(0, 0.01, 60);
} catch {
  throwOk = true;
}
expect("PMT(0, …) lança", throwOk, true);

throwOk = false;
try {
  pmt(1000, 0.01, 0);
} catch {
  throwOk = true;
}
expect("PMT(…, n=0) lança", throwOk, true);

// ============== CET ==============
section("CET (TIR mensal sobre o fluxo)");
// Sem tarifa: CET = monthlyRate exatamente
const installment = pmt(35_000, 0.0145, 60);
expect("Sem tarifa → CET = taxa nominal", cetMonthly(35_000, installment, 60, 0), 0.0145, 1e-4);

// Com tarifa adicional R$ 50/mês → CET > taxa nominal
const cetWithFee = cetMonthly(35_000, installment, 60, 50);
expect("Com tarifa R$ 50/mês → CET > taxa", cetWithFee > 0.0145, true);
expect("Com tarifa R$ 50/mês → CET razoável (<3%)", cetWithFee < 0.03, true);

// Edge case: financedAmount = 0
expect("Principal 0 → CET 0", cetMonthly(0, 100, 60, 0), 0);

// ============== Conversões ==============
section("Taxa anual equivalente");
expect(
  "1% a.m. → 12,68% a.a.",
  Math.round(monthlyToAnnualRate(0.01) * 10000) / 10000,
  0.1268,
  0.0002
);
expect(
  "1,5% a.m. → 19,56% a.a.",
  Math.round(monthlyToAnnualRate(0.015) * 10000) / 10000,
  0.1956,
  0.0002
);

// ============== totalAmount ==============
section("Total pago");
expect("100 × 60 = 6.000", totalAmount(100, 60), 6000);
expect("123,45 × 12", totalAmount(123.45, 12), 1481.4, 0.01);

// ============== scoreOffer ==============
section("Score de ranking");
const baseline = { minInstallment: 800, minCet: 0.014 };
const bestOffer = scoreOffer({ installmentValue: 800, cetMonthly: 0.014 }, baseline);
expect("Oferta = baseline → score ~ 1", Math.abs(bestOffer - 1) < 0.001, true);

const worseOffer = scoreOffer({ installmentValue: 1000, cetMonthly: 0.018 }, baseline);
expect("Oferta pior → score < 1", worseOffer < bestOffer, true);
expect("Score sempre entre 0 e 1", worseOffer >= 0 && worseOffer <= 1, true);

// ============== State machine ==============
section("State machine de FinancingApplication");
expect("CREATED → AWAITING_DOCUMENTS", canTransition("CREATED", "AWAITING_DOCUMENTS"), true);
expect("CREATED → APPROVED (inválido)", canTransition("CREATED", "APPROVED"), false);
expect("APPROVED → CONTRACT_SIGNED", canTransition("APPROVED", "CONTRACT_SIGNED"), true);
expect("APPROVED → COMPLETED (inválido)", canTransition("APPROVED", "COMPLETED"), false);
expect(
  "CONTRACT_SIGNED → CREDIT_RELEASED",
  canTransition("CONTRACT_SIGNED", "CREDIT_RELEASED"),
  true
);
expect("CREDIT_RELEASED → COMPLETED", canTransition("CREDIT_RELEASED", "COMPLETED"), true);
expect("COMPLETED é terminal", APPLICATION_TRANSITIONS.COMPLETED.length, 0);
expect("REJECTED → UNDER_REVIEW (reanálise)", canTransition("REJECTED", "UNDER_REVIEW"), true);
expect("PENDING → AWAITING_DOCUMENTS", canTransition("PENDING", "AWAITING_DOCUMENTS"), true);
expect("Self-transition CREATED→CREATED inválida", canTransition("CREATED", "CREATED"), false);

// ============== IOF (Receita Federal) ==============
section("IOF (BC 3.517 / Decreto 6.339)");

// PF: 0,38% upfront + 0,0082% × dias (cap 365)
// R$ 35.000 em 60 meses (= 1800 dias, cap em 365):
//   upfront = 35.000 × 0,0038 = 133,00
//   diário = 35.000 × 0,000082 × 365 = 1.047,55
//   total ≈ 1.180,55
const iofPF60 = calculateIof(35_000, 60, "PF");
expect("IOF PF R$ 35K / 60m bate cálculo manual", iofPF60, 1180.55, 0.05);

// PJ paga ~metade do diário (0,0041% vs 0,0082%):
//   upfront = 133
//   diário = 35.000 × 0,0000411 × 365 = 524,90
const iofPJ60 = calculateIof(35_000, 60, "PJ");
expect("IOF PJ < IOF PF", iofPJ60 < iofPF60, true);

// Prazo curto (12m = 360 dias, abaixo do cap)
const iofShort = calculateIof(35_000, 12, "PF");
expect("IOF 12m respeita prazo (sem cap)", iofShort < iofPF60, true);

// Prazo longo é capped em 365 dias
const iofLong = calculateIof(35_000, 120, "PF");
expect("IOF 120m = 60m (cap 365 dias)", iofLong, iofPF60, 0.01);

// IOF upfront rate é constante
expect("IOF upfront = 0,38%", IOF_UPFRONT_RATE, 0.0038);

// Principal zero
expect("Principal 0 → IOF 0", calculateIof(0, 60, "PF"), 0);

// ============== CET com IOF ==============
section("CET com IOF (eleva a taxa efetiva)");

const principalCet = 35_000;
const termCet = 60;
const rateCet = 0.0145;
const installmentCet = pmt(principalCet, rateCet, termCet);
const cetNoIof = cetMonthly(principalCet, installmentCet, termCet, 0);
const cetWithIof = cetMonthly(
  principalCet,
  installmentCet,
  termCet,
  0,
  calculateIof(principalCet, termCet, "PF")
);
expect("CET sem IOF = taxa nominal", cetNoIof, 0.0145, 1e-4);
expect("CET com IOF > taxa nominal", cetWithIof > rateCet, true);
expect("CET com IOF < taxa + 0,5% a.m. (sanidade)", cetWithIof < rateCet + 0.005, true);

// CET sobe ~0,1% a.m. com IOF padrão (heuristic)
expect(
  "Aumento do CET por IOF razoável (~0,05-0,2% a.m.)",
  cetWithIof - cetNoIof > 0.0003 && cetWithIof - cetNoIof < 0.003,
  true
);

// IOF + tarifa upfront combinados
const cetWithIofAndTac = cetMonthly(principalCet, installmentCet, termCet, 0, 1180.55, 200);
expect("CET com IOF + TAC > apenas IOF", cetWithIofAndTac > cetWithIof, true);

// IOF maior que principal — caso degenerado
expect("IOF > principal → CET 0 (degenerate)", cetMonthly(1000, 100, 60, 0, 2000), 0);

// ============== Sanidade financeira ==============
section("Sanidade financeira (kit solar típico)");
// Cliente médio: R$ 35.000 financiado, taxas das tabelas seed
const cresol = pmt(35_000, 0.0145, 60); // Cresol
const sicredi = pmt(35_000, 0.0152, 60); // Sicredi
const sicoob = pmt(35_000, 0.0168, 60); // Sicoob
expect("Cresol parcela < Sicredi", cresol < sicredi, true);
expect("Sicredi parcela < Sicoob", sicredi < sicoob, true);
expect("Diferença Cresol vs Sicoob > R$ 50/mês", sicoob - cresol > 50, true);

// ============== Resumo ==============
console.log(`\n${"=".repeat(40)}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
