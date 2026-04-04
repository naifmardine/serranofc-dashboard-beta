"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadImage } from "@/lib/cloudinaryUpload";
import { useI18n } from "@/contexts/I18nContext";

type UploadResult = {
  secureUrl: string;
  publicId?: string;
};

type Props = {
  label?: string;
  helperText?: string;

  valueUrl?: string; // URL atual salva no form (ex: form.imagemUrl)
  disabled?: boolean;

  maxSizeMB?: number; // default 5
  accept?: string; // default image/png,image/jpeg

  onUploaded: (r: UploadResult) => void; // você seta imagemUrl no form aqui
  onClear?: () => void;

  className?: string;
};

const FALLBACK =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="%23eef2ff"/><path d="M7 16l3-3 2 2 3-3 2 2v2H7v-0z" fill="%23003399"/><circle cx="9" cy="9" r="1.5" fill="%23003399"/></svg>';

function formatMB(bytes: number) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2).replace(".", ",")} MB`;
}

function isAllowedType(t: string) {
  return t === "image/png" || t === "image/jpeg" || t === "image/jpg";
}

export default function ImageUploadButton({
  label,
  helperText,
  valueUrl,
  disabled,
  maxSizeMB = 5,
  accept = "image/png,image/jpeg",
  onUploaded,
  onClear,
  className,
}: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [localFile, setLocalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = useMemo(() => maxSizeMB * 1024 * 1024, [maxSizeMB]);

  useEffect(() => {
    if (!localFile) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(localFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  function openPicker() {
    if (disabled || uploading) return;
    setError(null);
    inputRef.current?.click();
  }

  async function handlePicked(file: File) {
    setError(null);

    if (!isAllowedType(file.type)) {
      setError(t.imageUpload.formatoInvalido);
      return;
    }
    if (file.size > maxBytes) {
      setError(`${t.imageUpload.arquivoGrande} Max: ${maxSizeMB} MB.`);
      return;
    }

    setLocalFile(file);

    try {
      setUploading(true);
      const up = await uploadImage(file); // <- sua função
      onUploaded({ secureUrl: up.secureUrl, publicId: up.publicId });
    } catch (e: any) {
      setError(e?.message || t.imageUpload.falhaUpload);
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    // permite selecionar o mesmo arquivo de novo
    e.target.value = "";
    void handlePicked(file);
  }

  function clear() {
    setError(null);
    setLocalFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  }

  const shownPreview = previewUrl || valueUrl || FALLBACK;

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">{label || t.imageUpload.fotoJogador}</div>
          <div className="text-xs text-gray-500">{helperText || t.imageUpload.helperText}</div>
        </div>

        <div className="flex items-center gap-2 flex-none">
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || uploading}
            className="rounded-lg bg-[#f2d249] px-3 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e2c23f] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? t.imageUpload.enviando : t.imageUpload.importarImagem}
          </button>

          <button
            type="button"
            onClick={clear}
            disabled={disabled || uploading || (!valueUrl && !localFile)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {t.imageUpload.limpar}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
        disabled={disabled || uploading}
      />

      <div className="mt-3 flex items-center gap-3">
        <div className="h-20 w-20 rounded-2xl border border-gray-200 bg-white overflow-hidden grid place-items-center flex-none">
          <img
            src={shownPreview}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = FALLBACK;
            }}
          />
        </div>

        <div className="min-w-0">
          {localFile ? (
            <>
              <div className="text-xs text-gray-500">{t.imageUpload.arquivoSelecionado}</div>
              <div className="text-sm text-gray-900 font-semibold truncate">{localFile.name}</div>
              <div className="text-xs text-gray-500">
                {localFile.type} • {formatMB(localFile.size)}
              </div>
            </>
          ) : valueUrl ? (
            <>
              <div className="text-xs text-gray-500">{t.imageUpload.imagemAtual}</div>
              <div className="text-sm text-gray-900 truncate">{valueUrl}</div>
            </>
          ) : (
            <div className="text-sm text-gray-500">{t.imageUpload.nenhumaImagem}</div>
          )}

          {error && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
