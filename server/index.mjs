import cron from "node-cron";
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = resolve(root, "data/reminders.json");
const envFile = resolve(root, ".env");
const app = express();

dotenv.config({ path: envFile });
const port = Number(process.env.PORT || 4174);

app.use(express.json({ limit: "1mb" }));

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
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
    APP_URL: String(config.appUrl || "http://127.0.0.1:5173"),
    SMTP_HOST: String(config.host || ""),
    SMTP_PORT: String(config.port || "587"),
    SMTP_SECURE: config.secure ? "true" : "false",
    SMTP_USER: String(config.user || ""),
    SMTP_PASS: String(config.pass || process.env.SMTP_PASS || ""),
    SMTP_FROM: String(config.from || ""),
  };

  const body = Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n");

  await writeFile(envFile, `${body}\n`);
  Object.assign(process.env, values);
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
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch {
    return [];
  }
}

async function writeReminders(reminders) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(reminders, null, 2));
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
  return {
    subject: `Erinnerung: ${child} kann ein Elternzeugnis ausfuellen`,
    text:
      `Hallo,\n\nheute ist ein guter Zeitpunkt, damit ${child} ein Elternzeugnis fuer ${recipient} ausfuellt.\n\n` +
      "Paedagogischer Gedanke: Erst Staerken sehen, dann Wuensche freundlich formulieren. Eine schlechte Note ist ein Gespraechsanlass, kein Urteil.\n\n" +
      `App oeffnen: ${process.env.APP_URL || "http://127.0.0.1:5173"}\n\n` +
      "Viele Gruesse\nElternzeugnis",
  };
}

async function sendReminder(reminder) {
  const transport = createTransport();
  if (!transport) return { ok: false, error: "SMTP ist nicht konfiguriert." };
  const mail = reminderMail(reminder);
  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: reminder.email,
    subject: mail.subject,
    text: mail.text,
  });
  return { ok: true };
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

app.get("/api/smtp/config", (_request, response) => {
  response.json(smtpConfig());
});

app.put("/api/smtp/config", async (request, response) => {
  await writeEnvConfig(request.body || {});
  response.json(smtpConfig());
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
  const result = await sendReminder({
    childName: request.body?.childName || "ein Kind",
    recipientName: request.body?.recipientName || "die Eltern",
    email: request.body?.email,
  });
  response.status(result.ok ? 200 : 400).json(result);
});

app.delete("/api/reminders/:id", async (request, response) => {
  const reminders = await readReminders();
  await writeReminders(reminders.filter((reminder) => reminder.id !== request.params.id));
  response.status(204).end();
});

cron.schedule("* * * * *", () => {
  processDueReminders().catch((error) => {
    console.error("Reminder processing failed", error);
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Reminder API listening on http://127.0.0.1:${port}`);
});
