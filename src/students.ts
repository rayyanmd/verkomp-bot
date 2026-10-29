import type { Env } from "./discord";

export interface Student {
  student_id: string;
  name: string;
  class: string;
}

function parseCsv(text: string, delimiter: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function parse(csv: string): Map<string, Student> {
  const firstLine = csv.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";

  const [header, ...rows] = parseCsv(csv, delimiter);
  const idx = (name: string) =>
    header.findIndex((h) => h.trim().toLowerCase() === name);
  const iId = idx("student_id");
  const iName = idx("name");
  const iClass = idx("class");
  if (iId < 0 || iName < 0 || iClass < 0) {
    throw new Error("Header CSV harus: student_id,name,class");
  }

  const map = new Map<string, Student>();
  for (const r of rows) {
    const id = (r[iId] ?? "").trim();
    if (!id) continue;
    map.set(id, {
      student_id: id,
      name: (r[iName] ?? "").trim(),
      class: (r[iClass] ?? "").trim(),
    });
  }
  return map;
}

const KV_KEY = "data:students";
const CACHE_TTL_MS = 60_000;

let cache: { map: Map<string, Student>; at: number } | undefined;

export async function findStudent(
  env: Env,
  nim: string,
): Promise<Student | undefined> {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    const text = await env.VERIFIED.get(KV_KEY);
    if (!text)
      throw new Error(`Data mahasiswa belum diunggah ke KV (key "${KV_KEY}")`);
    cache = { map: parse(text), at: Date.now() };
  }
  return cache.map.get(nim.trim());
}
