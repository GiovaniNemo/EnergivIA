-- CreateEnum
CREATE TYPE "WhatsappAudioTranscriptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_audio_transcription_jobs" (
    "id" TEXT NOT NULL,
    "wa_message_id" VARCHAR(512) NOT NULL,
    "organization_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "customer_wa_id" TEXT NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "media_mime_type" TEXT NOT NULL,
    "audio_file_url" TEXT NOT NULL,
    "audio_file_key" TEXT NOT NULL,
    "audio_file_name" TEXT NOT NULL,
    "audio_file_size" INTEGER NOT NULL,
    "transcript_text" TEXT,
    "error_message" TEXT,
    "status" "WhatsappAudioTranscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_audio_transcription_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_audio_transcription_jobs_wa_message_id_key" ON "whatsapp_audio_transcription_jobs"("wa_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_audio_transcription_jobs_status_created_at_idx" ON "whatsapp_audio_transcription_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "whatsapp_audio_transcription_jobs_conversation_id_idx" ON "whatsapp_audio_transcription_jobs"("conversation_id");

-- CreateIndex
CREATE INDEX "whatsapp_audio_transcription_jobs_organization_id_idx" ON "whatsapp_audio_transcription_jobs"("organization_id");

-- AddForeignKey
ALTER TABLE "whatsapp_audio_transcription_jobs" ADD CONSTRAINT "whatsapp_audio_transcription_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_audio_transcription_jobs" ADD CONSTRAINT "whatsapp_audio_transcription_jobs_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
