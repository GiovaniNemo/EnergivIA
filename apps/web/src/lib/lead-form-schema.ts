import { z } from "zod";
import { digitsOnly, isValidCnpj, isValidCpf } from "@energivia/utils";

export const leadFormSchema = z.object({
  name: z.string().refine((s) => s.trim().length >= 2, "Nome deve ter pelo menos 2 caracteres"),
  whatsapp: z.string().refine((s) => {
    const d = digitsOnly(s);
    return d.length >= 10 && d.length <= 13;
  }, "Informe DDD + número (10 a 13 dígitos)"),
  email: z.string().refine((s) => {
    const t = s.trim();
    if (t === "") return true;
    return z.string().email().safeParse(t).success;
  }, "E-mail inválido"),
  cpfCnpj: z.string().refine((s) => {
    const d = digitsOnly(s);
    if (d.length === 0) return true;
    return isValidCpf(d) || isValidCnpj(d);
  }, "CPF ou CNPJ inválido"),
  company: z.string(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const emptyLeadForm: LeadFormValues = {
  name: "",
  whatsapp: "",
  email: "",
  cpfCnpj: "",
  company: "",
};

export function leadFormToCreatePayload(values: LeadFormValues) {
  const company = values.company.trim();
  const doc = digitsOnly(values.cpfCnpj);
  const email = values.email.trim();
  return {
    name: values.name.trim(),
    whatsapp: digitsOnly(values.whatsapp),
    email: email || undefined,
    cpfCnpj: doc || undefined,
    company: company || undefined,
  };
}

export function leadFormToUpdatePayload(values: LeadFormValues) {
  const doc = digitsOnly(values.cpfCnpj);
  const email = values.email.trim();
  return {
    name: values.name.trim(),
    whatsapp: digitsOnly(values.whatsapp),
    email: email || null,
    cpfCnpj: doc.length > 0 ? doc : null,
    company: values.company.trim() || null,
  };
}
