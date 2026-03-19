import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { extractText } from "unpdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_TEXT_CHARS = 6000;
const MAX_CSV_ROWS = 200;

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

function trimText(text: string, maxChars = MAX_TEXT_CHARS): string {
  const normalized = text.replace(/\u0000/g, "").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars) + "\n\n[... conteúdo truncado ...]";
}

function csvToText(text: string): string {
  const lines = text
    .replace(/\uFEFF/g, "")
    .split(/\r?\n/)
    .slice(0, MAX_CSV_ROWS);

  return lines.join("\n").trim();
}

function isSpreadsheetMime(mimeType: string): boolean {
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  );
}

function isDocxMime(mimeType: string): boolean {
  return (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function isCsvMime(mimeType: string): boolean {
  return mimeType === "text/csv" || mimeType === "application/csv";
}

function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  const result = await extractText(uint8);
  return (
    Array.isArray(result?.text) ? result.text.join("\n") : (result?.text ?? "")
  ).trim();
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await mammoth.extractRawText({ buffer });
  return (result.value ?? "").trim();
}

async function extractXlsxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const csv = XLSX.utils.sheet_to_csv(sheet);
    const limited = csv.split("\n").slice(0, MAX_CSV_ROWS).join("\n").trim();

    if (limited) {
      parts.push(`# Aba: ${sheetName}`);
      parts.push(limited);
    }
  }

  return parts.join("\n\n").trim();
}

async function extractPlainText(file: File): Promise<string> {
  return (await file.text()).trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 },
      );
    }

    const fileObj = file as File;
    const name = fileObj.name || "arquivo";
    const mimeType = fileObj.type || "";
    const ext = name.split(".").pop()?.toLowerCase() ?? "";

    if (fileObj.size === 0) {
      return NextResponse.json(
        { error: "O arquivo enviado está vazio." },
        { status: 400 },
      );
    }

    if (fileObj.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Máximo: 2 MB." },
        { status: 413 },
      );
    }

    if (IMAGE_EXTS.has(ext) || mimeType.startsWith("image/")) {
      return NextResponse.json({
        filename: name,
        mimeType,
        extractedText: "",
        charCount: 0,
        isImage: true,
      });
    }

    let extractedText = "";

    if (ext === "pdf" || isPdfMime(mimeType)) {
      try {
        extractedText = await extractPdfText(fileObj);
      } catch (err) {
        console.error("PDF extraction error:", err);
        return NextResponse.json(
          { error: "Não foi possível extrair texto do PDF." },
          { status: 422 },
        );
      }
    } else if (ext === "docx" || isDocxMime(mimeType)) {
      try {
        extractedText = await extractDocxText(fileObj);
      } catch (err) {
        console.error("DOCX extraction error:", err);
        return NextResponse.json(
          { error: "Não foi possível extrair texto do DOCX." },
          { status: 422 },
        );
      }
    } else if (ext === "xlsx" || isSpreadsheetMime(mimeType)) {
      try {
        extractedText = await extractXlsxText(fileObj);
      } catch (err) {
        console.error("XLSX extraction error:", err);
        return NextResponse.json(
          { error: "Não foi possível extrair texto do XLSX." },
          { status: 422 },
        );
      }
    } else if (ext === "csv" || isCsvMime(mimeType)) {
      const raw = await fileObj.text();
      extractedText = csvToText(raw);
    } else {
      // txt, md, json, etc.
      try {
        extractedText = await extractPlainText(fileObj);
      } catch (err) {
        console.error("Text extraction error:", err);
        return NextResponse.json(
          { error: "Não foi possível ler o arquivo enviado." },
          { status: 422 },
        );
      }
    }

    extractedText = trimText(extractedText);

    return NextResponse.json({
      filename: name,
      mimeType,
      extractedText,
      charCount: extractedText.length,
      isImage: false,
    });
  } catch (err) {
    console.error("POST /api/chatbot/upload error:", err);
    return NextResponse.json(
      { error: "Erro ao processar arquivo." },
      { status: 500 },
    );
  }
}
