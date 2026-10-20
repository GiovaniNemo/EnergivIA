"use client";

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@/components/providers/organization-provider";
import { useUser } from "@auth0/nextjs-auth0/client";
import {
  AlertTriangle,
  Lightbulb,
  MessageSquareWarning,
  HelpCircle,
  CreditCard,
  Send,
  Loader2,
  Paperclip,
  X,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type TicketCategory =
  | "dificuldade"
  | "melhoria"
  | "reclamacao"
  | "duvida"
  | "financeiro"
  | "outro";

export type TicketSeverity = "baixa" | "media" | "alta" | "critica";

interface CategoryOption {
  key: TicketCategory;
  label: string;
  desc: string;
  icon: typeof AlertTriangle;
  badgeColor: string;
  borderColor: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    key: "dificuldade",
    label: "Dificuldade Técnica / Bug",
    desc: "Algo não funcionou como esperado, erro ou lentidão no sistema.",
    icon: AlertTriangle,
    badgeColor: "text-red-500 bg-red-500/10",
    borderColor: "hover:border-red-500/40",
  },
  {
    key: "melhoria",
    label: "Sugestão de Melhoria",
    desc: "Ideias e recursos que você gostaria de ver na plataforma.",
    icon: Lightbulb,
    badgeColor: "text-blue-500 bg-blue-500/10",
    borderColor: "hover:border-blue-500/40",
  },
  {
    key: "reclamacao",
    label: "Reclamação & Ouvidoria",
    desc: "Canal prioritário e direto com a diretoria e sócios da EnergivIA.",
    icon: MessageSquareWarning,
    badgeColor: "text-amber-500 bg-amber-500/10",
    borderColor: "hover:border-amber-500/40",
  },
  {
    key: "duvida",
    label: "Dúvida de Operação",
    desc: "Ajuda para utilizar dimensionamento, propostas ou IA.",
    icon: HelpCircle,
    badgeColor: "text-purple-500 bg-purple-500/10",
    borderColor: "hover:border-purple-500/40",
  },
  {
    key: "financeiro",
    label: "Financeiro & Faturamento",
    desc: "Planos, faturas, notas fiscais, upgrade ou downgrade.",
    icon: CreditCard,
    badgeColor: "text-emerald-500 bg-emerald-500/10",
    borderColor: "hover:border-emerald-500/40",
  },
];

interface UploadedFilePreview {
  filename: string;
  sizeBytes: number;
  base64?: string;
  contentType: string;
}

interface TicketFormProps {
  onSuccess: (data: {
    protocol: string;
    subject: string;
    category: TicketCategory;
    email: string;
  }) => void;
}

export function TicketForm({ onSuccess }: TicketFormProps) {
  const { user: profile, currentOrganization } = useOrganization();
  const { user: auth0User } = useUser();

  const [category, setCategory] = useState<TicketCategory>("dificuldade");
  const [severity, setSeverity] = useState<TicketSeverity>("media");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [attachments, setAttachments] = useState<UploadedFilePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pré-preenchimento automático inteligente com base na sessão
  useEffect(() => {
    if (profile?.name || auth0User?.name) {
      setName(profile?.name || auth0User?.name || "");
    }
    if (profile?.email || auth0User?.email) {
      setEmail(profile?.email || auth0User?.email || "");
    }
    if (currentOrganization?.name) {
      setCompanyName(currentOrganization.name);
    }
  }, [profile, auth0User, currentOrganization]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Limite de 8MB por anexo
      if (file.size > 8 * 1024 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de 8MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            sizeBytes: file.size,
            contentType: file.type || "application/octet-stream",
            base64: result,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!subject.trim()) {
      setErrorMsg("Por favor, preencha o assunto da sua solicitação.");
      return;
    }

    if (!message.trim()) {
      setErrorMsg("Por favor, forneça os detalhes da sua mensagem.");
      return;
    }

    if (!email.trim()) {
      setErrorMsg("Por favor, informe seu e-mail para receber o retorno.");
      return;
    }

    setSubmitting(true);

    try {
      // Coleta telemetria técnica não-invasiva
      const metadata: Record<string, unknown> = {
        currentPath: typeof window !== "undefined" ? window.location.pathname : "",
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "",
        screenResolution:
          typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "",
        timestamp: new Date().toISOString(),
      };

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          severity,
          subject: subject.trim(),
          message: message.trim(),
          name: name.trim() || "Integrador",
          email: email.trim(),
          phone: phone.trim() || undefined,
          companyName: companyName.trim() || undefined,
          userPlan:
            currentOrganization?.subscription?.plan?.name || (profile?.isTrial ? "TRIAL" : "PRO"),
          attachments: attachments.map((a) => ({
            filename: a.filename,
            sizeBytes: a.sizeBytes,
            contentType: a.contentType,
            base64: a.base64,
          })),
          metadata,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || "Falha ao enviar o chamado.");
      }

      onSuccess({
        protocol: data.protocol || "TKT-REGISTRADO",
        subject: subject.trim(),
        category,
        email: email.trim(),
      });

      // Limpar formulário
      setSubject("");
      setMessage("");
      setAttachments([]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao registrar o chamado. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Seleção de Categoria Visual */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2.5">
          1. Selecione o Tipo de Solicitação
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.key;
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategory(cat.key)}
                className={`relative flex flex-col text-left p-3.5 rounded-2xl border transition-all duration-150 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-500/[0.04] dark:bg-emerald-500/10 shadow-xs ring-1 ring-emerald-500/30"
                    : "border-neutral-200 dark:border-white/10 bg-white dark:bg-[#0f172a]/60 hover:bg-neutral-50 dark:hover:bg-white/[0.02]"
                } ${cat.borderColor}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className={`p-1.5 rounded-xl ${cat.badgeColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {isSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="font-semibold text-xs text-neutral-900 dark:text-white">
                  {cat.label}
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
                  {cat.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Nível de Severidade (se for Dificuldade ou Reclamação) */}
      {(category === "dificuldade" || category === "reclamacao") && (
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02]">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
            Nível de Urgência / Impacto na sua Operação
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { key: "baixa", label: "Baixa", desc: "Dúvida simples ou melhoria visual" },
                { key: "media", label: "Média", desc: "Dificuldade pontual com contorno" },
                { key: "alta", label: "Alta", desc: "Impacto em clientes ou propostas" },
                { key: "critica", label: "Crítica", desc: "Sistema inoperante para vendas" },
              ] as const
            ).map((sev) => {
              const isSelected = severity === sev.key;
              return (
                <button
                  key={sev.key}
                  type="button"
                  onClick={() => setSeverity(sev.key)}
                  className={`p-2.5 rounded-xl border text-center transition-all text-xs font-semibold ${
                    isSelected
                      ? sev.key === "critica"
                        ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold"
                        : "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                      : "border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <div>{sev.label}</div>
                  <div className="text-[10px] font-normal text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {sev.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Assunto e Descrição */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
            Assunto do Chamado *
          </label>
          <Input
            type="text"
            required
            placeholder={
              category === "melhoria"
                ? "Ex: Sugestão para adicionar exportação de dados em CSV..."
                : category === "reclamacao"
                  ? "Ex: Relato sobre instabilidade no envio de WhatsApp..."
                  : "Ex: Dificuldade ao calcular economia na proposta #4092..."
            }
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 rounded-xl bg-white dark:bg-[#0f172a]/60 border-neutral-200 dark:border-white/10 text-sm shadow-xs focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
            Descrição Detalhada *
          </label>
          <Textarea
            required
            rows={5}
            placeholder={
              category === "melhoria"
                ? "Descreva como você gostaria que essa funcionalidade funcionasse e qual valor traria para o seu dia a dia..."
                : "Descreva o que aconteceu, passos para reproduzir o problema ou sua mensagem completa..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="rounded-xl bg-white dark:bg-[#0f172a]/60 border-neutral-200 dark:border-white/10 text-sm shadow-xs focus:ring-2 focus:ring-emerald-500/20 leading-relaxed"
          />
        </div>
      </div>

      {/* 4. Upload de Anexos / Evidências */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
          Anexar Prints de Tela ou Documentos (Opcional)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="ticket-file-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-xl border-dashed border-neutral-300 dark:border-white/15 h-9 text-xs text-neutral-600 dark:text-neutral-300 hover:border-emerald-500"
          >
            <Paperclip className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
            Adicionar Arquivo (PNG, JPG, PDF até 8MB)
          </Button>

          {attachments.map((file, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800/80 px-2.5 py-1 text-xs text-neutral-700 dark:text-neutral-300"
            >
              <FileText className="h-3 w-3 text-emerald-500" />
              <span className="max-w-[140px] truncate">{file.filename}</span>
              <button
                type="button"
                onClick={() => removeAttachment(idx)}
                className="text-neutral-400 hover:text-red-500 ml-1"
                title="Remover anexo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Dados de Contato e Retorno */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Seu Nome
          </label>
          <Input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 rounded-xl bg-white dark:bg-[#0f172a]/60 border-neutral-200 dark:border-white/10 text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            E-mail para Resposta *
          </label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 rounded-xl bg-white dark:bg-[#0f172a]/60 border-neutral-200 dark:border-white/10 text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
            Telefone / WhatsApp (Opcional)
          </label>
          <Input
            type="tel"
            placeholder="(DD) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-10 rounded-xl bg-white dark:bg-[#0f172a]/60 border-neutral-200 dark:border-white/10 text-xs"
          />
        </div>
      </div>

      {/* Mensagem de Erro (se houver) */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Botão de Envio */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-white/5">
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Chamados enviados para a diretoria técnica em{" "}
          <strong className="text-neutral-700 dark:text-neutral-300">
            contato@energivia.com.br
          </strong>
        </p>

        <Button
          type="submit"
          disabled={submitting}
          className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Registrando Chamado...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Enviar Solicitação</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
