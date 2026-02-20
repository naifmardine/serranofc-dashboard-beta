export async function uploadImage(file: File) {
  // 1) pede assinatura ao backend
  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
  });

  if (!signRes.ok) {
    throw new Error("Erro ao gerar assinatura.");
  }

  const { timestamp, folder, signature, apiKey, cloudName } =
    await signRes.json();

  // 2) monta FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  // 3) envia para o Cloudinary
  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await uploadRes.json();

  if (!uploadRes.ok) {
    throw new Error(data?.error?.message || "Erro no upload.");
  }

  return {
    secureUrl: data.secure_url as string,
    publicId: data.public_id as string,
  };
}
