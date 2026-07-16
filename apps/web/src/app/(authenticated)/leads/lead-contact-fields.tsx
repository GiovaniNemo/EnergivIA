"use client";

import type { Control, FieldErrors } from "react-hook-form";
import { Controller } from "react-hook-form";
import { cn, maskCpfCnpj, maskWhatsappBr } from "@energivia/utils";
import { Input } from "@/components/ui/input";
import type { LeadFormValues } from "@/lib/lead-form-schema";

function inputErr(invalid: boolean): string {
  return cn(
    invalid && "border-red-500/80 focus-visible:border-red-500 focus-visible:ring-red-500/35"
  );
}

export function LeadContactFields({
  control,
  errors,
  idsPrefix = "lead",
  showCpfHint = true,
  cpfPlaceholder = "000.000.000-00 ou 00.000.000/0001-00",
}: {
  control: Control<LeadFormValues>;
  errors: FieldErrors<LeadFormValues>;
  idsPrefix?: string;
  showCpfHint?: boolean;
  cpfPlaceholder?: string;
}): JSX.Element {
  return (
    <>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Input
              id={`${idsPrefix}-name`}
              label="Nome"
              autoComplete="name"
              placeholder="Maria Silva"
              aria-invalid={!!errors.name}
              className={inputErr(!!errors.name)}
              {...field}
            />
            {errors.name ? (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>
            ) : null}
          </div>
        )}
      />
      <Controller
        name="whatsapp"
        control={control}
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Input
              id={`${idsPrefix}-wa`}
              label="WhatsApp"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(41) 99999-9999 ou +55 (41) 99999-9999"
              aria-invalid={!!errors.whatsapp}
              className={inputErr(!!errors.whatsapp)}
              {...field}
              onChange={(e) => field.onChange(maskWhatsappBr(e.target.value))}
            />
            {errors.whatsapp ? (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.whatsapp.message}</p>
            ) : null}
          </div>
        )}
      />
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Input
              id={`${idsPrefix}-mail`}
              label="E-mail (opcional)"
              type="email"
              autoComplete="email"
              placeholder="nome@email.com"
              aria-invalid={!!errors.email}
              className={inputErr(!!errors.email)}
              {...field}
            />
            {errors.email ? (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
            ) : null}
          </div>
        )}
      />
      <Controller
        name="cpfCnpj"
        control={control}
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Input
              id={`${idsPrefix}-doc`}
              label="CPF ou CNPJ (opcional)"
              autoComplete="off"
              placeholder={cpfPlaceholder}
              aria-invalid={!!errors.cpfCnpj}
              className={inputErr(!!errors.cpfCnpj)}
              {...field}
              onChange={(e) => field.onChange(maskCpfCnpj(e.target.value))}
            />
            {errors.cpfCnpj ? (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.cpfCnpj.message}</p>
            ) : null}
            {showCpfHint ? (
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Evita cadastrar o mesmo cliente duas vezes na organização.
              </p>
            ) : null}
          </div>
        )}
      />
      <Controller
        name="company"
        control={control}
        render={({ field }) => (
          <div className="grid gap-1.5">
            <Input
              id={`${idsPrefix}-co`}
              label="Empresa (opcional)"
              autoComplete="organization"
              placeholder="Nome da empresa"
              {...field}
            />
          </div>
        )}
      />
    </>
  );
}
