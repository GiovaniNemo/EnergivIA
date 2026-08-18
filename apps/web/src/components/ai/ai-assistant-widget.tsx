/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  Bot,
  X,
  Send,
  ImageIcon,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Zap,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  proposalUrl?: string;
  clientName?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrai a primeira URL de proposta que aparecer no texto */
function extractProposalUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s)>\]"']+\/proposta\/[^\s)>\]"']+/i);
  return match ? match[0] : null;
}

/** Tenta extrair o nome do cliente a partir do contexto da mensagem */
function extractClientName(text: string): string | null {
  const patterns = [
    /proposta\s+d[eoa]\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙ][a-záéíóúãõâêîôûàèìòù]+(?:\s+[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙ][a-záéíóúãõâêîôûàèìòù]+)*)/i,
    /cliente[:\s]+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙ][a-záéíóúãõâêîôûàèìòù]+(?:\s+[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÀÈÌÒÙ][a-záéíóúãõâêîôûàèìòù]+)*)/i,
    /\[Veja aqui a proposta de\s+([^\]]+)\]/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

/** Renderiza texto com URLs como botões clicáveis */
function parseContent(text: string): React.ReactNode[] {
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/\S+)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <span key={`t-${lastIndex}`} style={{ whiteSpace: "pre-line" }}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }
    const url = match[2] ?? match[3];
    nodes.push(<ProposalLinkButton key={`l-${match.index}`} url={url} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <span key={`t-${lastIndex}`} style={{ whiteSpace: "pre-line" }}>
        {text.slice(lastIndex)}
      </span>
    );
  }
  return nodes;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProposalLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <span className="flex flex-wrap items-center gap-2 my-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                   bg-emerald-500 hover:bg-emerald-400 text-white shadow-md
                   transition-all duration-200 hover:scale-[1.03] active:scale-95"
      >
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
        Acessar Cotação
      </a>
      <button
        onClick={handleCopy}
        title="Copiar link"
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium
                   bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700
                   transition-all duration-200 active:scale-95"
      >
        {copied ? (
          <>
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400">Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            Copiar link
          </>
        )}
      </button>
    </span>
  );
}

function ForwardBubble({
  proposalUrl,
  clientName,
}: {
  proposalUrl: string;
  clientName?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const greeting = clientName ? `Olá, ${clientName.split(" ")[0]}! 👋` : "Olá! 👋";
  const forwardText = `${greeting}\n\nTemos uma cotação personalizada de energia solar preparada especialmente para você! ☀️⚡\n\nAcesse agora e veja o quanto você pode economizar na conta de luz:\n\n👉 ${proposalUrl}\n\nQualquer dúvida, estou à disposição!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(forwardText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="max-w-[92%] rounded-2xl rounded-bl-none bg-gray-900 border border-emerald-500/30 text-gray-200 text-sm leading-relaxed overflow-hidden shadow-[0_0_16px_rgba(16,185,129,0.12)]">
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
            📤 Mensagem para o Cliente
          </span>
        </div>
        <div className="px-3 py-2.5">
          <p className="whitespace-pre-line text-gray-300 text-xs leading-relaxed">{forwardText}</p>
        </div>
        <div className="px-3 pb-3">
          <button
            onClick={handleCopy}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95",
              copied
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md hover:scale-[1.02]"
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Mensagem Copiada!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar para WhatsApp
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      imageUrl: selectedImage || undefined,
    };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    removeImage();
    setIsLoading(true);

    try {
      const validMessages = newMessages.filter(
        (m) => (m.content && m.content.trim().length > 0) || m.imageUrl
      );
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: validMessages }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Status ${res.status}`);
      }
      if (!res.body) throw new Error("Sem Reader");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const assistMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, assistMsg]);

      let fullStreamDump = "";

      const processLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return "";

        // New Vercel AI SDK UIMessageStream Protocol (data: {...})
        if (trimmed.startsWith("data:")) {
          try {
            const parsed = JSON.parse(trimmed.slice(5).trim());
            if (parsed.type === "text-delta") {
              return parsed.delta || "";
            }
            if (parsed.type === "error") {
              return `\n⚠️ Erro do servidor: ${parsed.error}`;
            }
            return ""; // Ignore other types like start, finish, etc.
          } catch {
            return "";
          }
        }

        // Legacy Data Stream Protocol (0:"text")
        if (trimmed.startsWith("0:")) {
          try {
            return JSON.parse(trimmed.slice(2));
          } catch {
            return "";
          }
        }
        // 3: or e: = error from the SDK
        if (trimmed.startsWith("3:") || trimmed.startsWith("e:")) {
          try {
            const err = JSON.parse(trimmed.slice(2));
            return `\n⚠️ Erro do servidor/ferramenta: ${typeof err === "string" ? err : err.message || JSON.stringify(err)}`;
          } catch {
            return `\n⚠️ Erro do servidor: ${trimmed.slice(2)}`;
          }
        }
        // Known non-text prefixes (a-d, f, 1-2, 4-9): ignore silently
        if (/^[124-9a-df]:/.test(trimmed)) {
          return "";
        }
        // Plain text (no prefix) — return as-is
        return trimmed + "\n";
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          if (buffer.trim()) {
            fullStreamDump += buffer + "\n";
            const remaining = buffer.split("\n");
            let tail = "";
            for (const line of remaining) {
              tail += processLine(line);
            }
            if (tail) {
              assistMsg.content += tail;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistMsg.id ? { ...assistMsg } : m))
              );
            }
          }
          break;
        }

        const textChunk = decoder.decode(value, { stream: true });
        fullStreamDump += textChunk;
        buffer += textChunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let newText = "";
        for (const line of lines) {
          newText += processLine(line);
        }

        if (newText) {
          assistMsg.content += newText;
          setMessages((prev) => prev.map((m) => (m.id === assistMsg.id ? { ...assistMsg } : m)));
        }
      }

      // Clean up trailing newline
      assistMsg.content = assistMsg.content.replace(/\n+$/, "");

      if (assistMsg.content === "") {
        assistMsg.content = `[DEBUG] O modelo não gerou texto. Stream completo recebido:\n${fullStreamDump}\n(Fim do stream)`;
        setMessages((prev) => prev.map((m) => (m.id === assistMsg.id ? { ...assistMsg } : m)));
      }

      // ── Detecta URL de proposta e injeta balão de encaminhamento ──
      const proposalUrl = extractProposalUrl(assistMsg.content);
      if (proposalUrl) {
        const clientName = extractClientName(assistMsg.content);
        setTimeout(() => {
          const forwardMsg: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: "__forward_bubble__",
            proposalUrl,
            clientName: clientName ?? undefined,
          };
          setMessages((prev) => [...prev, forwardMsg]);
        }, 600);
      }
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Erro de comunicação: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle toggle event from topbar
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggle-ai-chat", handleToggle);
    return () => window.removeEventListener("toggle-ai-chat", handleToggle);
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed flex flex-col items-end bottom-6 right-6 z-[9999]">
      {/* Chat Window */}
      {isOpen && (
        <div className="flex flex-col bg-gray-950 border border-gray-800 shadow-[0_0_40px_rgba(16,185,129,0.15)] rounded-2xl w-[380px] h-[600px] max-h-[80vh] max-w-[calc(100vw-32px)] mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gray-900 border-b border-gray-800 p-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm leading-tight">EnergivIA</h3>
                <p className="text-emerald-400 text-[11px]">Assistente Inteligente</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="text-gray-400 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-800 flex items-center gap-1.5 text-xs font-medium"
                  title="Iniciar nova conversa / Limpar chat"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Novo</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-800"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-2 py-4 space-y-4 animate-in fade-in duration-300">
                <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="text-white font-medium text-sm">Assistente Solar EnergivIA</h4>
                  <p className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
                    Envie uma fatura para extrair o consumo e orçar nos distribuidores em segundos.
                  </p>
                </div>

                <div className="w-full space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/40 text-left transition-all group active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 shrink-0 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200 group-hover:text-emerald-300 transition-colors">
                        Enviar fatura de energia
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        Anexar PDF ou foto para ler consumo
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInput("Quero dimensionar um sistema para um consumo de 500 kWh/mês");
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/40 text-left transition-all group active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 shrink-0 transition-colors">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200 group-hover:text-emerald-300 transition-colors">
                        Dimensionar por consumo (kWh)
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        Digitar consumo mensal estimado
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setInput("Como funciona a compensação de créditos de energia solar?");
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/40 text-left transition-all group active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 shrink-0 transition-colors">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200 group-hover:text-emerald-300 transition-colors">
                        Dúvidas e regras solares
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        Inversores, regras e tributação
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {messages.map((m) => {
              // Balão especial de encaminhamento para o cliente
              if (m.content === "__forward_bubble__" && m.proposalUrl) {
                return (
                  <ForwardBubble key={m.id} proposalUrl={m.proposalUrl} clientName={m.clientName} />
                );
              }

              return (
                <div
                  key={m.id}
                  className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={clsx(
                      "max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-emerald-600 text-white rounded-br-none"
                        : "bg-gray-900 text-gray-200 rounded-bl-none border border-gray-800"
                    )}
                  >
                    {m.imageUrl &&
                      (m.imageUrl.startsWith("data:application/pdf") ? (
                        <div className="flex items-center gap-2 bg-emerald-700/50 p-2 rounded-lg mb-2">
                          <div className="w-8 h-8 flex items-center justify-center bg-emerald-600 rounded">
                            <span className="text-[10px] font-bold text-white">PDF</span>
                          </div>
                          <span className="text-xs text-emerald-100 font-medium">
                            Documento Anexado
                          </span>
                        </div>
                      ) : (
                        <img
                          src={m.imageUrl}
                          alt="Anexo"
                          className="w-full max-h-48 object-cover rounded-lg mb-2"
                        />
                      ))}
                    {/* Renderiza links como botões clicáveis */}
                    <span>{parseContent(m.content)}</span>
                  </div>
                </div>
              );
            })}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="bg-gray-900 border border-gray-800 text-gray-400 rounded-2xl rounded-bl-none p-4 flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0">
            {selectedImage && (
              <div className="mb-3 relative inline-block">
                {selectedImage.startsWith("data:application/pdf") ? (
                  <div className="flex items-center justify-center w-16 h-16 bg-gray-800 rounded border border-gray-700">
                    <span className="text-xs font-bold text-gray-400">PDF</span>
                  </div>
                ) : (
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="h-16 rounded border border-gray-700"
                  />
                )}
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-0.5 shadow hover:bg-gray-700"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 bg-gray-950 border border-gray-800 rounded-xl p-1.5 focus-within:border-emerald-500/50 transition-colors"
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.pdf,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-emerald-400 transition-colors rounded-lg hover:bg-gray-900 shrink-0"
                title="Anexar Fatura"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <textarea
                value={input}
                onChange={handleInputChange}
                placeholder="Ex: Dimensione um sistema para..."
                className="flex-1 max-h-32 min-h-[40px] bg-transparent text-sm text-white placeholder:text-gray-500 resize-none outline-none py-2.5 px-2"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() || selectedImage) {
                      e.currentTarget.form?.dispatchEvent(
                        new Event("submit", { cancelable: true, bubbles: true })
                      );
                    }
                  }
                }}
              />

              <button
                type="submit"
                disabled={isLoading || (!input.trim() && !selectedImage)}
                className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-[10px] text-gray-500 text-center mt-3">
              A inteligência artificial pode cometer erros.
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center animate-in zoom-in group"
        >
          <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
}
