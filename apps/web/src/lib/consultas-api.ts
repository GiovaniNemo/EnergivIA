/**
 * Utilitários para consulta de CNPJ (Receita Federal / BrasilAPI) e CEP (ViaCEP / BrasilAPI)
 */

export interface CnpjDataResult {
  razaoSocial: string;
  nomeFantasia: string;
  cnpjFormatado: string;
  inscricaoEstadual?: string;
  telefone?: string;
  email?: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  representanteLegal?: string;
  cpfRepresentante?: string;
}

export interface CepDataResult {
  cepFormatado: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

export function formatCpf(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCnpj(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCep(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatPhone(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Consulta dados completos de Pessoa Jurídica via BrasilAPI com fallback para MinhaReceita e ReceitaWS
 */
export async function fetchCnpjData(rawCnpj: string): Promise<CnpjDataResult> {
  const clean = rawCnpj.replace(/\D/g, "");
  if (clean.length !== 14) {
    throw new Error("CNPJ deve conter exatamente 14 dígitos.");
  }

  // 1. Tenta BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (res.ok) {
      const data = await res.json();
      const socios = Array.isArray(data.qsa) ? data.qsa : [];
      const adminSocio =
        socios.find(
          (s: { qualificacao_socio?: string; qualificacao_representante_legal?: string }) =>
            s.qualificacao_socio?.toLowerCase().includes("administrador") ||
            s.qualificacao_representante_legal?.toLowerCase().includes("administrador")
        ) || socios[0];

      const streetPrefix = data.descricao_tipo_de_logradouro
        ? `${data.descricao_tipo_de_logradouro} `
        : "";
      const street = `${streetPrefix}${data.logradouro || ""}`.trim();

      const phone = data.ddd_telefone_1
        ? formatPhone(data.ddd_telefone_1)
        : data.telefone
          ? formatPhone(data.telefone)
          : "";

      return {
        razaoSocial: data.razao_social || data.nome_fantasia || "",
        nomeFantasia: data.nome_fantasia || "",
        cnpjFormatado: formatCnpj(clean),
        telefone: phone,
        email: data.email || "",
        cep: data.cep ? formatCep(String(data.cep)) : "",
        logradouro: street,
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.municipio || "",
        estado: data.uf || "",
        representanteLegal: adminSocio?.nome_socio || adminSocio?.nome || "",
        cpfRepresentante: adminSocio?.cnpj_cpf_do_socio
          ? formatCpf(adminSocio.cnpj_cpf_do_socio)
          : "",
      };
    }
  } catch {}

  // 2. Fallback: MinhaReceita
  try {
    const res = await fetch(`https://minhareceita.org/${clean}`);
    if (res.ok) {
      const data = await res.json();
      const socios = Array.isArray(data.qsa) ? data.qsa : [];
      const adminSocio =
        socios.find(
          (s: { qualificacao_socio?: string; qualificacao_representante_legal?: string }) =>
            s.qualificacao_socio?.toLowerCase().includes("administrador") ||
            s.qualificacao_representante_legal?.toLowerCase().includes("administrador")
        ) || socios[0];

      const streetPrefix = data.descricao_tipo_de_logradouro
        ? `${data.descricao_tipo_de_logradouro} `
        : "";
      const street = `${streetPrefix}${data.logradouro || ""}`.trim();

      const phone = data.ddd_telefone_1
        ? formatPhone(data.ddd_telefone_1)
        : data.telefone
          ? formatPhone(data.telefone)
          : "";

      return {
        razaoSocial: data.razao_social || data.nome_fantasia || "",
        nomeFantasia: data.nome_fantasia || "",
        cnpjFormatado: formatCnpj(clean),
        telefone: phone,
        email: data.email || "",
        cep: data.cep ? formatCep(String(data.cep)) : "",
        logradouro: street,
        numero: data.numero || "",
        complemento: data.complemento || "",
        bairro: data.bairro || "",
        cidade: data.municipio || "",
        estado: data.uf || "",
        representanteLegal: adminSocio?.nome_socio || adminSocio?.nome || "",
        cpfRepresentante: adminSocio?.cnpj_cpf_do_socio
          ? formatCpf(adminSocio.cnpj_cpf_do_socio)
          : "",
      };
    }
  } catch {}

  // 3. Fallback: ReceitaWS
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${clean}`);
    if (res.ok) {
      const data = await res.json();
      if (data.status !== "ERROR") {
        const socios = Array.isArray(data.qsa) ? data.qsa : [];
        const adminSocio =
          socios.find((s: { qual?: string }) => s.qual?.toLowerCase().includes("administrador")) ||
          socios[0];

        return {
          razaoSocial: data.nome || data.fantasia || "",
          nomeFantasia: data.fantasia || "",
          cnpjFormatado: formatCnpj(clean),
          telefone: data.telefone ? formatPhone(data.telefone) : "",
          email: data.email || "",
          cep: data.cep ? formatCep(String(data.cep)) : "",
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          complemento: data.complemento || "",
          bairro: data.bairro || "",
          cidade: data.municipio || "",
          estado: data.uf || "",
          representanteLegal: adminSocio?.nome || "",
          cpfRepresentante: "",
        };
      }
    }
  } catch {}

  throw new Error("CNPJ não encontrado na Receita Federal. Preencha os dados manualmente.");
}

/**
 * Consulta CEP no ViaCEP com fallback para BrasilAPI
 */
export async function fetchViaCepData(rawCep: string): Promise<CepDataResult> {
  const clean = rawCep.replace(/\D/g, "");
  if (clean.length !== 8) {
    throw new Error("CEP deve conter 8 dígitos.");
  }

  // 1. ViaCEP
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          cepFormatado: formatCep(clean),
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
          complemento: data.complemento || "",
        };
      }
    }
  } catch {}

  // 2. Fallback BrasilAPI
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`);
    if (res.ok) {
      const data = await res.json();
      return {
        cepFormatado: formatCep(clean),
        logradouro: data.street || "",
        bairro: data.neighborhood || "",
        cidade: data.city || "",
        estado: data.state || "",
        complemento: "",
      };
    }
  } catch {}

  throw new Error("CEP não encontrado.");
}
