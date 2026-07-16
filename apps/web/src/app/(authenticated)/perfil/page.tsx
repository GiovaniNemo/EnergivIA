"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { useOrganization } from "@/components/providers/organization-provider";
import { updateMyProfile, uploadUserAvatar } from "@/lib/organizations-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageDropzone } from "@/components/ui/image-dropzone";
import { LoadingState } from "@/components/ui/loading-state";

export default function ProfilePage(): JSX.Element {
  const { user, loading, refetch } = useOrganization();

  const [name, setName] = useState("");
  const [picture, setPicture] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPicture(user.picture ?? "");
    }
  }, [user]);

  if (loading && !user) {
    return <LoadingState fullScreen label="Carregando perfil" />;
  }

  const dirty =
    Boolean(user) && (name.trim() !== (user?.name ?? "") || picture !== (user?.picture ?? ""));

  async function handleSelectFile(file: File): Promise<void> {
    setError(null);
    setSaved(false);
    setUploading(true);
    try {
      const url = await uploadUserAvatar(file);
      setPicture(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar o avatar.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(): Promise<void> {
    if (!name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    const words = name.trim().split(/\s+/);
    if (words.length < 2) {
      setError("Informe nome e sobrenome.");
      return;
    }
    const normalizedName = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    setError(null);
    setSaving(true);
    try {
      await updateMyProfile({ name: normalizedName, picture: picture || null });
      await refetch();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-foreground)]">Meu perfil</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Como você aparece para a sua equipe e nas propostas.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="w-full sm:w-56">
            <ImageDropzone
              label="Foto do perfil"
              value={picture}
              onSelectFile={handleSelectFile}
              onClear={() => {
                setPicture("");
                setSaved(false);
              }}
              isUploading={uploading}
              accept="image/jpeg,image/png,image/webp"
              helperText="JPG, PNG ou WEBP"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              <label
                htmlFor="profile-name"
                className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
              >
                Nome
              </label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
                placeholder="Seu nome completo"
                maxLength={120}
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="mb-1 block text-sm font-medium text-[var(--color-foreground)]"
              >
                E-mail
              </label>
              <Input id="profile-email" value={user?.email ?? ""} disabled readOnly />
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                O e-mail é o do seu login e não pode ser alterado aqui.
              </p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}
        {saved && !dirty ? (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            Perfil atualizado.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || uploading || !dirty}
          >
            {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </div>
    </div>
  );
}
