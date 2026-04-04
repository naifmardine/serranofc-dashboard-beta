/**
 * Auto-translate locales using Google Translate (google-translate-api-x).
 *
 * PT is the source of truth. EN and ES are generated from it.
 *
 * Usage: npm run translate
 */

import fs from "fs";
import path from "path";
import translate from "google-translate-api-x";

const LOCALES_DIR = path.resolve(__dirname, "..", "locales");
const PT_FILE = path.join(LOCALES_DIR, "pt.ts");

const TARGETS: Array<{ locale: string; lang: string; code: string; file: string }> = [
  { locale: "en", lang: "English", code: "en", file: path.join(LOCALES_DIR, "en.ts") },
  { locale: "es", lang: "Spanish", code: "es", file: path.join(LOCALES_DIR, "es.ts") },
];

const DO_NOT_TRANSLATE = [
  "Serrano FC",
  "Serrano Football Club",
  "Serrano.AI",
  "Serrano AI",
  "CPF",
  "PDF",
  "CSV",
  "YouTube",
  "Instagram",
  "Twitter",
  "Cloudinary",
  "FastAPI",
  "Next",
  "OpenAI",
  "Admin",
  "Dashboard",
  "UF",
  "UE",
  "EUR",
  "ROI",
  "URL",
  "BASE_URL",
  "DD/MM/YYYY",
  "YYYY-MM-DD",
];

function readPtSource(): string {
  return fs.readFileSync(PT_FILE, "utf-8");
}

/**
 * Extract all string values from the TS object literal.
 * Returns a flat map: "nav.perfil" -> "Perfil"
 */
function extractStrings(source: string): Map<string, string> {
  const map = new Map<string, string>();
  let currentSection = "";

  for (const line of source.split("\n")) {
    const sectionMatch = line.match(/^\s+(\w+)\s*:\s*\{/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    if (currentSection && /^\s+\},?\s*$/.test(line)) {
      currentSection = "";
      continue;
    }

    if (currentSection) {
      const kvMatch = line.match(/^\s+(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/);
      if (kvMatch) {
        map.set(`${currentSection}.${kvMatch[1]}`, kvMatch[2]);
      }
    } else {
      const kvMatch = line.match(/^\s+(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"\s*,?\s*$/);
      if (kvMatch) {
        map.set(`_top.${kvMatch[1]}`, kvMatch[2]);
      }
    }
  }

  return map;
}

/**
 * Protect DO_NOT_TRANSLATE terms by wrapping in markers
 */
function protect(text: string): string {
  let result = text;
  for (let i = 0; i < DO_NOT_TRANSLATE.length; i++) {
    const term = DO_NOT_TRANSLATE[i];
    const marker = `⟦${i}⟧`;
    result = result.split(term).join(marker);
  }
  return result;
}

function unprotect(text: string): string {
  let result = text;
  for (let i = 0; i < DO_NOT_TRANSLATE.length; i++) {
    const marker = `⟦${i}⟧`;
    // Google Translate sometimes adds spaces around markers
    const markerRe = new RegExp(`⟦\\s*${i}\\s*⟧`, "g");
    result = result.replace(markerRe, DO_NOT_TRANSLATE[i]);
  }
  return result;
}

/**
 * Translate a batch of strings via Google Translate
 */
async function translateBatch(
  strings: string[],
  targetLang: string,
  retries = 3,
): Promise<string[]> {
  // Protect terms that shouldn't be translated
  const protected_ = strings.map(protect);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const results = await translate(protected_, { from: "pt", to: targetLang });
      const resultArray = Array.isArray(results) ? results : [results];

      return resultArray.map((r: any) => {
        const translated = typeof r === "string" ? r : r.text;
        return unprotect(translated);
      });
    } catch (err: any) {
      console.error(`  ✗ Attempt ${attempt}/${retries}: ${err?.message}`);
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`  Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }

  throw new Error("Unreachable");
}

/**
 * Build the translated .ts file by replacing values in the PT source
 */
function buildTranslatedFile(
  ptSource: string,
  locale: string,
  translations: Map<string, string>,
): string {
  let output = ptSource;

  output = output.replace(/^const pt:/m, `const ${locale}:`);
  output = output.replace(/export default pt;/, `export default ${locale};`);

  let currentSection = "";
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const sectionMatch = line.match(/^\s+(\w+)\s*:\s*\{/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    if (currentSection && /^\s+\},?\s*$/.test(line)) {
      currentSection = "";
      continue;
    }

    if (currentSection) {
      const kvMatch = line.match(/^(\s+)(\w+)(\s*:\s*)"((?:[^"\\]|\\.)*)"(\s*,?\s*)$/);
      if (kvMatch) {
        const fullKey = `${currentSection}.${kvMatch[2]}`;
        const translated = translations.get(fullKey);
        if (translated !== undefined) {
          const escaped = translated.replace(/(?<!\\)"/g, '\\"');
          lines[i] = `${kvMatch[1]}${kvMatch[2]}${kvMatch[3]}"${escaped}"${kvMatch[5]}`;
        }
      }
    } else {
      const kvMatch = line.match(/^(\s+)(\w+)(\s*:\s*)"((?:[^"\\]|\\.)*)"(\s*,?\s*)$/);
      if (kvMatch) {
        const fullKey = `_top.${kvMatch[2]}`;
        const translated = translations.get(fullKey);
        if (translated !== undefined) {
          const escaped = translated.replace(/(?<!\\)"/g, '\\"');
          lines[i] = `${kvMatch[1]}${kvMatch[2]}${kvMatch[3]}"${escaped}"${kvMatch[5]}`;
        }
      }
    }
  }

  return lines.join("\n");
}

async function main() {
  console.log("🌐 Auto-translating locales from PT (Google Translate)...\n");

  const ptSource = readPtSource();
  const strings = extractStrings(ptSource);

  console.log(`Found ${strings.size} strings.\n`);

  const allKeys = Array.from(strings.keys());
  const allValues = Array.from(strings.values());

  for (const target of TARGETS) {
    console.log(`\n📝 Translating to ${target.lang} (${target.locale})...`);

    // Batch in chunks of 50 to avoid rate limits
    const CHUNK_SIZE = 50;
    const translatedValues: string[] = [];

    for (let i = 0; i < allValues.length; i += CHUNK_SIZE) {
      const chunk = allValues.slice(i, i + CHUNK_SIZE);
      const chunkEnd = Math.min(i + CHUNK_SIZE, allValues.length);
      process.stdout.write(`  Translating ${i + 1}-${chunkEnd} of ${allValues.length}... `);

      const translated = await translateBatch(chunk, target.code);
      translatedValues.push(...translated);
      console.log("✓");

      // Small delay between chunks to be nice to Google
      if (i + CHUNK_SIZE < allValues.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Build the translations map
    const translationsMap = new Map<string, string>();
    for (let i = 0; i < allKeys.length; i++) {
      translationsMap.set(allKeys[i], translatedValues[i]);
    }

    const translatedFile = buildTranslatedFile(ptSource, target.locale, translationsMap);
    fs.writeFileSync(target.file, translatedFile, "utf-8");
    console.log(`  ✓ Written ${target.file}`);
  }

  console.log("\n✅ Done! EN and ES locale files have been generated.\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
