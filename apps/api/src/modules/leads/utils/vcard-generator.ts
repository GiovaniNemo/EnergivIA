export interface ContactVCardItem {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  role?: string;
  note?: string;
}

/**
 * Normaliza número para o formato internacional E.164 (+5544998215497)
 */
export function formatInternationalPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 11) {
    return `+55${digits}`;
  }
  return `+${digits}`;
}

/**
 * Gera conteúdo vCard (.vcf) versão 3.0 compatível universalmente
 * com Android, iPhone (iOS) e Google Contatos.
 */
export function generateVCard(contacts: ContactVCardItem[]): string {
  const cards: string[] = [];

  for (const contact of contacts) {
    const phone = formatInternationalPhone(contact.phone);
    if (!phone || phone.length < 9) continue;

    const rawName = (contact.name || "Contato EnergivIA").trim();
    // Sanitiza quebras de linha e caracteres de controle
    const safeName = rawName
      .replace(/[\r\n;]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const lines: string[] = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${safeName}`,
      `N:${safeName};;;;`,
      `TEL;TYPE=CELL,VOICE:${phone}`,
    ];

    const org = (contact.company || contact.role || "EnergivIA").trim();
    if (org) {
      lines.push(`ORG:${org.replace(/[\r\n;]/g, " ")}`);
    }

    if (contact.email && contact.email.includes("@")) {
      lines.push(`EMAIL;TYPE=INTERNET:${contact.email.trim().toLowerCase()}`);
    }

    const note =
      contact.note ||
      (contact.role
        ? `Contato cadastrado no EnergivIA (${contact.role})`
        : "Contato cadastrado via WhatsApp / EnergivIA");
    if (note) {
      lines.push(`NOTE:${note.replace(/[\r\n;]/g, " ")}`);
    }

    lines.push("END:VCARD");
    cards.push(lines.join("\r\n"));
  }

  return cards.join("\r\n");
}
