import {
  BarChart3,
  BookOpen,
  CalendarClock,
  Cookie,
  Download,
  Github,
  HeartHandshake,
  Home,
  Info,
  Mail,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
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

type Route = "/" | "/impressum" | "/datenschutz" | "/cookies";
type View = "certificate" | "people" | "history" | "reminders";
type Frequency = "once" | "monthly" | "yearly";

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

const categories: Category[] = [
  {
    id: "geduld",
    title: "Geduld",
    childHint: "Bleibt ruhig, wenn etwas nicht sofort klappt?",
    advice: "Ein Familien-Codewort fuer kurze Pausen kann helfen.",
  },
  {
    id: "zuhoren",
    title: "Zuhoeren",
    childHint: "Hoert zu, ohne sofort zu schimpfen oder abzulenken?",
    advice: "Zehn Minuten Redezeit ohne Handy sind ein guter Anfang.",
  },
  {
    id: "spielzeit",
    title: "Spielzeit",
    childHint: "Nimmt sich Zeit fuer Spiel, Vorlesen oder Quatsch?",
    advice: "Lieber kurz und wirklich gemeinsam als lang und halb dabei.",
  },
  {
    id: "trosten",
    title: "Troesten",
    childHint: "Ist da, wenn du traurig, wuetend oder unsicher bist?",
    advice: "Erst fragen: Brauchst du Trost, Hilfe oder Ruhe?",
  },
  {
    id: "lernen",
    title: "Lernhilfe",
    childHint: "Erklaert ohne Druck und macht Mut?",
    advice: "Fehler zeigen nur, was als Naechstes geuebt wird.",
  },
  {
    id: "fairness",
    title: "Fairness",
    childHint: "Sind Regeln verstaendlich und moeglichst gerecht?",
    advice: "Regeln gemeinsam besprechen und sichtbar aufschreiben.",
  },
  {
    id: "abenteuer",
    title: "Abenteuer",
    childHint: "Gibt es Ausfluege, Bewegung und gemeinsame Erlebnisse?",
    advice: "Ein Ideen-Glas macht kleine gemeinsame Plaene leichter.",
  },
  {
    id: "versoehnen",
    title: "Versoehnen",
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

function getRoute(): Route {
  const path = window.location.pathname;
  if (path === "/impressum" || path === "/datenschutz" || path === "/cookies") return path;
  return "/";
}

function navigate(route: Route) {
  window.history.pushState({}, "", route);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function App() {
  const [data, setData] = useState<AppData>(loadData);
  const [route, setRoute] = useState<Route>(getRoute);
  const [view, setView] = useState<View>("certificate");

  useEffect(() => {
    const handleRoute = () => setRoute(getRoute());
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  return (
    <div className="app-shell">
      <Header />
      <main>
        {route === "/" ? (
          <AppWorkspace data={data} setData={setData} view={view} setView={setView} />
        ) : (
          <LegalPage route={route} />
        )}
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate("/")} aria-label="Zur Zeugnis-App">
        <span className="brand-mark">
          <BookOpen size={23} />
        </span>
        <span>
          <strong>Elternzeugnis</strong>
          <small>Zeugnisse, Erinnerungen und Jahresverlauf</small>
        </span>
      </button>
      <nav className="topnav" aria-label="Hauptnavigation">
        <button onClick={() => navigate("/")}>
          <Home size={18} /> App
        </button>
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
        <Tab active={view === "certificate"} onClick={() => setView("certificate")} icon={<BookOpen size={19} />} label="Zeugnis" />
        <Tab active={view === "people"} onClick={() => setView("people")} icon={<UsersRound size={19} />} label="Stammdaten" />
        <Tab active={view === "history"} onClick={() => setView("history")} icon={<BarChart3 size={19} />} label="Verlauf" />
        <Tab active={view === "reminders"} onClick={() => setView("reminders")} icon={<CalendarClock size={19} />} label="Erinnerungen" />
      </nav>

      {view === "certificate" ? <CertificateScreen data={data} setData={setData} /> : null}
      {view === "people" ? <PeopleScreen data={data} setData={setData} /> : null}
      {view === "history" ? <HistoryScreen data={data} /> : null}
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
        <div className="button-grid">
          <button className="primary-button" onClick={saveCertificate}>
            <Save size={19} /> Speichern
          </button>
          <button className="secondary-button" onClick={() => window.print()}>
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
      </aside>

      <article className="certificate-sheet">
        <header className="certificate-head">
          <p>Schuljahr {data.draft.year || "____ / ____"}</p>
          <h2>Zeugnis fuer {parent?.name || "____________"}</h2>
          <span>ausgestellt von {child?.name || "____________"}</span>
        </header>

        <div className="grade-table">
          {categories.map((category) => (
            <section className="grade-line" key={category.id}>
              <div>
                <strong>{category.title}</strong>
                <small>{category.childHint}</small>
              </div>
              <div className="grade-picker" aria-label={`Note fuer ${category.title}`}>
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
                <p className="inline-advice">
                  <Sparkles size={16} /> {category.advice}
                </p>
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
            Das wuensche ich mir noch
            <textarea value={data.draft.wishes} onChange={(event) => updateDraft("wishes", event.target.value)} />
          </label>
          <label>
            Mein schoenster Moment
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
                E-Mail fuer Erinnerungen
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
        <Plus size={19} /> Hinzufuegen
      </button>
    </section>
  );
}

function HistoryScreen({ data }: { data: AppData }) {
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
          <p className="empty-state">Noch kein Zeugnis gespeichert. Speichere zuerst ein Zeugnis, dann entstehen hier Verlauf und Grafiken.</p>
        )}
      </div>

      <div className="timeline">
        {analytics
          .slice()
          .reverse()
          .map((certificate) => (
            <article className="timeline-item" key={certificate.id}>
              <strong>
                {certificate.year}: {certificate.child} fuer {certificate.parent}
              </strong>
              <span>Durchschnitt {certificate.average}</span>
              <p>{certificate.favoriteMoment || certificate.strengths || "Kein Freitext eingetragen."}</p>
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

  useEffect(() => {
    loadReminders().catch(() => setMessage("Reminder-API ist noch nicht erreichbar."));
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

  return (
    <section className="page-grid">
      <section className="panel">
        <div className="panel-title">
          <CalendarClock size={25} />
          <h1>Erinnerung planen</h1>
        </div>
        <div className={smtpReady ? "status ok" : "status warn"}>
          <Mail size={18} />
          {smtpReady
            ? "SMTP ist konfiguriert. Erinnerungen koennen versendet werden."
            : "SMTP fehlt noch. Bitte .env nach .env.example anlegen und Zugangsdaten eintragen."}
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
              <option value="yearly">jaehrlich</option>
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
                    {reminder.childName} fuer {reminder.recipientName}
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
            <p className="empty-state">Noch keine Erinnerung geplant.</p>
          )}
        </div>
      </section>
    </section>
  );
}

function LegalPage({ route }: { route: Route }) {
  const content = {
    "/impressum": {
      icon: <Info size={28} />,
      title: "Impressum",
      body: [
        "Dieses Projekt wird von Michael Schellenberger als Open-Source-Projekt bereitgestellt.",
        "Die vollstaendigen Anbieterkennzeichnungen werden vor einer oeffentlichen produktiven Nutzung ergaenzt.",
        "Kontakt und Projektinformationen werden ueber das GitHub-Repository gepflegt.",
      ],
    },
    "/datenschutz": {
      icon: <Shield size={28} />,
      title: "Datenschutz",
      body: [
        "Zeugnisse und Stammdaten werden lokal im Browser gespeichert.",
        "Erinnerungen werden lokal im Server-Datenordner gespeichert, wenn die App mit Backend gestartet wird.",
        "SMTP-Zugangsdaten gehoeren in die lokale .env Datei und werden nicht an den Browser ausgeliefert.",
      ],
    },
    "/cookies": {
      icon: <Cookie size={28} />,
      title: "Cookiehinweise",
      body: [
        "Diese App verwendet keine Cookies.",
        "Entwuerfe, Stammdaten und Verlauf werden im lokalen Browserspeicher gesichert.",
        "Serverseitige Erinnerungen werden in data/reminders.json gespeichert.",
      ],
    },
    "/": { icon: <Info size={28} />, title: "", body: [] },
  }[route];

  return (
    <section className="legal-page">
      <div className="legal-icon">{content.icon}</div>
      <h1>{content.title}</h1>
      {content.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <button className="primary-button" onClick={() => navigate("/")}>
        Zurueck zur App
      </button>
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
      <nav aria-label="Rechtsdokumente">
        <button onClick={() => navigate("/impressum")}>Impressum</button>
        <button onClick={() => navigate("/datenschutz")}>Datenschutz</button>
        <button onClick={() => navigate("/cookies")}>Cookiehinweise</button>
      </nav>
      <span title={`Branch ${appBranch}, Build ${appBuildTime}`}>Rev. {appVersion}-{appRevision}</span>
    </footer>
  );
}
