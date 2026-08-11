"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, X, Send, ImageIcon } from "lucide-react";
import clsx from "clsx";

type Message = {
    id: string;
    role: "user" | "assistant";
    content: string;
};

export function AIAssistantWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: newMessages })
            });

            if (!res.ok) throw new Error("API falhou");
            if (!res.body) throw new Error("Sem Reader");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            const assistMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: "" };
            setMessages((prev) => [...prev, assistMsg]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const textChunk = decoder.decode(value, { stream: true });
                assistMsg.content += textChunk;

                setMessages((prev) =>
                    prev.map((m) => m.id === assistMsg.id ? { ...assistMsg } : m)
                );
            }
        } catch (error) {
            console.error(error);
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

    return (
        <div className="fixed flex flex-col items-end bottom-6 right-6 z-[9999]">
            {/* Chat Window */}
            {isOpen && (
                <div className="flex flex-col bg-gray-950 border border-gray-800 shadow-[0_0_40px_rgba(16,185,129,0.15)] rounded-2xl w-[380px] h-[600px] max-h-[80vh] max-w-[calc(100vw-32px)] mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
                                <Bot className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-sm">EnergivIA</h3>
                                <p className="text-emerald-400 text-xs">Assistente Inteligente</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                                <Bot className="w-12 h-12 text-gray-500" />
                                <p className="text-sm text-gray-400">
                                    Olá! Sou sua assistente. Como posso ajudar com seus orçamentos ou leitura de faturas hoje?
                                </p>
                            </div>
                        )}

                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className={clsx(
                                    "flex",
                                    m.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={clsx(
                                        "max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed",
                                        m.role === "user"
                                            ? "bg-emerald-600 text-white rounded-br-none"
                                            : "bg-gray-900 text-gray-200 rounded-bl-none border border-gray-800"
                                    )}
                                >
                                    {m.content}
                                </div>
                            </div>
                        ))}

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
                        <form
                            onSubmit={handleSubmit}
                            className="flex items-end gap-2 bg-gray-950 border border-gray-800 rounded-xl p-1.5 focus-within:border-emerald-500/50 transition-colors"
                        >
                            <button
                                type="button"
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
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (input.trim()) {
                                            e.currentTarget.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                                        }
                                    }
                                }}
                            />

                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
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
