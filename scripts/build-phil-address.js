/* scripts/build-phil-address.js
 *
 * Usage:
 *   node scripts/build-phil-address.js
 *   SKIP_BRGY=1 node scripts/build-phil-address.js        # only provinces + cities (faster)
 *   CONCURRENCY=8 node scripts/build-phil-address.js      # tweak barangay fetch concurrency
 *
 * Outputs:
 *   src/data/phil/provinces.min.json
 *   src/data/phil/cities.min.json
 *   src/data/phil/brgy/by-city/<cityCode>.json
 */
import fs from "fs/promises";
import path from "path";

const BASE = "https://psgc.gitlab.io/api";
const OUT_DIR = path.join(process.cwd(), "src", "data", "phil");
const BRGY_DIR = path.join(OUT_DIR, "brgy", "by-city");

const SKIP_BRGY = process.env.SKIP_BRGY === "1";
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);

// Node 18+ has global fetch
async function fetchJSON(url, { retries = 4, baseDelay = 500 } = {}) {
  let attempt = 0;
  let err;
  while (attempt <= retries) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const e = new Error(`HTTP ${res.status} for ${url} :: ${text.slice(0, 200)}`);
        e.status = res.status;
        throw e;
      }
      return res.json();
    } catch (e) {
      err = e;
      const status = e && e.status;
      const transient = status === 429 || (status >= 500 && status <= 599) || !status;
      if (attempt < retries && transient) {
        const backoff = baseDelay * 2 ** attempt + Math.floor(Math.random() * 250);
        console.warn(`[retry] ${url} (attempt ${attempt + 1}/${retries + 1}) -> waiting ${backoff}ms`);
        await sleep(backoff);
        attempt++;
        continue;
      }
      break;
    }
  }
  throw err;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const normalizeName = (s) => String(s || "").trim();
const normalizeCode = (s) => String(s || "").trim();
const sortByName = (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" });

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJSONMin(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data), "utf8");
}

function rel(p) {
  return path.relative(process.cwd(), p).replace(/\\/g, "/");
}

async function buildProvinces() {
  const url = `${BASE}/provinces/`;
  console.log(`→ Fetching provinces: ${url}`);
  const raw = await fetchJSON(url);

  const provinces = Array.isArray(raw)
    ? raw
        .filter((p) => p?.name && p?.code)
        .map((p) => ({ name: normalizeName(p.name), code: normalizeCode(p.code) }))
        .sort(sortByName)
    : [];

  const out = path.join(OUT_DIR, "provinces.min.json");
  await writeJSONMin(out, provinces);
  console.log(`✓ Provinces: ${provinces.length} → ${rel(out)}`);
  return provinces;
}

async function buildCities() {
  const url = `${BASE}/cities-municipalities/`;
  console.log(`→ Fetching cities/municipalities: ${url}`);
  const raw = await fetchJSON(url);

  const cities = Array.isArray(raw)
    ? raw
        .filter((c) => c?.name && c?.code && c?.provinceCode)
        .map((c) => ({
          name: normalizeName(c.name),
          code: normalizeCode(c.code),
          provinceCode: normalizeCode(c.provinceCode),
        }))
        .sort(sortByName)
    : [];

  const out = path.join(OUT_DIR, "cities.min.json");
  await writeJSONMin(out, cities);
  console.log(`✓ Cities/Municipalities: ${cities.length} → ${rel(out)}`);
  return cities;
}

async function fetchAndWriteCityBarangays(city) {
  const out = path.join(BRGY_DIR, `${city.code}.json`);
  // skip if exists (idempotent)
  try {
    await fs.access(out);
    return;
  } catch {} // not found → proceed

  const url = `${BASE}/cities-municipalities/${encodeURIComponent(city.code)}/barangays/`;
  const raw = await fetchJSON(url);

  const barangays = Array.isArray(raw)
    ? raw
        .filter((b) => b?.name && b?.code)
        .map((b) => ({
          name: normalizeName(b.name),
          code: normalizeCode(b.code),
          cityCode: normalizeCode(city.code),
        }))
        .sort(sortByName)
    : [];

  await writeJSONMin(out, barangays);
}

async function buildBarangaysByCity(cities) {
  console.log(`→ Fetching barangays per city (total cities: ${cities.length}, concurrency: ${CONCURRENCY})`);
  await ensureDir(BRGY_DIR);

  let i = 0, active = 0, done = 0, errors = 0;

  await new Promise((resolve) => {
    const next = () => {
      if (i >= cities.length && active === 0) {
        console.log(`✓ Barangays complete. Success: ${done}, Errors: ${errors}`);
        resolve();
        return;
      }
      while (active < CONCURRENCY && i < cities.length) {
        const city = cities[i++]; active++;
        fetchAndWriteCityBarangays(city)
          .then(() => { done++; })
          .catch((e) => {
            errors++;
            console.warn(`✗ Barangays failed for ${city.code} (${city.name}): ${e?.message}`);
          })
          .finally(() => {
            active--;
            if ((done + errors) % 50 === 0) console.log(`… progress: ${done + errors}/${cities.length}`);
            next();
          });
      }
    };
    next();
  });
}

(async function main() {
  try {
    console.log("=== Build PH Address Datasets (PSGC) ===");
    await ensureDir(OUT_DIR);
    await buildProvinces();
    const cities = await buildCities();

    if (!SKIP_BRGY) {
      await buildBarangaysByCity(cities);
      console.log(`All files written under: ${rel(OUT_DIR)}`);
    } else {
      console.log("SKIP_BRGY=1 → skipped barangay generation.");
    }

    console.log("— Recap —");
    console.log(`Provinces file: ${rel(path.join(OUT_DIR, "provinces.min.json"))}`);
    console.log(`Cities file:    ${rel(path.join(OUT_DIR, "cities.min.json"))}`);
    if (!SKIP_BRGY) console.log(`Barangays dir: ${rel(BRGY_DIR)} (one file per city code)`);
    console.log("Done.");
  } catch (e) {
    console.error("Build failed:", e?.message || e);
    process.exit(1);
  }
})();
