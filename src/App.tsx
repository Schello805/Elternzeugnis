import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Github,
  HeartHandshake,
  Mail,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
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

type View = "home" | "certificate" | "child" | "people" | "history" | "reminders";
type Frequency = "once" | "monthly" | "yearly";
type Design = "classic" | "rainbow" | "forest" | "space";

type Person = {
  id: string;
  name: string;
  email?: string;
};

type Category = {
  id: string;
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
};

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

const categories: Category[] = [
  {
    id: "geduld",
    title: "Geduld",
    childHint: "Bleibt ruhig, wenn etwas nicht sofort klappt?",
    advice: "Ein Familien-Codewort für kurze Pausen kann helfen.",
  },
  {
    id: "zuhoren",
    title: "Zuhören",
    childHint: "Hört zu, ohne sofort zu schimpfen oder abzulenken?",
    advice: "Zehn Minuten Redezeit ohne Handy sind ein guter Anfang.",
  },
  {
    id: "spielzeit",
    title: "Spielzeit",
    childHint: "Nimmt sich Zeit für Spiel, Vorlesen oder Quatsch?",
    advice: "Lieber kurz und wirklich gemeinsam als lang und halb dabei.",
  },
  {
    id: "trosten",
    title: "Trösten",
    childHint: "Ist da, wenn du traurig, wütend oder unsicher bist?",
    advice: "Erst fragen: Brauchst du Trost, Hilfe oder Ruhe?",
  },
  {
    id: "lernen",
    title: "Lernhilfe",
    childHint: "Erklärt ohne Druck und macht Mut?",
    advice: "Fehler zeigen nur, was als Nächstes geübt wird.",
  },
  {
    id: "fairness",
    title: "Fairness",
    childHint: "Sind Regeln verständlich und möglichst gerecht?",
    advice: "Regeln gemeinsam besprechen und sichtbar aufschreiben.",
  },
  {
    id: "abenteuer",
    title: "Abenteuer",
    childHint: "Gibt es Ausflüge, Bewegung und gemeinsame Erlebnisse?",
    advice: "Ein Ideen-Glas macht kleine gemeinsame Pläne leichter.",
  },
  {
    id: "versoehnen",
    title: "Versöhnen",
    childHint: "Kann sich entschuldigen und wieder freundlich werden?",
    advice: "Nach Streit hilft: Ich mag dich, wir versuchen es nochmal.",
  },
];

const defaultGrades = Object.fromEntries(categories.map((category) => [category.id, 2]));

function newId() {
  return crypto.randomUUID();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function newCertificate(childId = "child-1", parentId = "parent-1"): Certificate {
  return {
    id: newId(),
    childId,
    parentId,
    year: "2025/2026",
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
};

function designLabel(design: Design) {
  const labels: Record<Design, string> = {
    classic: "Klassisch",
    rainbow: "Bunt",
    forest: "Natur",
    space: "Sterne",
  };
  return labels[design];
}

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return initialData;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...initialData,
      ...parsed,
      children: parsed.children?.length ? parsed.children : initialData.children,
      parents: parsed.parents?.length ? parsed.parents : initialData.parents,
      draft: parsed.draft ? { ...newCertificate(), ...parsed.draft } : initialData.draft,
      certificates: parsed.certificates || [],
    };
  } catch {
    return initialData;
  }
}

export function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [view, setView] = useState<View>("home");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  return (
    <div className="app-shell">
      <Header />
      <main>
        <AppWorkspace data={data} setData={setData} view={view} setView={setView} />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="topbar">
      <div className="brand" aria-label="Elternzeugnis">
        <span className="brand-mark">
          <BookOpen size={23} />
        </span>
        <span>
          <strong>Elternzeugnis</strong>
          <small>Zeugnisse, Erinnerungen und Jahresverlauf</small>
        </span>
      </div>
      <nav className="topnav" aria-label="Hauptnavigation">
        <a href={githubUrl} target="_blank" rel="noreferrer">
          <Github size={18} /> GitHub
        </a>
      </nav>
    </header>
  );
}

function AppWorkspace({
  data,
  setData,
  view,
  setView,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
  view: View;
  setView: (view: View) => void;
}) {
  return (
    <div className="app-workspace">
      <nav className="module-tabs" aria-label="Arbeitsbereiche">
        <Tab active={view === "home"} onClick={() => setView("home")} icon={<Star size={19} />} label="Start" />
        <Tab active={view === "child"} onClick={() => setView("child")} icon={<Pencil size={19} />} label="Kindermodus" />
        <Tab active={view === "certificate"} onClick={() => setView("certificate")} icon={<BookOpen size={19} />} label="Zeugnis" />
        <Tab active={view === "people"} onClick={() => setView("people")} icon={<UsersRound size={19} />} label="Stammdaten" />
        <Tab active={view === "history"} onClick={() => setView("history")} icon={<BarChart3 size={19} />} label="Verlauf" />
        <Tab active={view === "reminders"} onClick={() => setView("reminders")} icon={<CalendarClock size={19} />} label="Erinnerungen" />
      </nav>

      {view === "home" ? <Dashboard data={data} setView={setView} /> : null}
      {view === "child" ? <ChildModeScreen data={data} setData={setData} setView={setView} /> : null}
      {view === "certificate" ? <CertificateScreen data={data} setData={setData} /> : null}
      {view === "people" ? <PeopleScreen data={data} setData={setData} /> : null}
      {view === "history" ? <HistoryScreen data={data} setData={setData} setView={setView} /> : null}
      {view === "reminders" ? <ReminderScreen data={data} /> : null}
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

function Dashboard({ data, setView }: { data: AppData; setView: (view: View) => void }) {
  const lastCertificate = data.certificates[0];
  const draftHasText = Boolean(
    data.draft.strengths || data.draft.wishes || data.draft.favoriteMoment || data.draft.signature,
  );

  return (
    <section className="dashboard">
      <div className="dashboard-hero">
        <p className="eyebrow">Familien-App</p>
        <h1>Ein kleines Ritual für mehr Verbindung</h1>
        <p>
          Kinder füllen ein Elternzeugnis aus, Eltern sehen Entwicklung über die Jahre und
          Erinnerungen helfen, das Ritual nicht zu vergessen.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={() => setView("child")}>
            <Pencil size={19} /> Kindermodus starten
          </button>
          <button className="secondary-button" onClick={() => setView("certificate")}>
            <BookOpen size={19} /> Zeugnis bearbeiten
          </button>
        </div>
      </div>

      <div className="dashboard-cards">
        <button className="dashboard-card" onClick={() => setView("child")}>
          <Pencil size={25} />
          <strong>Neues Zeugnis</strong>
          <span>Große Buttons, wenig Ablenkung.</span>
        </button>
        <button className="dashboard-card" onClick={() => setView(draftHasText ? "certificate" : "people")}>
          <FileText size={25} />
          <strong>{draftHasText ? "Entwurf fortsetzen" : "Stammdaten anlegen"}</strong>
          <span>{draftHasText ? "Der aktuelle Entwurf wartet." : "Kinder und Eltern vorbereiten."}</span>
        </button>
        <button className="dashboard-card" onClick={() => setView("history")}>
          <BarChart3 size={25} />
          <strong>{data.certificates.length} gespeicherte Zeugnisse</strong>
          <span>{lastCertificate ? `Zuletzt: ${lastCertificate.year}` : "Noch keine Auswertung."}</span>
        </button>
        <button className="dashboard-card" onClick={() => setView("reminders")}>
          <CalendarClock size={25} />
          <strong>Erinnerungen</strong>
          <span>SMTP einrichten und Termine planen.</span>
        </button>
      </div>
    </section>
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
  const [focusIndex, setFocusIndex] = useState(0);
  const category = categories[focusIndex];

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

  return (
    <section className="child-mode">
      <div className="child-card">
        <p className="eyebrow">Kindermodus</p>
        <h1>
          {child?.name || "Kind"} bewertet {parent?.name || "Elternteil"}
        </h1>
        <div className="progress-track">
          <span style={{ width: `${((focusIndex + 1) / categories.length) * 100}%` }} />
        </div>
        <div className="child-question">
          <strong>{category.title}</strong>
          <p>{category.childHint}</p>
        </div>
        <div className="big-grade-grid">
          {[1, 2, 3, 4, 5, 6].map((grade) => (
            <button
              key={grade}
              className={data.draft.grades[category.id] === grade ? "selected" : ""}
              onClick={() => updateGrade(grade)}
            >
              <span>{grade}</span>
              <small>{gradeCopy(grade)}</small>
            </button>
          ))}
        </div>
        {data.draft.grades[category.id] >= 5 ? <WishChips category={category} setData={setData} /> : null}
        <div className="hero-actions">
          <button className="secondary-button" onClick={previous} disabled={focusIndex === 0}>
            Zurück
          </button>
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
  return ["", "Super", "Gut", "Okay", "Üben", "Mehr Hilfe", "Reden"][grade];
}

function WishChips({
  category,
  setData,
}: {
  category: Category;
  setData: Dispatch<SetStateAction<AppData>>;
}) {
  const wishes = [
    `Ich wünsche mir bei ${category.title.toLowerCase()} mehr Zeit.`,
    `Bitte frag mich, was ich brauche.`,
    `Lass uns dafür eine kleine Abmachung machen.`,
  ];

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
      <strong>Das kannst du freundlich sagen:</strong>
      {wishes.map((wish) => (
        <button key={wish} onClick={() => addWish(wish)}>
          {wish}
        </button>
      ))}
    </div>
  );
}

function CertificateScreen({
  data,
  setData,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
}) {
  const child = data.children.find((person) => person.id === data.draft.childId) || data.children[0];
  const parent = data.parents.find((person) => person.id === data.draft.parentId) || data.parents[0];
  const lowGrades = categories.filter((category) => data.draft.grades[category.id] >= 5);
  const [feedback, setFeedback] = useState("");

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
    setFeedback("Zeugnis gespeichert. Im Verlauf findest du es wieder.");
  };

  const exportPdf = async () => {
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
    setFeedback("PDF wurde erstellt.");
  };

  return (
    <section className="certificate-layout">
      <aside className="side-panel no-print">
        <p className="eyebrow">Eingabe</p>
        <h1>Direkt ins Zeugnis schreiben</h1>
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
          Zeugnisjahr
          <input value={data.draft.year} onChange={(event) => updateDraft("year", event.target.value)} />
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
              <span className={`design-preview ${design}`}>
                <span />
                <i />
              </span>
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
              Note 5 oder 6 ist hier kein Urteil. Sie zeigt einen Wunsch nach mehr Verbindung,
              Ruhe oder gemeinsamer Zeit.
            </p>
          </div>
        ) : null}
        {feedback ? <p className="success-message">{feedback}</p> : null}
      </aside>

      <article className={`certificate-sheet design-${data.draft.design}`}>
        <header className="certificate-head">
          <div className="certificate-badge">
            <Star size={20} />
            Familienzeugnis
          </div>
          <p>Schuljahr {data.draft.year || "____ / ____"}</p>
          <h2>Zeugnis für {parent?.name || "____________"}</h2>
          <span>ausgestellt von {child?.name || "____________"}</span>
        </header>

        <div className="grade-table">
          {categories.map((category) => (
            <section className="grade-line" key={category.id}>
              <div>
                <strong>{category.title}</strong>
                <small>{category.childHint}</small>
              </div>
              <div className="grade-picker" aria-label={`Note für ${category.title}`}>
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <button
                    key={grade}
                    className={data.draft.grades[category.id] === grade ? "selected" : ""}
                    onClick={() => updateGrade(category.id, grade)}
                    type="button"
                  >
                    {grade}
                  </button>
                ))}
              </div>
              {data.draft.grades[category.id] >= 5 ? (
                <div className="inline-advice">
                  <Sparkles size={16} />
                  <span>{category.advice}</span>
                  <WishChips category={category} setData={setData} />
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <div className="certificate-fields">
          <label>
            Das klappt richtig gut
            <textarea value={data.draft.strengths} onChange={(event) => updateDraft("strengths", event.target.value)} />
          </label>
          <label>
            Das wünsche ich mir noch
            <textarea value={data.draft.wishes} onChange={(event) => updateDraft("wishes", event.target.value)} />
          </label>
          <label>
            Mein schönster Moment
            <textarea
              value={data.draft.favoriteMoment}
              onChange={(event) => updateDraft("favoriteMoment", event.target.value)}
            />
          </label>
          <label>
            Unterschrift
            <input value={data.draft.signature} onChange={(event) => updateDraft("signature", event.target.value)} />
          </label>
        </div>
        <footer className="certificate-signature">
          <span>{data.draft.date}</span>
          <strong>{data.draft.signature || "Unterschrift"}</strong>
        </footer>
      </article>
    </section>
  );
}

function PeopleScreen({
  data,
  setData,
}: {
  data: AppData;
  setData: Dispatch<SetStateAction<AppData>>;
}) {
  const updatePerson = (group: "children" | "parents", id: string, patch: Partial<Person>) => {
    setData((current) => ({
      ...current,
      [group]: current[group].map((person) => (person.id === id ? { ...person, ...patch } : person)),
    }));
  };

  const addPerson = (group: "children" | "parents") => {
    setData((current) => ({
      ...current,
      [group]: [...current[group], { id: newId(), name: group === "children" ? "Neues Kind" : "Elternteil", email: "" }],
    }));
  };

  const removePerson = (group: "children" | "parents", id: string) => {
    setData((current) => ({
      ...current,
      [group]: current[group].filter((person) => person.id !== id),
    }));
  };

  return (
    <section className="page-grid">
      <section className="panel wide-panel setup-panel">
        <div>
          <p className="eyebrow">Vorbereitung</p>
          <h1>Stammdaten für das Familienritual</h1>
          <p>
            Lege hier Kinder, Eltern und E-Mail-Adressen an. Danach ist der Kindermodus einfacher,
            weil Kinder nur noch auswählen und bewerten müssen.
          </p>
        </div>
      </section>
      <PersonList
        title="Kinder"
        icon={<UserRound size={24} />}
        people={data.children}
        showEmail={false}
        onAdd={() => addPerson("children")}
        onRemove={(id) => removePerson("children", id)}
        onChange={(id, patch) => updatePerson("children", id, patch)}
      />
      <PersonList
        title="Eltern und Bezugspersonen"
        icon={<UsersRound size={24} />}
        people={data.parents}
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
    setData({
      ...initialData,
      ...parsed,
      children: parsed.children?.length ? parsed.children : initialData.children,
      parents: parsed.parents?.length ? parsed.parents : initialData.parents,
      draft: parsed.draft || newCertificate(),
      certificates: parsed.certificates || [],
    });
  };

  return (
    <section className="panel">
      <div className="panel-title">
        <Upload size={24} />
        <h1>Datensicherung</h1>
      </div>
      <p className="empty-state">
        Exportiere Stammdaten, Entwurf und Verlauf als JSON-Datei oder lies eine Sicherung wieder ein.
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
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  icon: ReactNode;
  people: Person[];
  showEmail: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, patch: Partial<Person>) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-title">
        {icon}
        <h1>{title}</h1>
      </div>
      <div className="person-list">
        {people.map((person) => (
          <article className="person-row" key={person.id}>
            <label>
              Name
              <input value={person.name} onChange={(event) => onChange(person.id, { name: event.target.value })} />
            </label>
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

  const categoryAverages = categories.map((category) => {
    const values = data.certificates.map((certificate) => certificate.grades[category.id]).filter(Boolean);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { name: category.title, average: Number(average.toFixed(2)) };
  });

  const editCertificate = (certificate: Certificate) => {
    setData((current) => ({ ...current, draft: { ...certificate, id: newId(), design: certificate.design || "classic" } }));
    setView("certificate");
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
        {data.certificates.length ? (
          <div className="chart-grid">
            <ChartCard title="Notendurchschnitt je Zeugnis">
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
        ) : (
          <div className="guided-empty">
            <FileText size={34} />
            <strong>Noch kein Zeugnis gespeichert</strong>
            <p>Starte im Kindermodus oder bearbeite ein Zeugnis. Nach dem Speichern entstehen hier Verlauf und Grafiken.</p>
            <button className="primary-button" onClick={() => setView("child")}>
              <Pencil size={19} /> Kindermodus starten
            </button>
          </div>
        )}
      </div>

      <div className="timeline">
        {analytics
          .slice()
          .reverse()
          .map((certificate) => (
            <article className="timeline-item" key={certificate.id}>
              <strong>
                {certificate.year}: {certificate.child} für {certificate.parent}
              </strong>
              <span>Durchschnitt {certificate.average}</span>
              <p>{certificate.favoriteMoment || certificate.strengths || "Kein Freitext eingetragen."}</p>
              <div className="timeline-actions">
                <button className="secondary-button" onClick={() => editCertificate(certificate)}>
                  Bearbeiten
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
      fetch("/api/reminders/status"),
      fetch("/api/reminders"),
    ]);
    const status = await statusResponse.json();
    setSmtpReady(status.smtpConfigured);
    setReminders(await remindersResponse.json());
  };

  const loadSmtpConfig = async () => {
    const response = await fetch("/api/smtp/config");
    const config = await response.json();
    setSmtpConfig({ ...config, pass: "" });
    setSmtpReady(Boolean(config.configured));
  };

  useEffect(() => {
    Promise.all([loadReminders(), loadSmtpConfig()]).catch(() => setMessage("Reminder-API ist noch nicht erreichbar."));
  }, []);

  const selectedChild = data.children.find((person) => person.id === form.childId) || firstChild;
  const selectedParent = data.parents.find((person) => person.id === form.parentId) || firstParent;

  const saveReminder = async () => {
    const response = await fetch("/api/reminders", {
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
    setMessage(response.ok ? "Erinnerung gespeichert." : "Erinnerung konnte nicht gespeichert werden.");
    await loadReminders();
  };

  const deleteReminder = async (id: string) => {
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    await loadReminders();
  };

  const saveSmtpConfig = async () => {
    const response = await fetch("/api/smtp/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smtpConfig),
    });
    const config = await response.json();
    setSmtpConfig({ ...config, pass: "" });
    setSmtpReady(Boolean(config.configured));
    setSmtpMessage(response.ok ? "SMTP-Konfiguration gespeichert." : "SMTP-Konfiguration konnte nicht gespeichert werden.");
  };

  const sendTestMail = async () => {
    const response = await fetch("/api/reminders/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childName: selectedChild?.name,
        recipientName: selectedParent?.name,
        email: form.email,
      }),
    });
    const result = await response.json();
    setSmtpMessage(response.ok ? "Testmail wurde versendet." : result.error || "Testmail konnte nicht versendet werden.");
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
            ? "SMTP ist gespeichert. Erinnerungen und Testmails können versendet werden."
            : "SMTP ist noch nicht vollständig. Trage Host, Benutzer und Passwort ein."}
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
              <p>Speichere links einen Termin, damit das Elternzeugnis jedes Jahr wieder ins Familienleben passt.</p>
            </div>
          )}
        </div>
      </section>
    </section>
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
