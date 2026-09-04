"use client";

import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { User, Phone, Mail, FileText, Building2 } from "lucide-react";
import type { LeadDetail } from "@/lib/leads-api";
import { updateLead } from "@/lib/leads-api";

function maskPhone(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function maskCpfCnpj(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  // CNPJ: 00.000.000/0000-00
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

type EditLeadDialogProps = {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  lead: LeadDetail;
  onSuccess: () => void;
};

export function EditLeadDialog({
  open,
  onClose,
  organizationId,
  lead,
  onSuccess,
}: EditLeadDialogProps): JSX.Element {
  const [name, setName] = useState(lead.name || "");
  const [whatsapp, setWhatsapp] = useState(lead.whatsapp || "");
  const [cpfCnpj, setCpfCnpj] = useState(lead.cpfCnpj || "");
  const [email, setEmail] = useState(lead.email || "");
  const [company, setCompany] = useState(lead.company || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(lead.name || "");
      setWhatsapp(lead.whatsapp ? maskPhone(lead.whatsapp) : "");
      setCpfCnpj(lead.cpfCnpj ? maskCpfCnpj(lead.cpfCnpj) : "");
      setEmail(lead.email || "");
      setCompany(lead.company || "");
      setError(null);
    }
  }, [open, lead]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError("Informe o nome do cliente.");
      return;
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, "");
    if (cleanWhatsapp.length < 8) {
      setError("Informe um número de WhatsApp válido.");
      return;
    }

    const cleanCpfCnpj = cpfCnpj.replace(/\D/g, "");

    setSaving(true);
    setError(null);
    try {
      await updateLead(organizationId, lead.id, {
        name: cleanName,
        whatsapp: cleanWhatsapp,
        cpfCnpj: cleanCpfCnpj || null,
        email: email.trim() || null,
        company: company.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cliente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Editar dados do cliente</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
          <TextField
            label="Nome completo"
            required
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Guilherme Silva"
            InputProps={{
              startAdornment: <User size={18} className="mr-2 text-muted-foreground" />,
            }}
          />

          <TextField
            label="WhatsApp"
            required
            fullWidth
            value={whatsapp}
            onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
            placeholder="(44) 98811-7969"
            InputProps={{
              startAdornment: <Phone size={18} className="mr-2 text-muted-foreground" />,
            }}
          />

          <TextField
            label="CPF ou CNPJ (opcional)"
            fullWidth
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value))}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            InputProps={{
              startAdornment: <FileText size={18} className="mr-2 text-muted-foreground" />,
            }}
          />

          <TextField
            label="E-mail (opcional)"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@email.com"
            InputProps={{
              startAdornment: <Mail size={18} className="mr-2 text-muted-foreground" />,
            }}
          />

          <TextField
            label="Empresa / Razão Social (opcional)"
            fullWidth
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Ex.: Silva Comércio Solar Ltda"
            InputProps={{
              startAdornment: <Building2 size={18} className="mr-2 text-muted-foreground" />,
            }}
          />

          {error ? (
            <Typography variant="caption" color="error" sx={{ mt: -1 }}>
              {error}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={saving} variant="text">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
