-- Token rotativo do link público da proposta (null = legado, id funciona como token)
ALTER TABLE "Proposal" ADD COLUMN "public_token" TEXT;

CREATE UNIQUE INDEX "Proposal_public_token_key" ON "Proposal"("public_token");
