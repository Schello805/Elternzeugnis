import {
  Archive,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  FileText,
  Github,
  HeartHandshake,
  Lock,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, PointerEvent, ReactElement, ReactNode, SetStateAction } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { appBranch, appBuildTime, appRevision, appVersion } from "./generated/version";

const githubUrl = "https://github.com/Schello805/Elternzeugnis";
const storageKey = "elternzeugnis:v2";
const authTokenKey = "elternzeugnis:auth-token";

type View = "certificate" | "child" | "people" | "history" | "reminders" | "admin";
type Frequency = "once" | "monthly" | "yearly";
type Design = "classic" | "rainbow" | "forest" | "space";

type Person = {
  id: string;
  name: string;
  email?: string;
  birthDate?: string;
};

type Category = {
  id: string;
  icon: string;
  title: string;
  childHint: string;
  advice: string;
};

type Certificate = {
  id: string;
  childId: string;
  parentId: string;
  year: string;
  date: string;
  grades: Record<string, number>;
  strengths: string;
  wishes: string;
  favoriteMoment: string;
  signature: string;
  design: Design;
  createdAt: string;
  favorite?: boolean;
};

type Reminder = {
  id: string;
  childName: string;
  recipientName: string;
  email: string;
  date: string;
  time: string;
  frequency: Frequency;
  active: boolean;
  lastStatus?: string;
  lastSentAt?: string | null;
};

type AppData = {
  children: Person[];
  parents: Person[];
  draft: Certificate;
  certificates: Certificate[];
  meta?: {
    updatedAt?: string;
    revision?: string;
    setupComplete?: boolean;
  };
};

function isSetupComplete(data: AppData) {
  return (
    data.children.length > 0 &&
    data.parents.length > 0 &&
    data.children.every((person) => person.name.trim() && person.name !== "Kind" && person.birthDate) &&
    data.parents.every((person) => person.name.trim() && person.name !== "Elternteil") &&
    Boolean(data.meta?.setupComplete)
  );
}

function getAuthToken() {
  return sessionStorage.getItem(authTokenKey) || "";
}

function setAuthToken(token: string) {
  if (!token) {
    sessionStorage.removeItem(authTokenKey);
    return;
  }
  sessionStorage.setItem(authTokenKey, token);
}

async function apiFetch(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    setAuthToken("");
    window.dispatchEvent(new Event("auth:required"));
  }
  return response;
}

type SmtpConfig = {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  appUrl: string;
  configured?: boolean;
};

type SyncState = "lade" | "synchronisiert" | "speichert" | "offline";

type ToastKind = "success" | "info" | "warn";

type ToastState = {
  message: string;
  kind: ToastKind;
};

type AdminStatus = {
  version: string;
  host: string;
  port: number;
  databaseFile: string;
  databaseAvailable: boolean;
  remindersFile: string;
  remindersAvailable: boolean;
  backupsDir: string;
  counts: { children: number; parents: number; certificates: number };
  updatedAt: string | null;
  smtpConfigured: boolean;
};

const categories: Category[] = [
  {
    id: "spielzeit",
    icon: "🎲",
    title: "Spielzeit",
    childHint: "Gibt es gemeinsame Zeit zum Spielen, Lesen, Lachen oder Quatsch machen?",
    advice: "Kurze, verlässliche gemeinsame Zeit wirkt oft stärker als große Versprechen.",
  },
  {
    id: "kuschelfaktor",
    icon: "🤗",
    title: "Kuschelfaktor",
    childHint: "Gibt es genug Nähe, Trost, Umarmungen oder gemütliche Zeit, wenn du das möchtest?",
    advice: "Fragt nach, welche Nähe gut tut. Kinder brauchen Wahlmöglichkeiten: kuscheln, reden oder einfach nebeneinander sein.",
  },
  {
    id: "kochkuenste",
    icon: "🍳",
    title: "Kochkünste",
    childHint: "Schmeckt das Essen und darfst du manchmal mitentscheiden oder mithelfen?",
    advice: "Ein gemeinsames Lieblingsessen oder ein Mitmach-Abend kann Alltag und Beziehung sehr leicht stärken.",
  },
  {
    id: "fahrdienst",
    icon: "🚗",
    title: "Fahrdienst",
    childHint: "Klappt Bringen, Abholen und Unterwegssein zuverlässig und ohne unnötigen Stress?",
    advice: "Klare Zeiten und kleine Puffer helfen Kindern, sich sicher und weniger gehetzt zu fühlen.",
  },
  {
    id: "geduld",
    icon: "⏳",
    title: "Geduld",
    childHint: "Bleibt die Person ruhig und freundlich, wenn etwas Zeit braucht?",
    advice: "Vereinbart ein Pausenwort. Es schützt vor Streit und hilft allen, wieder gut zuzuhören.",
  },
  {
    id: "freundlichkeit",
    icon: "💛",
    title: "Freundlichkeit",
    childHint: "Spricht die Person liebevoll mit dir, auch wenn es gerade schwierig ist?",
    advice: "Freundliche Worte sind kein Extra. Sie geben Kindern Sicherheit und machen Kritik leichter annehmbar.",
  },
  {
    id: "taschengeld",
    icon: "🪙",
    title: "Taschengeld",
    childHint: "Ist Taschengeld oder Geld für Wünsche fair, verständlich und gut besprochen?",
    advice: "Klare Regeln zu Geld helfen Kindern, Verantwortung zu üben, ohne dass daraus Machtkämpfe werden.",
  },
  {
    id: "familienausfluege",
    icon: "🧭",
    title: "Familienausflüge",
    childHint: "Gibt es schöne gemeinsame Ausflüge, Erlebnisse oder kleine Abenteuer?",
    advice: "Es muss nicht groß sein. Ein verlässlicher kleiner Ausflug kann mehr zählen als ein perfekter Plan.",
  },
  {
    id: "urlaubszeit",
    icon: "🏖️",
    title: "Urlaubszeit",
    childHint: "Fühlt sich Urlaub oder freie Zeit gemeinsam erholsam, fair und schön geplant an?",
    advice: "Kinder entspannen leichter, wenn Pausen, Wünsche und gemeinsame Zeiten vorher besprochen werden.",
  },
  {
    id: "partyvorbereitung",
    icon: "🎈",
    title: "Partyvorbereitung",
    childHint: "Hilft die Person gut bei Geburtstagen, Feiern oder besonderen Tagen?",
    advice: "Bei Feiern brauchen Kinder oft Mitsprache und Entlastung. Eine kleine Checkliste kann Druck herausnehmen.",
  },
  {
    id: "coolness",
    icon: "😎",
    title: "Coolness",
    childHint: "Bleibt die Person locker, humorvoll und peinlich nur im guten Maß?",
    advice: "Humor verbindet. Gleichzeitig hilft Nachfragen: Was ist lustig, und was ist mir vor anderen unangenehm?",
  },
  {
    id: "lernen",
    icon: "📚",
    title: "Hilfe beim Lernen",
    childHint: "Wird Lernen erklärt, ohne Druck zu machen und mit Mut für den nächsten Schritt?",
    advice: "Fehler sind Lernspuren. Erst ermutigen, dann gemeinsam einen kleinen Übungsschritt wählen.",
  },
  {
    id: "klamottenberatung",
    icon: "👕",
    title: "Beratung beim Klamottenkauf",
    childHint: "Wirst du bei Kleidung ernst genommen und gut beraten, ohne dass es Streit geben muss?",
    advice: "Kleidung ist auch Ausdruck von Selbstständigkeit. Ein Budget und ein paar klare Grenzen helfen beiden Seiten.",
  },
  {
    id: "probleme_reden",
    icon: "💬",
    title: "Reden über Probleme",
    childHint: "Kannst du über Sorgen, Streit oder schwierige Gefühle sprechen und wirst dabei ernst genommen?",
    advice: "Zehn Minuten ungeteilte Zuhörzeit stärken Vertrauen mehr als schnelle Lösungen.",
  },
];

const defaultGrades = Object.fromEntries(categories.map((category) => [category.id, 2]));

function newId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentCalendarYear() {
  return new Date().getFullYear();
}

function minCalendarYear() {
  return currentCalendarYear() - 100;
}

function maxCalendarYear() {
  return currentCalendarYear() + 100;
}

function isValidCalendarYear(value?: string) {
  if (!value || !/^\d{4}$/.test(value)) return false;
  const year = Number(value);
  return year >= minCalendarYear() && year <= maxCalendarYear();
}

function sanitizeCalendarYear(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function calendarYear(value?: string, date = today()) {
  if (isValidCalendarYear(value)) return String(value);
  const fromDate = new Date(`${date}T00:00:00`);
  const fallbackYear = Number.isNaN(fromDate.getTime()) ? new Date().getFullYear() : fromDate.getFullYear();
  return String(Math.min(Math.max(fallbackYear, minCalendarYear()), maxCalendarYear()));
}

function childAge(child: Person | undefined, atDate = today()) {
  if (!child?.birthDate) return null;
  const birth = new Date(`${child.birthDate}T00:00:00`);
  const at = new Date(`${atDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const hadBirthday =
    at.getMonth() > birth.getMonth() || (at.getMonth() === birth.getMonth() && at.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function ageGroup(age: number | null) {
  if (age === null) return "unknown";
  if (age <= 6) return "young";
  if (age <= 10) return "primary";
  return "older";
}

function ageLabel(child: Person | undefined, atDate = today()) {
  const age = childAge(child, atDate);
  return age === null ? "Alter nicht angegeben" : `${age} Jahre`;
}

function CalendarYearInput({
  value,
  date,
  onChange,
}: {
  value: string;
  date: string;
  onChange: (value: string) => void;
}) {
  const numericYear = /^\d{4}$/.test(value) ? Number(value) : null;
  const showYearHint = numericYear !== null && Math.abs(numericYear - currentCalendarYear()) > 1;

  return (
    <>
      <input
        inputMode="numeric"
        maxLength={4}
        pattern="[0-9]{4}"
        title={`Vierstelliges Kalenderjahr von ${minCalendarYear()} bis ${maxCalendarYear()}`}
        value={value}
        onBlur={() => onChange(calendarYear(value, date))}
        onChange={(event) => onChange(sanitizeCalendarYear(event.target.value))}
      />
      {showYearHint ? (
        <span className="field-info">
          Bitte kurz prüfen: Das Kalenderjahr liegt mehr als ein Jahr vom aktuellen Jahr entfernt.
        </span>
      ) : null}
    </>
  );
}

type GradeVisualMode = "smileys" | "stars" | "grades";

function gradeVisualMode(child: Person | undefined, atDate = today()): GradeVisualMode {
  const group = ageGroup(childAge(child, atDate));
  if (group === "young") return "smileys";
  if (group === "primary" || group === "unknown") return "stars";
  return "grades";
}

function gradeOptions(child: Person | undefined, atDate = today()) {
  const mode = gradeVisualMode(child, atDate);
  const labels: Record<GradeVisualMode, string[]> = {
    grades: ["", "1", "2", "3", "4", "5", "6"],
    smileys: ["", "😍", "😊", "🙂", "😕", "😟", "😢"],
    stars: ["", "★★★★★", "★★★★", "★★★", "★★", "★", "☆"],
  };

  return [1, 2, 3, 4, 5, 6].map((grade) => ({
    grade,
    label: labels[mode][grade],
    mode,
    help: gradeCopy(grade),
    aria: `Bewertung ${grade}: ${gradeCopy(grade)}`,
  }));
}

function certificateGradeOptions() {
  return [1, 2, 3, 4, 5, 6].map((grade) => ({
    grade,
    label: String(grade),
    mode: "grades" as GradeVisualMode,
    aria: `Note ${grade}: ${gradeCopy(grade)}`,
  }));
}

function ageAdaptedHint(category: Category, child: Person | undefined, atDate = today()) {
  const group = ageGroup(childAge(child, atDate));
  const additions: Record<string, string> = {
    young: "Achte besonders auf einfache Worte, Nähe und klare kleine Beispiele.",
    primary: "Formuliere konkret: Wann war es gut, wann brauchst du etwas anderes?",
    older: "Du darfst differenziert schreiben: Was ist fair, was fehlt, was wäre ein guter nächster Schritt?",
    unknown: "Mit Geburtsdatum in den Stammdaten werden die Texte automatisch altersgerechter.",
  };
  return `${category.childHint} ${additions[group]}`;
}

function wishSuggestions(category: Category, child: Person | undefined) {
  const group = ageGroup(childAge(child));
  if (group === "young") {
    return [
      `Ich wünsche mir bei ${category.title.toLowerCase()} mehr Hilfe und ruhige Worte.`,
      "Bitte frag mich: Soll ich dich drücken, helfen oder kurz warten?",
      "Lass uns eine kleine Sache üben, die wir beide schaffen.",
    ];
  }
  if (group === "older") {
    return [
      `Ich wünsche mir bei ${category.title.toLowerCase()} eine klare Abmachung, die für uns beide fair ist.`,
      "Bitte hör erst zu, bevor wir gemeinsam eine Lösung suchen.",
      "Lass uns nach einem Streit kurz sortieren, was jeder gebraucht hätte.",
    ];
  }
  return [
    `Ich wünsche mir bei ${category.title.toLowerCase()} mehr gemeinsame Zeit.`,
    "Bitte frag mich zuerst, was ich gerade brauche.",
    "Lass uns eine kleine Abmachung machen, die wir beide schaffen.",
  ];
}

function newCertificate(childId = "child-1", parentId = "parent-1"): Certificate {
  return {
    id: newId(),
    childId,
    parentId,
    year: String(new Date().getFullYear()),
    date: today(),
    grades: { ...defaultGrades },
    strengths: "",
    wishes: "",
    favoriteMoment: "",
    signature: "",
    design: "classic",
    createdAt: new Date().toISOString(),
  };
}

const initialData: AppData = {
  children: [{ id: "child-1", name: "Kind" }],
  parents: [
    { id: "parent-1", name: "Mama", email: "" },
    { id: "parent-2", name: "Papa", email: "" },
  ],
  draft: newCertificate(),
  certificates: [],
  meta: { setupComplete: false },
};

function designLabel(design: Design) {
  const labels: Record<Design, string> = {
    classic: "Urkundenstil",
    rainbow: "Stickerbogen",
    forest: "Naturtagebuch",
    space: "Sternenmission",
  };
  return labels[design];
}

function designSubtitle(design: Design) {
  const subtitles: Record<Design, string> = {
    classic: "feierlich, ruhig und klar",
    rainbow: "bunt, spielerisch und mutmachend",
    forest: "achtsam, warm und beobachtend",
    space: "abenteuerlich, stark und zielorientiert",
  };
  return subtitles[design];
}

function DesignPreview({ design }: { design: Design }) {
  return (
    <span className={`design-preview-sheet ${design}`} aria-hidden="true">
      <span className="preview-page">
        <span className="preview-head">
          <i />
          <strong />
          <em />
        </span>
        <span className="preview-grades">
          <b />
          <b />
          <b />
          <b />
        </span>
        <span className="preview-text">
          <i />
          <i />
        </span>
        <span className="preview-signature" />
      </span>
    </span>
  );
}

function normalizeData(value: Partial<AppData> | null | undefined): AppData {
  const parsed = value || {};
  const draft = parsed.draft ? { ...newCertificate(), ...parsed.draft } : initialData.draft;
  return {
    ...initialData,
    ...parsed,
    children: parsed.children?.length ? parsed.children.map((person) => ({ ...person, birthDate: person.birthDate || "" })) : initialData.children,
    parents: parsed.parents?.length ? parsed.parents.map((person) => ({ ...person, birthDate: person.birthDate || "" })) : initialData.parents,
    draft: {
      ...draft,
      year: calendarYear(String(draft.year || ""), draft.date || today()),
      grades: { ...defaultGrades, ...draft.grades },
      design: draft.design || "classic",
    },
    certificates: (parsed.certificates || []).map((certificate) => ({
      ...certificate,
      year: calendarYear(String(certificate.year || ""), certificate.date || certificate.createdAt || today()),
      favorite: Boolean(certificate.favorite),
    })),
    meta: parsed.meta || initialData.meta,
  };
}

function loadLocalData(): AppData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return normalizeData(initialData);
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return normalizeData(parsed);
  } catch {
    return normalizeData(initialData);
  }
}

function hasUserData(data: AppData) {
  return (
    data.certificates.length > 0 ||
    data.children.some((person) => person.name !== "Kind") ||
    data.parents.some((person) => person.name !== "Mama" && person.name !== "Papa") ||
    Boolean(data.draft.strengths || data.draft.wishes || data.draft.favoriteMoment || data.draft.signature)
  );
}

function isInitialServerData(data: AppData) {
  return (
    data.certificates.length === 0 &&
    data.children.length === 1 &&
    data.children[0]?.name === "Kind" &&
    data.parents.length === 2 &&
    data.parents[0]?.name === "Mama" &&
    data.parents[1]?.name === "Papa" &&
    !data.draft.strengths &&
    !data.draft.wishes &&
    !data.draft.favoriteMoment &&
    !data.draft.signature
  );
}

async function saveAppData(data: AppData) {
  const response = await apiFetch("/api/app-data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (response.status === 409) {
    const conflict = (await response.json()) as { data?: Partial<AppData> };
    const error = new Error("Die Daten wurden auf einem anderen Gerät geändert.");
    (error as Error & { serverData?: AppData }).serverData = normalizeData(conflict.data);
    throw error;
  }
  if (!response.ok) throw new Error("Daten konnten nicht gespeichert werden.");
  return normalizeData((await response.json()) as Partial<AppData>);
}

export function App() {
  const [data, setData] = useState<AppData>(loadLocalData);
  const [view, setView] = useState<View>("certificate");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("lade");
  const [syncMessage, setSyncMessage] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authToken, setAuthTokenState] = useState(() => getAuthToken());
  const dataRef = useRef(data);
  const lastChangeAt = useRef(Date.now());
  const skipNextSave = useRef(false);

  const showToast = (message: string, kind: ToastKind = "success") => {
    setToast({ message, kind });
  };

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const handler = () => {
      setAuthTokenState("");
      setAuthRequired(true);
    };
    window.addEventListener("auth:required", handler);
    return () => window.removeEventListener("auth:required", handler);
  }, []);

  useEffect(() => {
    apiFetch("/api/auth/status")
      .then((response) => response.json() as Promise<{ requiresPin: boolean }>)
      .then((status) => {
        setAuthRequired(Boolean(status.requiresPin));
      })
      .catch(() => {
        setAuthRequired(false);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const loginWithPin = async (pin: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "PIN ist falsch.");
    }
    const payload = (await response.json()) as { token: string };
    setAuthToken(payload.token);
    setAuthTokenState(payload.token);
  };

  useEffect(() => {
    dataRef.current = data;
    lastChangeAt.current = Date.now();
  }, [data]);

  useEffect(() => {
    let active = true;
    const localData = loadLocalData();

    apiFetch("/api/app-data")
      .then((response) => {
        if (!response.ok) throw new Error("Serverdaten konnten nicht geladen werden.");
        return response.json() as Promise<Partial<AppData>>;
      })
      .then(async (serverData) => {
        if (!active) return;
        const normalizedServerData = normalizeData(serverData);
        if (isInitialServerData(normalizedServerData) && hasUserData(localData)) {
          const migratedData = await saveAppData(localData);
          if (!active) return;
          setData(migratedData);
        } else {
          setData(normalizedServerData);
          localStorage.setItem(storageKey, JSON.stringify(normalizedServerData));
        }
        setSyncState("synchronisiert");
      })
      .catch(() => {
        if (!active) return;
        setSyncState("offline");
      })
      .finally(() => {
        if (active) setServerLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(data));
    if (!serverLoaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      setSyncState("speichert");
      saveAppData(data)
        .then((savedData) => {
          localStorage.setItem(storageKey, JSON.stringify(savedData));
          skipNextSave.current = true;
          setData(savedData);
          setSyncState("synchronisiert");
          setSyncMessage("");
        })
        .catch((error: Error & { serverData?: AppData }) => {
          if (error.serverData) {
            skipNextSave.current = true;
            setData(error.serverData);
            setSyncState("offline");
            setSyncMessage("Ein anderes Gerät war schneller. Die aktuelle Serverversion wurde geladen.");
            return;
          }
          setSyncState("offline");
          setSyncMessage("Server nicht erreichbar. Änderungen bleiben vorerst nur auf diesem Gerät.");
        });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [data, serverLoaded]);

  useEffect(() => {
    if (!serverLoaded) return;

    const refreshFromServer = async () => {
      if (Date.now() - lastChangeAt.current < 2500) return;
      try {
        const response = await apiFetch("/api/app-data");
        if (!response.ok) throw new Error("Serverdaten konnten nicht geladen werden.");
        const serverData = normalizeData((await response.json()) as Partial<AppData>);
        if (JSON.stringify(serverData) !== JSON.stringify(dataRef.current)) {
          skipNextSave.current = true;
          setData(serverData);
          localStorage.setItem(storageKey, JSON.stringify(serverData));
        }
        setSyncState("synchronisiert");
      } catch {
        setSyncState("offline");
      }
    };

    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void refreshFromServer();
    };

    const interval = window.setInterval(refreshFromServer, 15000);
    window.addEventListener("focus", refreshFromServer);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshFromServer);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [serverLoaded]);

  if (authChecked && authRequired && !authToken) {
    return <PinGate onLogin={loginWithPin} />;
  }

  return (
    <div className="app-shell">
      <Header view={view} setView={setView} syncState={syncState} syncMessage={syncMessage} />
      <main>
        <AppWorkspace data={data} setData={setData} view={view} setView={setView} showToast={showToast} />
      </main>
      <GlobalToast toast={toast} />
      <Footer />
    </div>
  );
}

function GlobalToast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  const Icon = toast.kind === "warn" ? Sparkles : CheckCircle2;
  return (
    <div className={`toast-message ${toast.kind}`} role="status" aria-live="polite">
      <Icon size={19} />
      <span>{toast.message}</span>
    </div>
  );
}

function Header({
  view,
  setView,
  syncState,
  syncMessage,
}: {
  view: View;
  setView: (view: View) => void;
  syncState: SyncState;
  syncMessage: string;
}) {
  const syncText: Record<SyncState, string> = {
    lade: "Lade Serverdaten",
    synchronisiert: "Zentral gespeichert",
    speichert: "Speichert",
    offline: "Nur lokal gespeichert",
  };

  return (
    <header className="topbar">
      <div className="topbar-brand-row">
        <div className="brand" aria-label="Elternzeugnis">
          <span className="brand-mark">
            <img src="/logo-elternzeugnis.png" alt="" />
          </span>
          <span>
            <strong>Elternzeugnis</strong>
            <small>Zeugnisse, Erinnerungen und Jahresverlauf</small>
          </span>
        </div>
        <nav className="topnav" aria-label="Projekt">
          <span className={`sync-badge ${syncState}`} title={syncMessage || syncText[syncState]}>
            {syncText[syncState]}
          </span>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            <Github size={18} /> GitHub
          </a>
        </nav>
      </div>
      <nav className="module-tabs header-tabs" aria-label="Arbeitsbereiche">
        <Tab active={view === "child"} onClick={() => setView("child")} icon={<Pencil size={19} />} label="Kindermodus" />
        <Tab active={view === "certificate"} onClick={() => setView("certificate")} icon={<BookOpen size={19} />} label="Zeugnis" />
        <Tab active={view === "people"} onClick={() => setView("people")} icon={<UsersRound size={19} />} label="Stammdaten" />
        <Tab active={view === "history"} onClick={() => setView("history")} icon={<BarChart3 size={19} />} label="Verlauf" />
        <Tab active={view === "reminders"} onClick={() => setView("reminders")} icon={<CalendarClock size={19} />} label="Erinnerungen" />
        <Tab active={view === "admin"} onClick={() => setView("admin")} icon={<Settings size={19} />} label="Admin" />
      </nav>
    </header>
  );
}

function AppWorkspace({
  data,
  setData,
  view,
  setView,
  showToast,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  view: View;
  setView: (view: View) => void;
  showToast: (message: string, kind?: ToastKind) => void;
}) {
  const setupDone = isSetupComplete(data);
  return (
    <div className="app-workspace">
      {!setupDone && view !== "people" ? (
        <div className="setup-strip">
          <div>
            <p className="eyebrow">Einrichtung</p>
            <strong>Stammdaten vervollständigen</strong>
            <span>Trage Kindernamen und Geburtsdaten ein, damit Texte altersgerecht formuliert werden.</span>
          </div>
          <button className="primary-button" onClick={() => setView("people")}>
            <UsersRound size={19} /> Einrichten
          </button>
        </div>
      ) : null}
      {view === "child" ? <ChildModeScreen data={data} setData={setData} setView={setView} /> : null}
      {view === "certificate" ? <CertificateScreen data={data} setData={setData} showToast={showToast} /> : null}
      {view === "people" ? <PeopleScreen data={data} setData={setData} showToast={showToast} /> : null}
      {view === "history" ? <HistoryScreen data={data} setData={setData} setView={setView} /> : null}
      {view === "reminders" ? <ReminderScreen data={data} /> : null}
      {view === "admin" ? <AdminScreen /> : null}
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function ChildModeScreen({
  data,
  setData,
  setView,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  setView: (view: View) => void;
}) {
  const child = data.children.find((person) => person.id === data.draft.childId) || data.children[0];
  const parent = data.parents.find((person) => person.id === data.draft.parentId) || data.parents[0];
  const [setupDone, setSetupDone] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const category = categories[focusIndex];
  const gradeItems = gradeOptions(child, data.draft.date);

  const updateDraft = <Key extends keyof Certificate>(key: Key, value: Certificate[Key]) => {
    setData((current) => ({ ...current, draft: { ...current.draft, [key]: value } }));
  };

  const updateGrade = (grade: number) => {
    setData((current) => ({
      ...current,
      draft: {
        ...current.draft,
        grades: { ...current.draft.grades, [category.id]: grade },
      },
    }));
  };

  const next = () => setFocusIndex((current) => Math.min(current + 1, categories.length - 1));
  const previous = () => setFocusIndex((current) => Math.max(current - 1, 0));

  if (!setupDone) {
    return (
      <section className="child-mode">
        <div className="child-card setup-card">
          <p className="eyebrow">Vor dem Start</p>
          <h1>Für wen wird dieses Elternzeugnis ausgefüllt?</h1>
          <p className="setup-intro">
            Erst wählen wir Kind, Elternteil und Kalenderjahr. Danach sieht das Kind nur noch die
            einfachen Fragen im Kindermodus.
          </p>
          <p className="tablet-hint">Am Tablet lässt sich der Kindermodus besonders ruhig gemeinsam ausfüllen.</p>
          <div className="form-grid">
            <label>
              Kind
              <select value={data.draft.childId} onChange={(event) => updateDraft("childId", event.target.value)}>
                {data.children.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name || "Unbenanntes Kind"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Elternteil oder Bezugsperson
              <select value={data.draft.parentId} onChange={(event) => updateDraft("parentId", event.target.value)}>
                {data.parents.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name || "Unbenannter Elternteil"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kalenderjahr
              <CalendarYearInput
                value={data.draft.year}
                date={data.draft.date}
                onChange={(value) => updateDraft("year", value)}
              />
            </label>
            <label>
              Datum
              <input type="date" value={data.draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
            </label>
          </div>
          <fieldset className="design-picker design-preview-picker child-design-picker">
            <legend>Design für das Zeugnis</legend>
            {(["classic", "rainbow", "forest", "space"] as Design[]).map((design) => (
              <button
                key={design}
                className={data.draft.design === design ? "selected" : ""}
                onClick={() => updateDraft("design", design)}
                type="button"
              >
                <DesignPreview design={design} />
                {designLabel(design)}
              </button>
            ))}
          </fieldset>
          <div className="hero-actions">
            <button className="secondary-button" onClick={() => setView("people")}>
              Stammdaten bearbeiten
            </button>
            <button className="primary-button" onClick={() => setSetupDone(true)}>
              <Pencil size={19} /> Kindermodus starten
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="child-mode">
      <div className="child-card">
        <p className="eyebrow">Kindermodus</p>
        <h1>
          {child?.name || "Kind"} erzählt, was bei {parent?.name || "Elternteil"} gut tut
        </h1>
        <div className="progress-track">
          <span style={{ width: `${((focusIndex + 1) / categories.length) * 100}%` }} />
        </div>
        <div className="child-progress-meta">
          <span>
            Frage {focusIndex + 1} von {categories.length}
          </span>
          <span>{gradeVisualMode(child, data.draft.date) === "grades" ? "Noten" : gradeVisualMode(child, data.draft.date) === "smileys" ? "Smileys" : "Sterne"}</span>
        </div>
        <div className="child-question">
          <div className="question-heading">
            <span className="question-icon" aria-hidden="true">
              {category.icon}
            </span>
            <strong>{category.title}</strong>
          </div>
          <p>{ageAdaptedHint(category, child, data.draft.date)}</p>
          <p className="child-microcopy">Wähle das Bild, das sich für dich am passendsten anfühlt.</p>
          <small>{child?.name || "Kind"}: {ageLabel(child, data.draft.date)}</small>
        </div>
        <div className="big-grade-grid">
          {gradeItems.map((option) => (
            <button
              key={option.grade}
              aria-label={`${category.title}: ${option.aria}`}
              className={data.draft.grades[category.id] === option.grade ? "selected" : ""}
              onClick={() => updateGrade(option.grade)}
            >
              <span className={`grade-symbol ${option.mode}`}>{option.label}</span>
              <small>{option.help}</small>
            </button>
          ))}
        </div>
        {data.draft.grades[category.id] >= 5 ? <WishChips category={category} child={child} setData={setData} /> : null}
        <div className="hero-actions">
          {focusIndex === 0 ? (
            <button className="secondary-button" onClick={() => setSetupDone(false)}>
              Auswahl ändern
            </button>
          ) : (
            <button className="secondary-button" onClick={previous}>
              Zurück
            </button>
          )}
          {focusIndex === categories.length - 1 ? (
            <button className="primary-button" onClick={() => setView("certificate")}>
              <CheckCircle2 size={19} /> Zum Zeugnis
            </button>
          ) : (
            <button className="primary-button" onClick={next}>
              Weiter
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function gradeCopy(grade: number) {
  return ["", "Tut mir gut", "Meist gut", "Okay", "Bitte üben", "Ich brauche Hilfe", "Bitte reden"][grade];
}

function WishChips({
  category,
  child,
  setData,
}: {
  category: Category;
  child?: Person;
  setData: Dispatch<SetStateAction<AppData>>;
}) {
  const wishes = wishSuggestions(category, child);

  const addWish = (wish: string) => {
    setData((current) => ({
      ...current,
      draft: {
        ...current.draft,
        wishes: current.draft.wishes ? `${current.draft.wishes}\n${wish}` : wish,
      },
    }));
  };

  return (
    <div className="wish-chips">
      <strong>So kannst du deinen Wunsch freundlich sagen:</strong>
      {wishes.map((wish) => (
        <button key={wish} onClick={() => addWish(wish)}>
          {wish}
        </button>
      ))}
    </div>
  );
}

function isSignatureImage(value: string) {
  return value.startsWith("data:image/");
}

function SignaturePad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "#18211f";
    context.clearRect(0, 0, rect.width, rect.height);

    if (isSignatureImage(value)) {
      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, rect.width, rect.height);
        context.drawImage(image, 0, 0, rect.width, rect.height);
      };
      image.src = value;
    }
  }, [value]);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const beginDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = pointFromEvent(event);
    lastPointRef.current = point;
    context.beginPath();
    context.arc(point.x, point.y, 1.6, 0, Math.PI * 2);
    context.fillStyle = "#18211f";
    context.fill();
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const lastPoint = lastPointRef.current;
    if (!canvas || !context || !lastPoint) return;
    const point = pointFromEvent(event);
    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.lineTo(point.x, point.y);
    context.stroke();
    lastPointRef.current = point;
  };

  const endDrawing = () => {
    const canvas = canvasRef.current;
    if (!drawingRef.current || !canvas) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    onChange(canvas.toDataURL("image/png"));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    context.clearRect(0, 0, rect.width, rect.height);
    onChange("");
  };

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        aria-label="Unterschrift zeichnen"
        onPointerDown={beginDrawing}
        onPointerMove={draw}
        onPointerUp={endDrawing}
        onPointerCancel={endDrawing}
        onPointerLeave={endDrawing}
      />
      <button className="secondary-button" type="button" onClick={clearSignature}>
        <Trash2 size={18} /> Löschen
      </button>
    </div>
  );
}

function CertificateScreen({
  data,
  setData,
  showToast,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  showToast: (message: string, kind?: ToastKind) => void;
}) {
  const child = data.children.find((person) => person.id === data.draft.childId) || data.children[0];
  const parent = data.parents.find((person) => person.id === data.draft.parentId) || data.parents[0];
  const lowGrades = categories.filter((category) => data.draft.grades[category.id] >= 5);
  const gradeItems = certificateGradeOptions();
  const [certificateMode, setCertificateMode] = useState<"edit" | "preview">("edit");

  const updateDraft = <Key extends keyof Certificate>(key: Key, value: Certificate[Key]) => {
    setData((current) => ({ ...current, draft: { ...current.draft, [key]: value } }));
  };

  const updateGrade = (categoryId: string, grade: number) => {
    setData((current) => ({
      ...current,
      draft: {
        ...current.draft,
        grades: { ...current.draft.grades, [categoryId]: grade },
      },
    }));
  };

  const saveCertificate = () => {
    setData((current) => {
      const certificate = { ...current.draft, id: newId(), createdAt: new Date().toISOString() };
      return {
        ...current,
        certificates: [certificate, ...current.certificates],
        draft: newCertificate(certificate.childId, certificate.parentId),
      };
    });
    showToast("Zeugnis gespeichert. Im Verlauf findest du es wieder.");
  };

  const exportPdf = async () => {
    setCertificateMode("preview");
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    const sheet = document.querySelector<HTMLElement>(".certificate-sheet");
    if (!sheet) return;
    const canvas = await html2canvas(sheet, { scale: 2, backgroundColor: "#ffffff" });
    const image = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height) * 0.96;
    const width = canvas.width * ratio;
    const height = canvas.height * ratio;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;
    pdf.addImage(image, "PNG", x, y, width, height);
    pdf.save(`Elternzeugnis-${child?.name || "Kind"}-${parent?.name || "Eltern"}.pdf`);
    showToast("PDF wurde erstellt. Das Zeugnis kann jetzt gemeinsam angeschaut werden.");
  };

  return (
    <section className="certificate-layout">
      <aside className="side-panel no-print">
        <p className="eyebrow">Eingabe</p>
        <h1>Wünsche, Stärken und Momente festhalten</h1>
        <div className="mode-toggle" aria-label="Ansicht wählen">
          <button className={certificateMode === "edit" ? "selected" : ""} onClick={() => setCertificateMode("edit")} type="button">
            Eingabe
          </button>
          <button className={certificateMode === "preview" ? "selected" : ""} onClick={() => setCertificateMode("preview")} type="button">
            Vorschau
          </button>
        </div>
        <div className="button-grid compact">
          <button
            className="secondary-button"
            type="button"
            onClick={() => document.querySelector(".certificate-fields")?.scrollIntoView({ behavior: "smooth" })}
          >
            <FileText size={19} /> Texte
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => document.querySelector(".signature-field")?.scrollIntoView({ behavior: "smooth" })}
          >
            <Pencil size={19} /> Unterschrift
          </button>
        </div>
        <p className="micro-note">Am schönsten wirkt das Zeugnis, wenn ihr es nach dem Speichern gemeinsam anschaut.</p>
        <label>
          Kind
          <select value={data.draft.childId} onChange={(event) => updateDraft("childId", event.target.value)}>
            {data.children.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name || "Unbenanntes Kind"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Elternteil
          <select value={data.draft.parentId} onChange={(event) => updateDraft("parentId", event.target.value)}>
            {data.parents.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name || "Unbenannter Elternteil"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kalenderjahr
          <CalendarYearInput
            value={data.draft.year}
            date={data.draft.date}
            onChange={(value) => updateDraft("year", value)}
          />
        </label>
        <label>
          Datum
          <input type="date" value={data.draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
        </label>
        <fieldset className="design-picker design-preview-picker">
          <legend>Design</legend>
          {(["classic", "rainbow", "forest", "space"] as Design[]).map((design) => (
            <button
              key={design}
              className={data.draft.design === design ? "selected" : ""}
              onClick={() => updateDraft("design", design)}
              type="button"
            >
              <DesignPreview design={design} />
              {designLabel(design)}
            </button>
          ))}
        </fieldset>
        <div className="button-grid">
          <button className="primary-button" onClick={saveCertificate}>
            <Save size={19} /> Speichern
          </button>
          <button className="secondary-button" onClick={exportPdf}>
            <Download size={19} /> PDF
          </button>
        </div>
        {lowGrades.length ? (
          <div className="pedagogy-box">
            <HeartHandshake size={22} />
            <p>
              Note 5 oder 6 ist kein Urteil. Sie macht sichtbar, wo ein Kind mehr Sicherheit,
              Aufmerksamkeit oder gemeinsame Zeit braucht.
            </p>
          </div>
        ) : null}
      </aside>

      <article className={`certificate-sheet design-${data.draft.design} ${certificateMode === "preview" ? "preview-mode" : "edit-mode"}`}>
        <header className="certificate-head">
          <div className="certificate-badge">
            <Star size={20} />
            Familienzeugnis
          </div>
          <p>Kalenderjahr {data.draft.year || "____"}</p>
          <h2>Zeugnis für {parent?.name || "____________"}</h2>
          <span>ausgestellt von {child?.name || "____________"} ({ageLabel(child, data.draft.date)})</span>
          <small className="design-subtitle">{designSubtitle(data.draft.design)}</small>
        </header>

        <div className="grade-table">
          {categories.map((category) => (
            <section className="grade-line" key={category.id}>
              <div className="grade-title">
                <span className="category-icon" aria-hidden="true">
                  {category.icon}
                </span>
                <div>
                  <strong>{category.title}</strong>
                  <small>{ageAdaptedHint(category, child, data.draft.date)}</small>
                </div>
              </div>
              {certificateMode === "edit" ? (
                <div className="grade-picker" aria-label={`Note für ${category.title}`}>
                  {gradeItems.map((option) => (
                    <button
                      key={option.grade}
                      aria-label={`${category.title}: ${option.aria}`}
                      className={data.draft.grades[category.id] === option.grade ? "selected" : ""}
                      onClick={() => updateGrade(category.id, option.grade)}
                      type="button"
                    >
                      <span className={`grade-symbol ${option.mode}`}>{option.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <strong className="grade-result">Note {data.draft.grades[category.id]}</strong>
              )}
              {certificateMode === "edit" && data.draft.grades[category.id] >= 5 ? (
                <div className="inline-advice">
                  <Sparkles size={16} />
                  <span>{category.advice}</span>
                  <WishChips category={category} child={child} setData={setData} />
                </div>
              ) : null}
            </section>
          ))}
        </div>

        {certificateMode === "edit" ? (
          <div className="certificate-fields">
            <label>
              Das gibt mir Sicherheit und Freude
              <textarea value={data.draft.strengths} onChange={(event) => updateDraft("strengths", event.target.value)} />
            </label>
            <label>
              Das wünsche ich mir für unser Miteinander
              <textarea value={data.draft.wishes} onChange={(event) => updateDraft("wishes", event.target.value)} />
            </label>
            <label>
              Ein Moment, den ich behalten möchte
              <textarea
                value={data.draft.favoriteMoment}
                onChange={(event) => updateDraft("favoriteMoment", event.target.value)}
              />
            </label>
            <div className="signature-field">
              Unterschrift
              <SignaturePad value={data.draft.signature} onChange={(value) => updateDraft("signature", value)} />
            </div>
          </div>
        ) : (
          <div className="certificate-fields preview-fields">
            <section>
              <strong>Das gibt mir Sicherheit und Freude</strong>
              <p>{data.draft.strengths || "Noch offen"}</p>
            </section>
            <section>
              <strong>Das wünsche ich mir für unser Miteinander</strong>
              <p>{data.draft.wishes || "Noch offen"}</p>
            </section>
            <section>
              <strong>Ein Moment, den ich behalten möchte</strong>
              <p>{data.draft.favoriteMoment || "Noch offen"}</p>
            </section>
          </div>
        )}
        <footer className="certificate-signature">
          <span>{data.draft.date}</span>
          <strong>
            {isSignatureImage(data.draft.signature) ? (
              <img src={data.draft.signature} alt="Unterschrift" />
            ) : (
              data.draft.signature || "Unterschrift"
            )}
          </strong>
        </footer>
      </article>
    </section>
  );
}

function PeopleScreen({
  data,
  setData,
  showToast,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  showToast: (message: string, kind?: ToastKind) => void;
}) {
  const [setupMessage, setSetupMessage] = useState("");
  const setupComplete =
    data.children.length > 0 &&
    data.parents.length > 0 &&
    data.children.every((person) => person.name.trim() && person.name !== "Kind" && person.birthDate) &&
    data.parents.every((person) => person.name.trim() && person.name !== "Elternteil");

  const updatePerson = (group: "children" | "parents", id: string, patch: Partial<Person>) => {
    setSetupMessage("");
    setData((current) => ({
      ...current,
      meta: { ...current.meta, setupComplete: false },
      [group]: current[group].map((person) => (person.id === id ? { ...person, ...patch } : person)),
    }));
  };

  const addPerson = (group: "children" | "parents") => {
    setSetupMessage("");
    setData((current) => ({
      ...current,
      meta: { ...current.meta, setupComplete: false },
      [group]: [
        ...current[group],
        { id: newId(), name: group === "children" ? "Neues Kind" : "Elternteil", email: "", birthDate: "" },
      ],
    }));
  };

  const removePerson = (group: "children" | "parents", id: string) => {
    setSetupMessage("");
    setData((current) => ({
      ...current,
      meta: { ...current.meta, setupComplete: false },
      [group]: current[group].filter((person) => person.id !== id),
    }));
  };

  const completeSetup = () => {
    const missing: string[] = [];
    if (!data.children.length) missing.push("mindestens ein Kind");
    if (data.children.some((person) => !person.name.trim() || person.name === "Kind")) missing.push("richtige Kindernamen");
    if (data.children.some((person) => !person.birthDate)) missing.push("Geburtsdatum für jedes Kind");
    if (!data.parents.length) missing.push("mindestens eine Bezugsperson");
    if (data.parents.some((person) => !person.name.trim() || person.name === "Elternteil")) missing.push("Namen der Bezugspersonen");

    if (missing.length) {
      setSetupMessage(`Bitte ergänzen: ${missing.join(", ")}.`);
      return;
    }

    setData((current) => ({
      ...current,
      meta: { ...current.meta, setupComplete: true },
    }));
    setSetupMessage("");
    showToast("Einrichtung gespeichert. Die altersgerechten Texte sind jetzt aktiv.");
  };

  return (
    <section className="page-grid">
      <section className="panel wide-panel setup-panel">
        <div>
          <p className="eyebrow">Vorbereitung</p>
          <h1>Stammdaten für das Familienritual</h1>
          <p>
            Bereite die Namen vor, damit Kinder später ohne technische Hürden erzählen können,
            was sie stärkt, was sie brauchen und worüber sie gerne sprechen möchten.
          </p>
          <p className="micro-note">Gute Stammdaten machen den Kindermodus ruhiger: weniger Nachfragen, mehr Raum für echte Antworten.</p>
          <button className="primary-button" onClick={completeSetup} disabled={data.meta?.setupComplete && setupComplete}>
            <CheckCircle2 size={19} /> {data.meta?.setupComplete && setupComplete ? "Einrichtung erledigt" : "Einrichtung als erledigt markieren"}
          </button>
          {setupMessage ? <p className="status warn">{setupMessage}</p> : null}
        </div>
      </section>
      <PersonList
        title="Kinder"
        icon={<UserRound size={24} />}
        people={data.children}
        showBirthDate
        showEmail={false}
        onAdd={() => addPerson("children")}
        onRemove={(id) => removePerson("children", id)}
        onChange={(id, patch) => updatePerson("children", id, patch)}
      />
      <PersonList
        title="Eltern und Bezugspersonen"
        icon={<UsersRound size={24} />}
        people={data.parents}
        showBirthDate={false}
        showEmail
        onAdd={() => addPerson("parents")}
        onRemove={(id) => removePerson("parents", id)}
        onChange={(id, patch) => updatePerson("parents", id, patch)}
      />
      <DataTools data={data} setData={setData} />
    </section>
  );
}

function DataTools({
  data,
  setData,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
}) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elternzeugnis-daten-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File | undefined) => {
    if (!file) return;
    const parsed = JSON.parse(await file.text()) as AppData;
    setData(normalizeData(parsed));
  };

  return (
    <section className="panel">
      <div className="panel-title">
        <Upload size={24} />
        <h1>Datensicherung</h1>
      </div>
      <p className="empty-state">
        Sichere Zeugnisse als Familienerinnerung oder übertrage sie auf ein anderes Gerät.
      </p>
      <div className="button-grid">
        <button className="primary-button" onClick={exportData}>
          <Download size={19} /> Export
        </button>
        <label className="file-button">
          <Upload size={19} /> Import
          <input type="file" accept="application/json" onChange={(event) => importData(event.target.files?.[0])} />
        </label>
      </div>
    </section>
  );
}

function PersonList({
  title,
  icon,
  people,
  showEmail,
  showBirthDate,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  icon: ReactNode;
  people: Person[];
  showEmail: boolean;
  showBirthDate: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<Person>) => void;
}) {
  const personStatus = (person: Person) => {
    if (showBirthDate && !person.birthDate) return "Geburtsdatum fehlt";
    if (showEmail && !person.email) return "E-Mail optional";
    return "bereit";
  };

  return (
    <section className="panel">
      <div className="panel-title">
        {icon}
        <h1>{title}</h1>
      </div>
      <div className="person-list">
        {people.map((person) => (
          <article className="person-row person-card" key={person.id}>
            <div className="person-card-head">
              <strong>{person.name || "Unbenannt"}</strong>
              <span className={personStatus(person) === "bereit" ? "status-pill ready" : "status-pill"}>
                {personStatus(person)}
              </span>
              {showBirthDate ? <small>{ageLabel(person)}</small> : null}
            </div>
            <label>
              Name
              <input value={person.name} onChange={(event) => onChange(person.id, { name: event.target.value })} />
            </label>
            {showBirthDate ? (
              <label>
                Geburtsdatum
                <input
                  type="date"
                  value={person.birthDate || ""}
                  onChange={(event) => onChange(person.id, { birthDate: event.target.value })}
                />
              </label>
            ) : null}
            {showEmail ? (
              <label>
                E-Mail für Erinnerungen
                <input
                  type="email"
                  value={person.email || ""}
                  onChange={(event) => onChange(person.id, { email: event.target.value })}
                />
              </label>
            ) : null}
            <button className="icon-button" onClick={() => onRemove(person.id)} aria-label={`${person.name} entfernen`}>
              <Trash2 size={18} />
            </button>
          </article>
        ))}
      </div>
      <button className="secondary-button" onClick={onAdd}>
        <Plus size={19} /> Hinzufügen
      </button>
    </section>
  );
}

function HistoryScreen({
  data,
  setData,
  setView,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  setView: (view: View) => void;
}) {
  const [search, setSearch] = useState("");
  const [childFilter, setChildFilter] = useState("all");
  const [parentFilter, setParentFilter] = useState("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  const analytics = useMemo(() => {
    return data.certificates
      .map((certificate) => {
        const child = data.children.find((person) => person.id === certificate.childId)?.name || "Kind";
        const parent = data.parents.find((person) => person.id === certificate.parentId)?.name || "Elternteil";
        const values = Object.values(certificate.grades);
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        return { ...certificate, label: `${certificate.year} ${parent}`, child, parent, average: Number(average.toFixed(2)) };
      })
      .reverse();
  }, [data]);

  const filteredAnalytics = useMemo(() => {
    const term = search.trim().toLowerCase();
    return analytics.filter((certificate) => {
      if (favoriteOnly && !certificate.favorite) return false;
      if (childFilter !== "all" && certificate.childId !== childFilter) return false;
      if (parentFilter !== "all" && certificate.parentId !== parentFilter) return false;
      if (!term) return true;
      const haystack = `${certificate.year} ${certificate.child} ${certificate.parent} ${certificate.strengths || ""} ${certificate.wishes || ""} ${
        certificate.favoriteMoment || ""
      }`.toLowerCase();
      return haystack.includes(term);
    });
  }, [analytics, childFilter, favoriteOnly, parentFilter, search]);

  const categoryAverages = categories.map((category) => {
    const values = data.certificates.map((certificate) => certificate.grades[category.id]).filter(Boolean);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { name: category.title, average: Number(average.toFixed(2)) };
  });
  const attentionAreas = categoryAverages.filter((item) => item.average >= 4).sort((a, b) => b.average - a.average);
  const positiveAreas = categoryAverages.filter((item) => item.average > 0 && item.average <= 2.5).sort((a, b) => a.average - b.average);

  const editCertificate = (certificate: Certificate) => {
    setData((current) => ({ ...current, draft: { ...certificate, id: newId(), design: certificate.design || "classic" } }));
    setView("certificate");
  };

  const toggleFavorite = (certificateId: string) => {
    setData((current) => ({
      ...current,
      certificates: current.certificates.map((certificate) =>
        certificate.id === certificateId ? { ...certificate, favorite: !certificate.favorite } : certificate,
      ),
    }));
  };

  const deleteCertificate = (certificateId: string) => {
    setData((current) => ({
      ...current,
      certificates: current.certificates.filter((certificate) => certificate.id !== certificateId),
    }));
  };

  return (
    <section className="history-layout">
      <div className="panel">
        <div className="panel-title">
          <BarChart3 size={25} />
          <h1>Verlauf und Auswertung</h1>
        </div>
        <div className="form-grid">
          <label>
            Suche
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Jahr, Name, Text ..." />
          </label>
          <label>
            Kind
            <select value={childFilter} onChange={(event) => setChildFilter(event.target.value)}>
              <option value="all">alle</option>
              {data.children.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Elternteil
            <select value={parentFilter} onChange={(event) => setParentFilter(event.target.value)}>
              <option value="all">alle</option>
              {data.parents.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={favoriteOnly} onChange={(event) => setFavoriteOnly(event.target.checked)} />
            Nur wichtige
          </label>
        </div>
        {data.certificates.length ? (
          <>
            <div className="insight-grid">
              <article>
                <strong>Wiederkehrende Bedürfnisse</strong>
                <span>
                  {attentionAreas.length
                    ? `${attentionAreas[0].name} braucht besonders Aufmerksamkeit. Plant dazu eine kleine, konkrete Abmachung.`
                    : "Aktuell zeigen die Zeugnisse keine starken Belastungsschwerpunkte."}
                </span>
              </article>
              <article>
                <strong>Ressourcen</strong>
                <span>
                  {positiveAreas.length
                    ? `${positiveAreas[0].name} wird häufig als stärkend erlebt. Das ist ein guter Anker für Gespräche.`
                    : "Sobald mehr Zeugnisse gespeichert sind, werden stärkende Muster sichtbarer."}
                </span>
              </article>
            </div>
            <div className="chart-grid">
              <ChartCard title="Notendurchschnitt je Kalenderjahr">
                <LineChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis reversed domain={[1, 6]} ticks={[1, 2, 3, 4, 5, 6]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="average" stroke="#24594c" strokeWidth={3} />
                </LineChart>
              </ChartCard>
              <ChartCard title="Durchschnitt nach Kategorie">
                <BarChart data={categoryAverages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis reversed domain={[1, 6]} ticks={[1, 2, 3, 4, 5, 6]} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#c65d3b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartCard>
            </div>
          </>
        ) : (
          <div className="guided-empty">
            <FileText size={34} />
            <strong>Noch kein Zeugnis gespeichert</strong>
            <p>
              Starte im Kindermodus oder bearbeite ein Zeugnis. Nach dem Speichern wird sichtbar,
              welche Themen sich verbessern und welche Bedürfnisse wiederkehren.
            </p>
            <button className="primary-button" onClick={() => setView("child")}>
              <Pencil size={19} /> Kindermodus starten
            </button>
          </div>
        )}
      </div>

      <div className="timeline">
        {filteredAnalytics
          .slice()
          .reverse()
          .map((certificate) => (
            <article className="timeline-item" key={certificate.id}>
              <strong>
                {certificate.favorite ? "★ " : ""}{certificate.year}: {certificate.child} für {certificate.parent}
              </strong>
              <span>Durchschnitt {certificate.average}</span>
              <p>{certificate.favoriteMoment || certificate.strengths || "Noch kein gemeinsamer Moment notiert."}</p>
              <div className="timeline-actions">
                <button className="secondary-button" onClick={() => editCertificate(certificate)}>
                  <Archive size={18} /> Öffnen
                </button>
                <button className="secondary-button" onClick={() => toggleFavorite(certificate.id)}>
                  <Star size={18} /> {certificate.favorite ? "Wichtig" : "Merken"}
                </button>
                <button className="icon-button" onClick={() => deleteCertificate(certificate.id)} aria-label="Zeugnis löschen">
                  <Trash2 size={18} />
                </button>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactElement }) {
  return (
    <article className="chart-card">
      <h2>{title}</h2>
      <ResponsiveContainer width="100%" height={260}>
        {children}
      </ResponsiveContainer>
    </article>
  );
}

function AdminScreen() {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [message, setMessage] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinDraft, setPinDraft] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const loadStatus = async () => {
    const response = await apiFetch("/api/admin/status");
    if (!response.ok) throw new Error("Adminstatus konnte nicht geladen werden.");
    setStatus((await response.json()) as AdminStatus);
  };

  const loadConfig = async () => {
    const response = await apiFetch("/api/admin/config");
    if (!response.ok) throw new Error("Admin-Konfiguration konnte nicht geladen werden.");
    const config = (await response.json()) as { familyPinEnabled: boolean };
    setPinEnabled(Boolean(config.familyPinEnabled));
  };

  useEffect(() => {
    Promise.all([loadStatus(), loadConfig()]).catch(() => setMessage("Admin-API ist nicht erreichbar."));
  }, []);

  const savePin = async () => {
    setPinBusy(true);
    try {
      const response = await apiFetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyPin: pinDraft }),
      });
      const result = (await response.json().catch(() => ({}))) as { familyPinEnabled?: boolean; error?: string };
      setMessage(response.ok ? "Familien-PIN wurde gespeichert." : result.error || "PIN konnte nicht gespeichert werden.");
      setPinDraft("");
      await loadConfig();
    } catch {
      setMessage("PIN konnte nicht gespeichert werden. Bitte prüfen, ob der Server läuft.");
    } finally {
      setPinBusy(false);
    }
  };

  const disablePin = async () => {
    setPinBusy(true);
    try {
      const response = await apiFetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyPin: "" }),
      });
      setMessage(response.ok ? "Familien-PIN wurde deaktiviert." : "PIN konnte nicht deaktiviert werden.");
      setPinDraft("");
      await loadConfig();
    } catch {
      setMessage("PIN konnte nicht deaktiviert werden. Bitte prüfen, ob der Server läuft.");
    } finally {
      setPinBusy(false);
    }
  };

  const createBackupNow = async () => {
    const response = await apiFetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "manual" }),
    });
    const result = (await response.json()) as { files?: string[] };
    setMessage(response.ok ? `Backup erstellt: ${result.files?.length || 0} Datei(en).` : "Backup konnte nicht erstellt werden.");
    await loadStatus();
  };

  return (
    <section className="page-grid">
      <section className="panel">
        <div className="panel-title">
          <Lock size={25} />
          <h1>Familien-PIN</h1>
        </div>
        <p className="empty-state">
          Damit die App im Heimnetz nicht offen herumsteht, kannst du hier eine PIN aktivieren oder ändern.
        </p>
        <div className={pinEnabled ? "status ok" : "status warn"}>
          <Lock size={18} /> {pinEnabled ? "PIN ist aktiv" : "PIN ist deaktiviert"}
        </div>
        <div className="form-grid">
          <label>
            Neue PIN
            <input value={pinDraft} onChange={(event) => setPinDraft(event.target.value)} inputMode="numeric" type="password" />
          </label>
        </div>
        <div className="button-grid compact">
          <button className="primary-button" onClick={savePin} disabled={pinBusy || !pinDraft}>
            <Save size={19} /> Speichern
          </button>
          <button className="secondary-button" onClick={disablePin} disabled={pinBusy || !pinEnabled}>
            <Trash2 size={19} /> Deaktivieren
          </button>
        </div>
      </section>
      <section className="panel wide-panel">
        <div className="panel-title">
          <Database size={25} />
          <h1>Systemstatus</h1>
        </div>
        <p className="empty-state">
          Prüfe Serverstatus, zentrale Datenbank, Erinnerungsdaten und erstelle bei Bedarf ein manuelles Backup.
        </p>
        <div className="button-grid compact">
          <button className="primary-button" onClick={createBackupNow}>
            <Database size={19} /> Backup erstellen
          </button>
          <button className="secondary-button" onClick={() => loadStatus()}>
            <RefreshCw size={19} /> Neu prüfen
          </button>
        </div>
        {message ? <p className="success-message">{message}</p> : null}
      </section>

      {status ? (
        <>
          <section className="panel">
            <div className="panel-title">
              <Database size={24} />
              <h1>Daten</h1>
            </div>
            <dl className="admin-list">
              <dt>Datenbank</dt>
              <dd>{status.databaseAvailable ? "bereit" : "fehlt"}</dd>
              <dt>Speicherort</dt>
              <dd>{status.databaseFile}</dd>
              <dt>Backups</dt>
              <dd>{status.backupsDir}</dd>
              <dt>Zuletzt geändert</dt>
              <dd>{status.updatedAt || "noch nicht gespeichert"}</dd>
            </dl>
          </section>
          <section className="panel">
            <div className="panel-title">
              <BarChart3 size={24} />
              <h1>Inhalte</h1>
            </div>
            <dl className="admin-list">
              <dt>Kinder</dt>
              <dd>{status.counts.children}</dd>
              <dt>Eltern/Bezugspersonen</dt>
              <dd>{status.counts.parents}</dd>
              <dt>Zeugnisse</dt>
              <dd>{status.counts.certificates}</dd>
              <dt>SMTP</dt>
              <dd>{status.smtpConfigured ? "konfiguriert" : "nicht konfiguriert"}</dd>
            </dl>
          </section>
        </>
      ) : null}
    </section>
  );
}

async function readApiJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { error?: string; ok?: boolean };
  } catch {
    return { error: text };
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ReminderScreen({ data }: { data: AppData }) {
  const [smtpReady, setSmtpReady] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [message, setMessage] = useState("");
  const [smtpMessage, setSmtpMessage] = useState("");
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: "",
    port: "587",
    secure: false,
    user: "",
    pass: "",
    from: "",
    appUrl: "http://127.0.0.1:5173",
  });
  const firstChild = data.children[0];
  const firstParent = data.parents[0];
  const [form, setForm] = useState({
    childId: firstChild?.id || "",
    parentId: firstParent?.id || "",
    email: firstParent?.email || "",
    date: today(),
    time: "09:00",
    frequency: "yearly" as Frequency,
  });

  const loadReminders = async () => {
    const [statusResponse, remindersResponse] = await Promise.all([
      apiFetch("/api/reminders/status"),
      apiFetch("/api/reminders"),
    ]);
    const status = await statusResponse.json();
    setSmtpReady(status.smtpConfigured);
    setReminders(await remindersResponse.json());
  };

  const loadSmtpConfig = async () => {
    const response = await apiFetch("/api/smtp/config");
    const config = await response.json();
    setSmtpConfig({ ...config, pass: "" });
    setSmtpReady(Boolean(config.configured));
  };

  useEffect(() => {
    Promise.all([loadReminders(), loadSmtpConfig()]).catch(() => setMessage("Reminder-API ist noch nicht erreichbar."));
  }, []);

  const selectedChild = data.children.find((person) => person.id === form.childId) || firstChild;
  const selectedParent = data.parents.find((person) => person.id === form.parentId) || firstParent;

  const saveSmtpConfig = async () => {
    try {
      const response = await apiFetch("/api/smtp/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(smtpConfig),
      });
      const result = await readApiJson(response);
      setSmtpMessage(response.ok ? "SMTP wurde gespeichert." : result.error || "SMTP konnte nicht gespeichert werden.");
      await loadSmtpConfig();
      await loadReminders();
    } catch {
      setSmtpMessage("SMTP konnte nicht gespeichert werden. Bitte prüfen, ob der Server läuft.");
    }
  };

  const sendTestMail = async () => {
    if (!isValidEmail(form.email)) {
      setSmtpMessage("Bitte eine gültige E-Mail-Adresse eintragen.");
      return;
    }
    try {
      const response = await apiFetch("/api/reminders/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: selectedChild?.name,
          recipientName: selectedParent?.name,
          email: form.email,
        }),
      });
      const result = await readApiJson(response);
      setSmtpMessage(response.ok ? "Testmail wurde versendet." : result.error || "Testmail konnte nicht versendet werden.");
      await loadReminders();
    } catch {
      setSmtpMessage("Testmail konnte nicht versendet werden. Bitte prüfen, ob der Server läuft.");
    }
  };

  const saveReminder = async () => {
    if (!isValidEmail(form.email)) {
      setMessage("Bitte eine gültige E-Mail-Adresse eintragen.");
      return;
    }
    try {
      const response = await apiFetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: selectedChild?.name,
          recipientName: selectedParent?.name,
          email: form.email,
          date: form.date,
          time: form.time,
          frequency: form.frequency,
        }),
      });
      const result = await readApiJson(response);
      setMessage(response.ok ? "Erinnerung gespeichert." : result.error || "Erinnerung konnte nicht gespeichert werden.");
      if (response.ok) await loadReminders();
    } catch {
      setMessage("Erinnerung konnte nicht gespeichert werden. Bitte prüfen, ob der Server läuft.");
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const response = await apiFetch(`/api/reminders/${id}`, { method: "DELETE" });
      setMessage(response.ok ? "Erinnerung entfernt." : "Erinnerung konnte nicht entfernt werden.");
      if (response.ok) await loadReminders();
    } catch {
      setMessage("Erinnerung konnte nicht entfernt werden. Bitte prüfen, ob der Server läuft.");
    }
  };

  return (
    <section className="page-grid">
      <section className="panel wide-panel">
        <div className="panel-title">
          <Mail size={25} />
          <h1>SMTP-Konfiguration</h1>
        </div>
        <div className={smtpReady ? "status ok" : "status warn"}>
          <Mail size={18} />
          {smtpReady
            ? "E-Mail-Erinnerungen sind bereit, damit das Gespräch nicht im Alltag untergeht."
            : "Trage SMTP-Daten ein, damit Erinnerungen zuverlässig verschickt werden können."}
        </div>
        <div className="form-grid">
          <label>
            SMTP Host
            <input value={smtpConfig.host} onChange={(event) => setSmtpConfig({ ...smtpConfig, host: event.target.value })} />
          </label>
          <label>
            Port
            <input value={smtpConfig.port} onChange={(event) => setSmtpConfig({ ...smtpConfig, port: event.target.value })} />
          </label>
          <label>
            Benutzer
            <input value={smtpConfig.user} onChange={(event) => setSmtpConfig({ ...smtpConfig, user: event.target.value })} />
          </label>
          <label>
            Passwort
            <input
              type="password"
              value={smtpConfig.pass}
              placeholder="leer lassen, um gespeichertes Passwort zu behalten"
              onChange={(event) => setSmtpConfig({ ...smtpConfig, pass: event.target.value })}
            />
          </label>
          <label>
            Absender
            <input
              value={smtpConfig.from}
              placeholder="Elternzeugnis <noreply@example.com>"
              onChange={(event) => setSmtpConfig({ ...smtpConfig, from: event.target.value })}
            />
          </label>
          <label>
            App-Link in der Mail
            <input value={smtpConfig.appUrl} onChange={(event) => setSmtpConfig({ ...smtpConfig, appUrl: event.target.value })} />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={smtpConfig.secure}
              onChange={(event) => setSmtpConfig({ ...smtpConfig, secure: event.target.checked })}
            />
            SSL/TLS direkt verwenden
          </label>
        </div>
        <div className="button-grid compact">
          <button className="primary-button" onClick={saveSmtpConfig}>
            <Save size={19} /> SMTP speichern
          </button>
          <button className="secondary-button" onClick={sendTestMail}>
            <Mail size={19} /> Test senden
          </button>
        </div>
        {smtpMessage ? <p className="form-message">{smtpMessage}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-title">
          <CalendarClock size={25} />
          <h1>Erinnerung planen</h1>
        </div>
        <p className="empty-state">
          Ein wiederkehrender Termin macht aus dem Zeugnis kein Einzelereignis, sondern ein ruhiges
          Gespräch über Beziehung, Wünsche und Entwicklung.
        </p>
        <div className="form-grid">
          <label>
            Kind
            <select value={form.childId} onChange={(event) => setForm({ ...form, childId: event.target.value })}>
              {data.children.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Elternteil
            <select
              value={form.parentId}
              onChange={(event) => {
                const parent = data.parents.find((person) => person.id === event.target.value);
                setForm({ ...form, parentId: event.target.value, email: parent?.email || form.email });
              }}
            >
              {data.parents.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            E-Mail
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label>
            Datum
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </label>
          <label>
            Uhrzeit
            <input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
          </label>
          <label>
            Wiederholung
            <select
              value={form.frequency}
              onChange={(event) => setForm({ ...form, frequency: event.target.value as Frequency })}
            >
              <option value="once">einmalig</option>
              <option value="monthly">monatlich</option>
              <option value="yearly">jährlich</option>
            </select>
          </label>
        </div>
        <button className="primary-button" onClick={saveReminder}>
          <Save size={19} /> Erinnerung speichern
        </button>
        {message ? <p className="form-message">{message}</p> : null}
      </section>

      <section className="panel">
        <div className="panel-title">
          <Mail size={25} />
          <h1>Geplante Erinnerungen</h1>
        </div>
        <div className="reminder-list">
          {reminders.length ? (
            reminders.map((reminder) => (
              <article className="reminder-row" key={reminder.id}>
                <div>
                  <strong>
                    {reminder.childName} für {reminder.recipientName}
                  </strong>
                  <span>
                    {reminder.date} um {reminder.time}, {reminder.frequency}
                  </span>
                  <small>{reminder.email}</small>
                </div>
                <button className="icon-button" onClick={() => deleteReminder(reminder.id)} aria-label="Erinnerung entfernen">
                  <Trash2 size={18} />
                </button>
              </article>
            ))
          ) : (
            <div className="guided-empty">
              <CalendarClock size={34} />
              <strong>Noch keine Erinnerung geplant</strong>
              <p>Plane einen Termin, damit Zuhören, Lob und Wünsche regelmäßig Raum bekommen.</p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function PinGate({ onLogin }: { onLogin: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await onLogin(pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PIN ist falsch.");
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand-row">
          <div className="brand" aria-label="Elternzeugnis">
            <span className="brand-mark">
              <img src="/logo-elternzeugnis.png" alt="" />
            </span>
            <span>
              <strong>Elternzeugnis</strong>
              <small>Zeugnisse, Erinnerungen und Jahresverlauf</small>
            </span>
          </div>
        </div>
      </header>
      <main>
        <section className="guided-empty">
          <Lock size={34} />
          <strong>Familien-PIN</strong>
          <p>Bitte PIN eingeben, um die App im Heimnetz zu öffnen.</p>
          <label>
            PIN
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              type="password"
              autoFocus
            />
          </label>
          <button className="primary-button" onClick={submit} disabled={busy || !pin}>
            {busy ? "Prüfe" : "Öffnen"}
          </button>
          {error ? <p className="error-message">{error}</p> : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Open Source Projekt von Michael Schellenberger</strong>
        <a href={githubUrl} target="_blank" rel="noreferrer">
          <Github size={18} /> GitHub
        </a>
      </div>
      <span title={`Branch ${appBranch}, Build ${appBuildTime}`}>Rev. {appVersion}-{appRevision}</span>
    </footer>
  );
}
