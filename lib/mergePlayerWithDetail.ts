import type { Jogador } from "@/type/jogador";

export function mergePlayerWithDetail(
  base: Jogador,
  extra?: Partial<Jogador>
) {
  if (!extra) return { ...base };

  return {
    ...base,
    ...extra,
  };
}
