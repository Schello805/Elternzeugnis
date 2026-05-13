import cron from "node-cron";
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { existsSync, readFileSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageFile = resolve(root, "package.json");
const dataDir = resolve(root, "data");
const legacyAppDataFile = resolve(dataDir, "app-data.json");
const databaseFile = resolve(dataDir, "elternzeugnis.sqlite");
const backupsDir = resolve(dataDir, "backups");
const remindersFile = resolve(root, "data/reminders.json");
const envFile = resolve(root, ".env");
const distDir = resolve(root, "dist");
const indexFile = resolve(distDir, "index.html");
const app = express();
const execFileAsync = promisify(execFile);

dotenv.config({ path: envFile });
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || "0.0.0.0";

let familyPin = String(process.env.FAMILY_PIN || "");
const sessions = new Map();
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;

function authRequired() {
  return Boolean(familyPin);
}

function createSessionToken() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + sessionLifetimeMs);
  return token;
}

function isValidSession(token) {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function appVersion() {
  try {
    return JSON.parse(readFileSync(packageFile, "utf8")).version || "unknown";
  } catch {
    return "unknown";
  }
}

app.use(express.json({ limit: "4mb" }));

if (existsSync(distDir)) {
  app.use(express.static(distDir));
}

app.get("/api/auth/status", (_request, response) => {
  response.json({
    requiresPin: authRequired(),
  });
});

app.post("/api/auth/login", (request, response) => {
  if (!authRequired()) {
    response.status(200).json({ token: createSessionToken() });
    return;
  }
  const pin = String(request.body?.pin || "");
  if (!pin || pin !== familyPin) {
    response.status(401).json({ error: "PIN ist falsch." });
    return;
  }
  response.status(200).json({ token: createSessionToken() });
});

app.use("/api", (request, response, next) => {
  if (!authRequired()) {
    next();
    return;
  }
  if (request.path.startsWith("/auth/")) {
    next();
    return;
  }

  const header = String(request.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  if (isValidSession(token)) {
    next();
    return;
  }

  response.status(401).json({ error: "Nicht angemeldet." });
});

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sqlEscape(value) {
  return String(value).replaceAll("'", "''");
}

async function sqlite(sql) {
  await mkdir(dataDir, { recursive: true });
  const { stdout } = await execFileAsync("sqlite3", [databaseFile, sql], { maxBuffer: 1024 * 1024 * 20 });
  return stdout.trim();
}

async function initDatabase() {
  await sqlite(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

const defaultGrades = {
  spielzeit: 2,
  kuschelfaktor: 2,
  kochkuenste: 2,
  fahrdienst: 2,
  geduld: 2,
  freundlichkeit: 2,
  taschengeld: 2,
  familienausfluege: 2,
  urlaubszeit: 2,
  partyvorbereitung: 2,
  coolness: 2,
  lernen: 2,
  klamottenberatung: 2,
  probleme_reden: 2,
};

function calendarYear(value, date = new Date().toISOString().slice(0, 10)) {
  const minYear = 1900;
  const maxYear = new Date().getFullYear() + 1;
  const text = String(value || "").replace(/\D/g, "").slice(0, 4);
  const numericYear = Number(text);
  if (/^\d{4}$/.test(text) && numericYear >= minYear && numericYear <= maxYear) return text;
  const parsed = new Date(`${date}T00:00:00`);
  const fallbackYear = Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
  return String(Math.min(Math.max(fallbackYear, minYear), maxYear));
}

function newCertificate(childId = "child-1", parentId = "parent-1") {
  return {
    id: crypto.randomUUID(),
    childId,
    parentId,
    year: String(new Date().getFullYear()),
    date: new Date().toISOString().slice(0, 10),
    grades: { ...defaultGrades },
    strengths: "",
    wishes: "",
    favoriteMoment: "",
    signature: "",
    design: "classic",
    createdAt: new Date().toISOString(),
  };
}

function initialAppData() {
  const now = new Date().toISOString();
  return {
    children: [{ id: "child-1", name: "Kind" }],
    parents: [
      { id: "parent-1", name: "Mama", email: "" },
      { id: "parent-2", name: "Papa", email: "" },
    ],
    draft: newCertificate(),
    certificates: [],
    meta: {
      updatedAt: now,
      revision: crypto.randomUUID(),
      setupComplete: false,
    },
  };
}

function normalizeAppData(value) {
  const initial = initialAppData();
  const data = value && typeof value === "object" ? value : {};
  const draft = data.draft && typeof data.draft === "object" ? data.draft : initial.draft;
  const now = new Date().toISOString();
  return {
    children: Array.isArray(data.children) && data.children.length
      ? data.children.map((person) => ({ id: person.id, name: person.name, email: person.email || "", birthDate: person.birthDate || "" }))
      : initial.children,
    parents: Array.isArray(data.parents) && data.parents.length
      ? data.parents.map((person) => ({ id: person.id, name: person.name, email: person.email || "", birthDate: person.birthDate || "" }))
      : initial.parents,
    draft: {
      ...initial.draft,
      ...draft,
      grades: { ...defaultGrades, ...(draft.grades || {}) },
      design: ["classic", "rainbow", "forest", "space"].includes(draft.design) ? draft.design : "classic",
      year: calendarYear(draft.year, draft.date),
    },
    certificates: Array.isArray(data.certificates)
      ? data.certificates.map((certificate) => ({
          ...certificate,
          year: calendarYear(certificate.year, certificate.date || certificate.createdAt),
          favorite: Boolean(certificate.favorite),
        }))
      : [],
    meta: {
      updatedAt: data.meta?.updatedAt || now,
      revision: data.meta?.revision || crypto.randomUUID(),
      setupComplete: Boolean(data.meta?.setupComplete),
    },
  };
}

async function readAppData() {
  await initDatabase();
  try {
    const row = await sqlite("SELECT value FROM app_state WHERE key='app_data';");
    if (row) return normalizeAppData(JSON.parse(row));
    if (existsSync(legacyAppDataFile)) {
      const migrated = await writeAppData(JSON.parse(await readFile(legacyAppDataFile, "utf8")), { force: true });
      return migrated.data;
    }
  } catch {
    // Fall through to initial data.
  }
  return initialAppData();
}

async function writeAppData(data, options = {}) {
  await initDatabase();
  const current = options.force ? null : await readAppData();
  const clientUpdatedAt = data?.meta?.updatedAt || "";

  if (!options.force && current?.meta?.updatedAt && clientUpdatedAt && current.meta.updatedAt !== clientUpdatedAt) {
    return { conflict: true, data: current };
  }

  const normalized = normalizeAppData(data);
  normalized.meta = {
    ...normalized.meta,
    updatedAt: new Date().toISOString(),
    revision: crypto.randomUUID(),
  };
  const compact = JSON.stringify(normalized);
  await sqlite(
    `INSERT INTO app_state (key, value, updated_at)
     VALUES ('app_data', '${sqlEscape(compact)}', '${normalized.meta.updatedAt}')
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
  );
  return { conflict: false, data: normalized };
}

function backupStamp() {
  return new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

async function createBackup(reason = "manual") {
  await initDatabase();
  await mkdir(backupsDir, { recursive: true });
  const stamp = backupStamp();
  const files = [];
  try {
    const data = await readAppData();
    const target = resolve(backupsDir, `app-data-${stamp}-${reason}.json`);
    await writeFile(target, JSON.stringify(data, null, 2));
    files.push(target);
  } catch {
    // ignore
  }
  if (existsSync(databaseFile)) {
    const target = resolve(backupsDir, `elternzeugnis-${stamp}-${reason}.sqlite`);
    await copyFile(databaseFile, target);
    files.push(target);
  }
  if (existsSync(remindersFile)) {
    const target = resolve(backupsDir, `reminders-${stamp}-${reason}.json`);
    await copyFile(remindersFile, target);
    files.push(target);
  }
  return { createdAt: new Date().toISOString(), files };
}

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: process.env.SMTP_PORT || "587",
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    from: process.env.SMTP_FROM || "",
    appUrl: process.env.APP_URL || "http://127.0.0.1:5173",
    configured: smtpConfigured(),
  };
}

async function writeEnvConfig(config) {
  const values = {
    PORT: String(process.env.PORT || 4174),
    HOST: String(process.env.HOST || "0.0.0.0"),
    APP_URL: String(config.appUrl || "http://127.0.0.1:5173"),
    SMTP_HOST: String(config.host || ""),
    SMTP_PORT: String(config.port || "587"),
    SMTP_SECURE: config.secure ? "true" : "false",
    SMTP_USER: String(config.user || ""),
    SMTP_PASS: String(config.pass || process.env.SMTP_PASS || ""),
    SMTP_FROM: String(config.from || ""),
    FAMILY_PIN: String(config.familyPin ?? process.env.FAMILY_PIN ?? ""),
  };

  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n");

  await writeFile(envFile, `${body}\n`);
  Object.assign(process.env, values);

  familyPin = String(values.FAMILY_PIN || "");
  sessions.clear();
}

function createTransport() {
  if (!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function readReminders() {
  try {
    return JSON.parse(await readFile(remindersFile, "utf8"));
  } catch {
    return [];
  }
}

async function writeReminders(reminders) {
  await mkdir(dirname(remindersFile), { recursive: true });
  await writeFile(remindersFile, JSON.stringify(reminders, null, 2));
}

function nextDueDate(reminder, from = new Date()) {
  const [hour, minute] = reminder.time.split(":").map(Number);
  const base = new Date(`${reminder.date}T${reminder.time || "09:00"}:00`);
  let next = new Date(base);

  if (reminder.frequency === "monthly") {
    next = new Date(from.getFullYear(), from.getMonth(), base.getDate(), hour, minute, 0, 0);
    if (next <= from) next.setMonth(next.getMonth() + 1);
  }

  if (reminder.frequency === "yearly") {
    next = new Date(from.getFullYear(), base.getMonth(), base.getDate(), hour, minute, 0, 0);
    if (next <= from) next.setFullYear(next.getFullYear() + 1);
  }

  return next;
}

function reminderMail(reminder) {
  const child = reminder.childName || "ein Kind";
  const recipient = reminder.recipientName || "die Eltern";
  const appUrl = process.env.APP_URL || "http://127.0.0.1:5173";
  const subject = `Zeit für ein Elternzeugnis von ${child}`;
  const intro = `Heute ist ein guter Moment, damit ${child} ein Elternzeugnis für ${recipient} ausfüllt.`;
  const pedagogicNote =
    "Eine Note ist kein Urteil. Sie ist ein Gesprächsanlass und zeigt, wo ein Kind Nähe, Aufmerksamkeit, Humor oder Unterstützung braucht.";

  return {
    subject,
    text:
      `Hallo,\n\n${intro}\n\n` +
      `Pädagogischer Gedanke: ${pedagogicNote}\n\n` +
      "Für danach:\n" +
      "1. Was war schön und soll bleiben?\n" +
      "2. Wo braucht das Kind mehr Unterstützung?\n" +
      "3. Was ist ein kleiner nächster Schritt für diese Woche?\n\n" +
      `App öffnen: ${appUrl}\n\n` +
      "Viele Grüße\nElternzeugnis",
    html: `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;background:#f5f1e8;color:#18211f;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f1e8;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffdf7;border:1px solid #ded3bf;border-radius:14px;overflow:hidden;box-shadow:0 14px 36px rgba(67,52,31,.10);">
            <tr>
              <td style="background:#24594c;padding:26px 28px;color:#fffaf0;">
                <div style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#f7d58a;">Elternzeugnis</div>
                <h1 style="margin:8px 0 0;font-size:28px;line-height:1.15;">Zeit für ein kleines Familiengespräch</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="font-size:18px;line-height:1.55;margin:0 0 18px;">${intro}</p>
                <div style="background:#edf6f2;border:1px solid #c5dbd1;border-radius:10px;padding:16px 18px;margin:0 0 22px;">
                  <strong style="display:block;color:#24594c;margin-bottom:6px;">Pädagogischer Gedanke</strong>
                  <span style="line-height:1.55;color:#21483f;">${pedagogicNote}</span>
                </div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #eadfcb;"><strong>1.</strong> Was war schön und soll bleiben?</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #eadfcb;"><strong>2.</strong> Wo braucht ${child} mehr Unterstützung?</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;"><strong>3.</strong> Was ist ein kleiner nächster Schritt für diese Woche?</td>
                  </tr>
                </table>
                <a href="${appUrl}" style="display:inline-block;background:#24594c;color:#ffffff;text-decoration:none;font-weight:800;border-radius:10px;padding:14px 18px;">Elternzeugnis öffnen</a>
                <p style="color:#68746f;font-size:13px;line-height:1.5;margin:22px 0 0;">Falls der Button nicht funktioniert, öffne diese Adresse im lokalen Netzwerk:<br><span style="color:#24594c;">${appUrl}</span></p>
              </td>
            </tr>
            <tr>
              <td style="background:#18211f;color:#bdc9c4;padding:16px 28px;font-size:13px;">
                Diese Erinnerung gehört zu eurem lokalen Elternzeugnis-Ritual.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

async function sendReminder(reminder) {
  if (!validEmail(reminder.email)) return { ok: false, error: "Bitte eine gültige E-Mail-Adresse eintragen." };
  const transport = createTransport();
  if (!transport) return { ok: false, error: "SMTP ist nicht konfiguriert." };
  const mail = reminderMail(reminder);
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: reminder.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "E-Mail konnte nicht versendet werden.",
    };
  }
}

async function processDueReminders() {
  const reminders = await readReminders();
  const now = new Date();
  let changed = false;

  for (const reminder of reminders) {
    if (!reminder.active) continue;
    const next = nextDueDate(reminder, new Date(reminder.lastSentAt || 0));
    if (next > now) continue;
    if (reminder.frequency === "once" && reminder.lastSentAt) continue;

    const result = await sendReminder(reminder);
    reminder.lastAttemptAt = now.toISOString();
    reminder.lastStatus = result.ok ? "sent" : result.error;
    if (result.ok) reminder.lastSentAt = now.toISOString();
    changed = true;
  }

  if (changed) await writeReminders(reminders);
}

app.get("/api/reminders/status", (_request, response) => {
  response.json({
    smtpConfigured: smtpConfigured(),
    appUrl: process.env.APP_URL || "http://127.0.0.1:5173",
  });
});

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    version: appVersion(),
    host,
    port,
    distAvailable: existsSync(indexFile),
    databaseAvailable: existsSync(databaseFile),
    smtpConfigured: smtpConfigured(),
    time: new Date().toISOString(),
  });
});

app.get("/api/app-data", async (_request, response) => {
  response.json(await readAppData());
});

app.put("/api/app-data", async (request, response) => {
  const result = await writeAppData(request.body || {}, { force: request.query.force === "true" });
  if (result.conflict) {
    response.status(409).json({ error: "Die Daten wurden inzwischen auf einem anderen Gerät geändert.", data: result.data });
    return;
  }
  response.json(result.data);
});

app.get("/api/admin/status", async (_request, response) => {
  const data = await readAppData();
  response.json({
    ok: true,
    version: appVersion(),
    host,
    port,
    databaseFile,
    databaseAvailable: existsSync(databaseFile),
    remindersFile,
    remindersAvailable: existsSync(remindersFile),
    backupsDir,
    counts: {
      children: data.children.length,
      parents: data.parents.length,
      certificates: data.certificates.length,
    },
    updatedAt: data.meta?.updatedAt || null,
    smtpConfigured: smtpConfigured(),
  });
});

app.post("/api/admin/backup", async (request, response) => {
  response.status(201).json(await createBackup(String(request.body?.reason || "manual")));
});

app.get("/api/smtp/config", (_request, response) => {
  response.json(smtpConfig());
});

app.put("/api/smtp/config", async (request, response) => {
  await writeEnvConfig(request.body || {});
  response.json(smtpConfig());
});

app.get("/api/admin/config", (_request, response) => {
  response.json({
    familyPinEnabled: authRequired(),
  });
});

app.put("/api/admin/config", async (request, response) => {
  const pin = String(request.body?.familyPin ?? "");
  await writeEnvConfig({ familyPin: pin });
  response.json({
    ok: true,
    familyPinEnabled: authRequired(),
  });
});

app.get("/api/reminders", async (_request, response) => {
  response.json(await readReminders());
});

app.post("/api/reminders", async (request, response) => {
  const body = request.body || {};
  if (!body.email || !body.date || !body.time) {
    response.status(400).json({ error: "E-Mail, Datum und Uhrzeit sind erforderlich." });
    return;
  }
  if (!validEmail(body.email)) {
    response.status(400).json({ error: "Bitte eine gültige E-Mail-Adresse eintragen." });
    return;
  }

  const reminders = await readReminders();
  const reminder = {
    id: crypto.randomUUID(),
    active: true,
    childName: String(body.childName || ""),
    recipientName: String(body.recipientName || ""),
    email: String(body.email),
    date: String(body.date),
    time: String(body.time),
    frequency: ["once", "monthly", "yearly"].includes(body.frequency) ? body.frequency : "yearly",
    createdAt: new Date().toISOString(),
    lastSentAt: null,
    lastAttemptAt: null,
    lastStatus: "new",
  };

  reminders.push(reminder);
  await writeReminders(reminders);
  response.status(201).json(reminder);
});

app.post("/api/reminders/test", async (request, response) => {
  try {
    const result = await sendReminder({
      childName: request.body?.childName || "ein Kind",
      recipientName: request.body?.recipientName || "die Eltern",
      email: request.body?.email,
    });
    response.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    response.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Testmail konnte nicht versendet werden.",
    });
  }
});

app.delete("/api/reminders/:id", async (request, response) => {
  const reminders = await readReminders();
  await writeReminders(reminders.filter((reminder) => reminder.id !== request.params.id));
  response.status(204).end();
});

if (existsSync(indexFile)) {
  app.get(/^(?!\/api).*/, (_request, response) => {
    response.sendFile(indexFile);
  });
}

cron.schedule("* * * * *", () => {
  processDueReminders().catch((error) => {
    console.error("Reminder processing failed", error);
  });
});

cron.schedule("0 3 * * *", () => {
  createBackup("daily").catch((error) => {
    console.error("Daily backup failed", error);
  });
});

app.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`Elternzeugnis listening on http://${displayHost}:${port}`);
});
