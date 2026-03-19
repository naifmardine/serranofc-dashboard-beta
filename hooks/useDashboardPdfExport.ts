"use client";

import { useCallback, useRef, useState } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

type ExportPdfParams = {
  filename?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "letter";
  marginMm?: number;
  scale?: number;

  // marque blocos com data-pdf-block="true" quando quiser sugerir pontos de quebra
  blockSelector?: string;

  header?: {
    title: string;
    subtitle?: string;
    rightText?: string;
  };
  footer?: {
    leftText?: string;
    rightText?: string;
  };
};

type ImgSize = { w: number; h: number };

const SERRANO_BLUE = "#003399";
const SERRANO_YELLOW = "#F2CD00";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;

  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function isRenderableElement(node: HTMLElement, root: HTMLElement) {
  if (!root.contains(node)) return false;
  if (node.dataset?.noExport === "true") return false;
  if (node.offsetParent === null) return false;

  const rect = node.getBoundingClientRect();
  return rect.height > 0 && rect.width > 0;
}

function uniqueElements(nodes: HTMLElement[]) {
  return Array.from(new Set(nodes));
}

export function useDashboardPdfExport() {
  const exportRef = useRef<HTMLDivElement | null>(null);

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportPdf = useCallback(
    async (params?: ExportPdfParams) => {
      const el = exportRef.current;
      if (!el) {
        setError("Escopo de export não encontrado (exportRef vazio).");
        return;
      }
      if (exporting) return;

      setExporting(true);
      setError(null);
      document.body.dataset.exporting = "true";

      try {
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const filename = params?.filename ?? `export-${todayIso()}.pdf`;
        const marginMm = params?.marginMm ?? 8;
        const scale = params?.scale ?? 2;
        const orientation = params?.orientation ?? "portrait";
        const format = params?.format ?? "a4";

        const header = params?.header;
        const footer = params?.footer;

        const headerMm = header ? 12 : 0;
        const footerMm = footer ? 10 : 0;

        // knobs
        const CUT_PAD_PX = 44;
        const PAGE_GUARD_PX = 10;
        const EPS_PX = 0;
        const MIN_ADVANCE_PX = 60;
        const EXPORT_BOTTOM_PAD_PX = 72;

        // só usa corte inteligente se o corte não cair cedo demais na página
        const MIN_SMART_CUT_COVERAGE = 0.45;

        const exportW = Math.max(1, el.scrollWidth || el.clientWidth);
        const exportH = Math.max(1, el.scrollHeight || el.clientHeight);

        // ===== 1) descobrir pontos de quebra =====
        const primarySelector = params?.blockSelector ?? `[data-pdf-block="true"]`;

        let blocks = Array.from(
          el.querySelectorAll(primarySelector)
        ) as HTMLElement[];

        blocks = blocks.filter((node) => isRenderableElement(node, el));

        // Para relatórios, normalmente existem poucos blocos grandes.
        // Se houver poucos, enriquecemos com elementos textuais para achar quebras melhores.
        if (blocks.length < 4) {
          const textFlowBlocks = Array.from(
            el.querySelectorAll(
              [
                "h1",
                "h2",
                "h3",
                "h4",
                "p",
                "li",
                "table",
                "blockquote",
                "pre",
                "hr",
              ].join(",")
            )
          ) as HTMLElement[];

          blocks = uniqueElements([...blocks, ...textFlowBlocks]).filter((node) =>
            isRenderableElement(node, el)
          );
        }

        // fallback genérico, bom para dashboards/tabelas/cartões
        if (blocks.length < 2) {
          const fallback = Array.from(
            el.querySelectorAll(
              "tr[data-pdf-block], tr, article, [data-card], section, .card"
            )
          ) as HTMLElement[];

          blocks = fallback.filter((node) => isRenderableElement(node, el));
        }

        const containerRect = el.getBoundingClientRect();

        // coleta tops E bottoms de cada bloco — tops são usados como fallback de corte
        const posEntries = blocks
          .map((b) => {
            const r = b.getBoundingClientRect();
            return {
              top: Math.max(0, Math.round(r.top - containerRect.top)),
              bottom: Math.max(0, Math.round(r.bottom - containerRect.top)),
            };
          })
          .filter(({ bottom }) => Number.isFinite(bottom) && bottom > 0 && bottom <= exportH + 2);

        const rawBottoms = posEntries.map((e) => e.bottom).sort((a, b) => a - b);
        const uniqBottomsDom: number[] = [];
        for (const y of rawBottoms) {
          const last = uniqBottomsDom[uniqBottomsDom.length - 1];
          if (last == null || Math.abs(y - last) > 2) uniqBottomsDom.push(y);
        }

        const rawTops = posEntries
          .map((e) => e.top)
          .filter((t) => t > 0)
          .sort((a, b) => a - b);
        const uniqTopsDom: number[] = [];
        for (const y of rawTops) {
          const last = uniqTopsDom[uniqTopsDom.length - 1];
          if (last == null || Math.abs(y - last) > 2) uniqTopsDom.push(y);
        }

        // ===== 2) gerar PNG do conteúdo inteiro =====
        const png = await toPng(el, {
          cacheBust: true,
          backgroundColor: "#ffffff",
          pixelRatio: scale,
          width: exportW,
          height: exportH + EXPORT_BOTTOM_PAD_PX,
          style: {
            overflow: "visible",
            maxHeight: "none",
            width: `${exportW}px`,
            height: `${exportH + EXPORT_BOTTOM_PAD_PX}px`,
            paddingBottom: `${EXPORT_BOTTOM_PAD_PX}px`,
          },
          filter: (node) => {
            if (!(node instanceof HTMLElement)) return true;
            if (node.dataset?.noExport === "true") return false;
            return true;
          },
        });

        const img = await loadImage(png);
        const imgSize: ImgSize = { w: img.naturalWidth, h: img.naturalHeight };

        // DOM -> PNG scale
        const domSnapshotH = exportH + EXPORT_BOTTOM_PAD_PX;
        const scaleY = imgSize.h / domSnapshotH;

        // fim real do conteúdo: ignora o padding artificial na paginação
        const contentBottomDom = Math.max(
          exportH,
          uniqBottomsDom[uniqBottomsDom.length - 1] ?? 0
        );
        const contentBottomImg = Math.min(
          imgSize.h,
          Math.round(contentBottomDom * scaleY)
        );

        const bottomsImg = uniqBottomsDom
          .map((y) => Math.round(y * scaleY))
          .filter((y) => y > 0 && y < contentBottomImg)
          .sort((a, b) => a - b);

        // tops em coordenadas de imagem (fallback para corte antes do elemento)
        const topsImg = uniqTopsDom
          .map((y) => Math.round(y * scaleY))
          .filter((y) => y > 0 && y < contentBottomImg)
          .sort((a, b) => a - b);

        // ===== 3) preparar PDF =====
        const pdf = new jsPDF({ orientation, unit: "mm", format });

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        const usableW = pageW - marginMm * 2;
        const usableH = pageH - marginMm * 2 - headerMm - footerMm;

        const imgWmm = usableW;
        const pxPerMm = imgSize.w / imgWmm;
        const pagePxH = Math.max(1, Math.floor(usableH * pxPerMm) - 1);

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D indisponível.");

        const blue = hexToRgb(SERRANO_BLUE);
        const yellow = hexToRgb(SERRANO_YELLOW);

        const drawHeaderFooter = (pageIndex1: number, totalPages: number) => {
          if (header) {
            const topY = marginMm;

            pdf.setFillColor(blue.r, blue.g, blue.b);
            pdf.rect(marginMm, topY, usableW, 0.8, "F");

            pdf.setTextColor(15, 23, 42);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(12);
            pdf.text(header.title, marginMm, topY + 6);

            if (header.subtitle) {
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(9);
              pdf.setTextColor(100, 116, 139);
              pdf.text(header.subtitle, marginMm, topY + 10.2);
            }

            if (header.rightText) {
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(9);
              pdf.setTextColor(100, 116, 139);
              pdf.text(header.rightText, pageW - marginMm, topY + 6, {
                align: "right",
              });
            }

            pdf.setFillColor(yellow.r, yellow.g, yellow.b);
            pdf.rect(marginMm, topY + 0.8, 18, 0.9, "F");
          }

          if (footer) {
            const lineY = pageH - marginMm - footerMm;

            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.2);
            pdf.line(marginMm, lineY, pageW - marginMm, lineY);

            const bottomY = lineY + 6.5;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139);

            const left = footer.leftText ?? "Serrano FC";
            pdf.text(left, marginMm, bottomY);

            const pageLabel = `Página ${pageIndex1} de ${totalPages}`;
            pdf.text(pageLabel, pageW - marginMm, bottomY, { align: "right" });

            if (footer.rightText) {
              pdf.setFont("helvetica", "bold");
              pdf.text(footer.rightText, pageW - marginMm, bottomY - 4.3, {
                align: "right",
              });
            }
          }
        };

        // ===== 4) fatiar imagem =====
        const slices: Array<{ dataUrl: string; sliceH: number }> = [];
        let y = 0;

        while (y < contentBottomImg - 2) {
          const remaining = contentBottomImg - y;

          if (remaining <= pagePxH + EPS_PX) {
            const sliceH = remaining;

            canvas.width = imgSize.w;
            canvas.height = sliceH;

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, y, imgSize.w, sliceH, 0, 0, imgSize.w, sliceH);

            slices.push({
              dataUrl: canvas.toDataURL("image/jpeg", 0.92),
              sliceH,
            });
            break;
          }

          const pageEnd = Math.min(contentBottomImg, y + pagePxH);
          const safeLimit = Math.max(y + 1, pageEnd - PAGE_GUARD_PX - CUT_PAD_PX);
          const minSmartCutY = y + Math.floor(pagePxH * MIN_SMART_CUT_COVERAGE);

          let cut = 0;

          // Estratégia 1: corta após o bottom de um elemento (comportamento original)
          for (let i = bottomsImg.length - 1; i >= 0; i--) {
            const b = bottomsImg[i];
            if (b > minSmartCutY && b <= safeLimit + EPS_PX) {
              cut = b;
              break;
            }
          }

          const BEFORE_TOP_PAD = 6;
          let cutY: number;

          if (cut > 0) {
            // Estratégia 1: bottom encontrado. Refina o corte usando o top do próximo
            // elemento após `cut`, para garantir que o corte cai no espaço em branco
            // ENTRE elementos e não dentro de uma linha de texto.
            let refined = cut + CUT_PAD_PX; // fallback caso não ache próximo top
            for (let i = 0; i < topsImg.length; i++) {
              const t = topsImg[i];
              if (t > cut) {
                const candidate = t - BEFORE_TOP_PAD;
                if (candidate > cut && candidate <= pageEnd - PAGE_GUARD_PX) {
                  refined = candidate;
                }
                break;
              }
            }
            cutY = Math.min(refined, pageEnd);
          } else {
            // Estratégia 2 (fallback para prosa/relatórios): corta logo ANTES do próximo
            // elemento começar quando nenhum bottom cai na janela segura.
            cutY = pageEnd;
            for (let i = topsImg.length - 1; i >= 0; i--) {
              const t = topsImg[i];
              if (t <= y) break; // sorted asc; todos os anteriores também estão abaixo de y
              const candidate = t - BEFORE_TOP_PAD;
              if (candidate > y + MIN_ADVANCE_PX && candidate < pageEnd - PAGE_GUARD_PX) {
                cutY = candidate;
                break;
              }
            }
          }

          if (cutY <= y + MIN_ADVANCE_PX) {
            cutY = Math.min(contentBottomImg, y + pagePxH);
          }

          const sliceH = cutY - y;

          canvas.width = imgSize.w;
          canvas.height = sliceH;

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, y, imgSize.w, sliceH, 0, 0, imgSize.w, sliceH);

          slices.push({
            dataUrl: canvas.toDataURL("image/jpeg", 0.92),
            sliceH,
          });

          y = cutY;
        }

        // segurança extra: evita salvar PDF vazio
        if (slices.length === 0) {
          throw new Error("Nenhuma página foi gerada para o PDF.");
        }

        const totalPages = slices.length;

        for (let i = 0; i < slices.length; i++) {
          if (i > 0) pdf.addPage();

          drawHeaderFooter(i + 1, totalPages);

          const xMm = marginMm;
          const yMm = marginMm + headerMm;
          const wMm = imgWmm;
          const hMm = (slices[i].sliceH * imgWmm) / imgSize.w;

          pdf.addImage(
            slices[i].dataUrl,
            "JPEG",
            xMm,
            yMm,
            wMm,
            hMm,
            undefined,
            "FAST"
          );
        }

        pdf.save(filename);
      } catch (e: any) {
        setError(e?.message ?? "Falha ao gerar PDF.");
        throw e;
      } finally {
        delete document.body.dataset.exporting;
        setExporting(false);
      }
    },
    [exporting]
  );

  return { exportRef, exportPdf, exporting, error };
}