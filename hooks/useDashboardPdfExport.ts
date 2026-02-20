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

  // não cortar card/row (marque os blocos com data-pdf-block="true")
  blockSelector?: string;

  // header/footer (por página)
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

type ImgSize = { w: number; h: number };

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

const SERRANO_BLUE = "#003399";
const SERRANO_YELLOW = "#F2CD00";

/**
 * Causa real do “último item cortado”:
 * - NÃO é o page break.
 * - É o html-to-image capturando o node com altura efetiva menor (client rect / overflow),
 *   então o PNG já nasce “curto” no fim — daí a última row/card fica truncada.
 *
 * Correção: durante o toPng, forçar:
 * - height/width explícitos (scrollHeight/scrollWidth)
 * - overflow visível
 * - um padding-bottom extra só no snapshot (não mexe na UI)
 *
 * Ajuste fino: EXPORT_BOTTOM_PAD_PX
 */
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

        // reserva fixa no layout do PDF (mm)
        const headerMm = header ? 12 : 0;
        const footerMm = footer ? 10 : 0;

        // ===== tweak knobs (onde você mexe fino) =====
        const CUT_PAD_PX = 44; // respiro entre páginas (anti “comer padding” no seam)
        const PAGE_GUARD_PX = 10; // não quebrar colado no fim
        const EPS_PX = 0;
        const MIN_ADVANCE_PX = 60;

        // >>> ESTE É O AJUSTE DO “ÚLTIMO DO ÚLTIMO” <<<
        // aumenta para 72/96 se ainda truncar 1-2px no final.
        const EXPORT_BOTTOM_PAD_PX = 72;

        // ===== 1) quebra segura por blocos (DOM px) =====
        const primarySelector = params?.blockSelector ?? `[data-pdf-block="true"]`;
        let blocks = Array.from(el.querySelectorAll(primarySelector)) as HTMLElement[];

        if (blocks.length < 2) {
          const fallback = Array.from(
            el.querySelectorAll("tr[data-pdf-block], tr, article, [data-card]"),
          ) as HTMLElement[];
          blocks = fallback.filter((node) => el.contains(node) && node.offsetParent !== null);
        }

        const containerRect = el.getBoundingClientRect();

        const bottomsDom = blocks
          .map((b) => {
            const r = b.getBoundingClientRect();
            const bottomRel = r.bottom - containerRect.top;
            return Math.max(0, Math.round(bottomRel));
          })
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => a - b);

        const uniqBottomsDom: number[] = [];
        for (const y of bottomsDom) {
          const last = uniqBottomsDom[uniqBottomsDom.length - 1];
          if (last == null || Math.abs(y - last) > 2) uniqBottomsDom.push(y);
        }

        // ===== 2) DOM -> PNG (fixando a causa do truncamento) =====
        // Força dimensões reais do conteúdo exportável.
        // (Se existir qualquer overflow/scroll interno, isso evita “cortar” o final no PNG)
        const exportW = Math.max(1, el.scrollWidth || el.clientWidth);
        const exportH = Math.max(1, el.scrollHeight || el.clientHeight);

        const png = await toPng(el, {
          cacheBust: true,
          backgroundColor: "#ffffff",
          pixelRatio: scale,

          // CRÍTICO: capturar o conteúdo inteiro
          width: exportW,
          height: exportH + EXPORT_BOTTOM_PAD_PX,

          // CRÍTICO: neutraliza overflow/limites só no snapshot
          style: {
            overflow: "visible",
            maxHeight: "none",
            height: `${exportH + EXPORT_BOTTOM_PAD_PX}px`,
            width: `${exportW}px`,
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

        // DOM px -> IMG px
        const domHeight = Math.max(1, exportH + EXPORT_BOTTOM_PAD_PX);
        const scaleY = imgSize.h / domHeight;

        const bottomsImg = uniqBottomsDom
          .map((y) => Math.round(y * scaleY))
          .filter((y) => y > 0 && y < imgSize.h)
          .sort((a, b) => a - b);

        // ===== 3) PDF + paginação por slices =====
        const pdf = new jsPDF({ orientation, unit: "mm", format });

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        const usableW = pageW - marginMm * 2;
        const usableH = pageH - marginMm * 2 - headerMm - footerMm;

        const imgWmm = usableW;
        const pxPerMm = imgSize.w / imgWmm;
        const pagePxH = Math.floor(usableH * pxPerMm) - 1;

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

        const slices: Array<{ dataUrl: string; sliceH: number }> = [];

        let y = 0;

        while (y < imgSize.h - 2) {
          const remaining = imgSize.h - y;

          // última fatia: pega o resto completo (sem inventar regra)
          if (remaining <= pagePxH + EPS_PX) {
            const sliceH = remaining;

            canvas.width = imgSize.w;
            canvas.height = sliceH;

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, y, imgSize.w, sliceH, 0, 0, imgSize.w, sliceH);

            slices.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), sliceH });
            break;
          }

          const pageEnd = Math.min(imgSize.h, y + pagePxH);

          const safeLimit = Math.max(y + 1, pageEnd - PAGE_GUARD_PX - CUT_PAD_PX);

          let cut = 0;
          for (let i = bottomsImg.length - 1; i >= 0; i--) {
            const b = bottomsImg[i];
            if (b > y + 8 && b <= safeLimit + EPS_PX) {
              cut = b;
              break;
            }
          }

          let cutY = cut > 0 ? cut + CUT_PAD_PX : pageEnd;
          cutY = Math.min(cutY, pageEnd);

          if (cutY <= y + MIN_ADVANCE_PX) {
            cutY = Math.min(imgSize.h, y + pagePxH);
          }

          const sliceH = cutY - y;

          canvas.width = imgSize.w;
          canvas.height = sliceH;

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(img, 0, y, imgSize.w, sliceH, 0, 0, imgSize.w, sliceH);

          slices.push({ dataUrl: canvas.toDataURL("image/jpeg", 0.92), sliceH });

          y = cutY;
        }

        const totalPages = slices.length;

        for (let i = 0; i < slices.length; i++) {
          if (i > 0) pdf.addPage();

          drawHeaderFooter(i + 1, totalPages);

          const xMm = marginMm;
          const yMm = marginMm + headerMm;

          const wMm = imgWmm;
          const hMm = (slices[i].sliceH * imgWmm) / imgSize.w;

          pdf.addImage(slices[i].dataUrl, "JPEG", xMm, yMm, wMm, hMm, undefined, "FAST");
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
    [exporting],
  );

  return { exportRef, exportPdf, exporting, error };
}