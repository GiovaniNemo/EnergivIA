-- Idempotência: Meta reenvia o mesmo payload de mensagem (mesmo wamid).
CREATE TABLE "whatsapp_inbound_messages" (
    "wa_message_id" VARCHAR(512) NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_inbound_messages_pkey" PRIMARY KEY ("wa_message_id")
);

CREATE INDEX "whatsapp_inbound_messages_conversation_id_idx" ON "whatsapp_inbound_messages"("conversation_id");

ALTER TABLE "whatsapp_inbound_messages" ADD CONSTRAINT "whatsapp_inbound_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
