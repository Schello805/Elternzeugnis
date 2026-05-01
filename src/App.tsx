import {
  BookOpen,
  Check,
  Cookie,
  Download,
  Github,
  HeartHandshake,
  Home,
  Info,
  RotateCcw,
  Shield,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { appBranch, appBuildTime, appRevision, appVersion } from "./generated/version";

const githubUrl = "https://github.com/Schello805/Elternzeugnis";
const storageKey = "elternzeugnis:v1";

type Recipient = "Mama" | "Papa" | "Mama und Papa" | "Oma" | "Opa" | "Lieblingsmensch";
type Design = "classic" | "colorful" | "chalk";
type Route = "/" | "/impressum" | "/datenschutz" | "/cookies";

type Category = {
  id: string;
  title: string;
  childHint: string;
  advice: string;
};

type CertificateData = {
  childName: string;
  recipient: Recipient;
  customRecipient: string;
  schoolYear: string;
  location: string;
  date: string;
  design: Design;
  grades: Record<string, number>;
  strengths: string;
  wishes: string;
  favoriteMoment: string;
  signature: string;
};

const categories: Category[] = [
  {
    id: "geduld",
    title: "Geduld",
    childHint: "Bleibt die Person ruhig, wenn etwas nicht sofort klappt?",
    advice: "Vielleicht hilft ein Familien-Codewort, wenn alle kurz Pause brauchen.",
  },
  {
    id: "zuhoren",
    title: "Zuhören",
    childHint: "Hört sie dir richtig zu, ohne gleich zu schimpfen oder abzulenken?",
    advice: "Verabredet jeden Tag zehn Minuten Redezeit ohne Handy und ohne Nebenbei.",
  },
  {
    id: "spielzeit",
    title: "Spielzeit",
    childHint: "Nimmt sie sich Zeit zum Spielen, Vorlesen oder Quatsch machen?",
    advice: "Plant eine feste kleine Spielzeit pro Woche. Lieber kurz und wirklich gemeinsam.",
  },
  {
    id: "kuschelfaktor",
    title: "Kuschelfaktor",
    childHint: "Gibt es genug Umarmungen, Trost und Nähe, wenn du sie brauchst?",
    advice: "Fragt einander öfter: Brauchst du gerade Trost, Hilfe oder einfach Nähe?",
  },
  {
    id: "lernen",
    title: "Hilfe beim Lernen",
    childHint: "Wird Lernen erklärt, ohne Druck zu machen?",
    advice: "Erst Mut machen, dann üben. Fehler zeigen nur, was als Nächstes dran ist.",
  },
  {
    id: "fairness",
    title: "Fairness",
    childHint: "Sind Regeln verständlich und für alle möglichst gerecht?",
    advice: "Besprecht Regeln gemeinsam und schreibt die wichtigsten sichtbar auf.",
  },
  {
    id: "abenteuer",
    title: "Ausflüge und Abenteuer",
    childHint: "Gibt es gemeinsame Erlebnisse, draußen sein oder kleine Überraschungen?",
    advice: "Sammelt Ideen in einem Glas und zieht am Wochenende eine kleine Aktivität.",
  },
  {
    id: "laune",
    title: "Gute Laune",
    childHint: "Kann die Person lachen, sich entschuldigen und wieder freundlich werden?",
    advice: "Nach Streit hilft ein kurzer Neustart-Satz: Ich mag dich, wir versuchen es nochmal.",
  },
];

const defaultGrades = Object.fromEntries(categories.map((category) => [category.id, 2]));

const initialData: CertificateData = {
  childName: "",
  recipient: "Mama und Papa",
  customRecipient: "",
  schoolYear: "2025/2026",
  location: "",
  date: new Date().toISOString().slice(0, 10),
  design: "classic",
  grades: defaultGrades,
  strengths: "",
  wishes: "",
  favoriteMoment: "",
  signature: "",
};

const recipients: Recipient[] = ["Mama", "Papa", "Mama und Papa", "Oma", "Opa", "Lieblingsmensch"];
const gradeLabels: Record<number, string> = {
  1: "Super",
  2: "Richtig gut",
  3: "Okay",
  4: "Bitte ueben",
  5: "Mehr Hilfe",
  6: "Reden wir",
};

function loadStoredData(): CertificateData {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return initialData;
    const parsed = JSON.parse(raw) as Partial<CertificateData>;
    return {
      ...initialData,
      ...parsed,
      grades: { ...defaultGrades, ...parsed.grades },
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
  const [data, setData] = useState<CertificateData>(loadStoredData);
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const handleRoute = () => setRoute(getRoute());
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  const finalRecipient =
    data.recipient === "Lieblingsmensch" && data.customRecipient.trim()
      ? data.customRecipient.trim()
      : data.recipient;

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate("/")} aria-label="Zur Zeugnis-App">
          <span className="brand-mark">
            <BookOpen size={23} />
          </span>
          <span>
            <strong>Elternzeugnis</strong>
            <small>wertschaetzend, spielerisch, tabletfreundlich</small>
          </span>
        </button>
        <nav className="topnav" aria-label="Hauptnavigation">
          <button className={route === "/" ? "active" : ""} onClick={() => navigate("/")}>
            <Home size={18} /> App
          </button>
          <a href={githubUrl} target="_blank" rel="noreferrer">
            <Github size={18} /> GitHub
          </a>
        </nav>
      </header>

      <main>
        {route === "/" ? (
          <CertificateApp
            data={data}
            finalRecipient={finalRecipient}
            setData={setData}
            reset={() => setData(initialData)}
          />
        ) : (
          <LegalPage route={route} />
        )}
      </main>

      <Footer />
    </div>
  );
}

function CertificateApp({
  data,
  finalRecipient,
  setData,
  reset,
}: {
  data: CertificateData;
  finalRecipient: string;
  setData: Dispatch<SetStateAction<CertificateData>>;
  reset: () => void;
}) {
  const lowGrades = useMemo(
    () => categories.filter((category) => data.grades[category.id] >= 5),
    [data.grades],
  );

  const update = <Key extends keyof CertificateData>(key: Key, value: CertificateData[Key]) => {
    setData((current) => ({ ...current, [key]: value }));
  };

  const updateGrade = (categoryId: string, grade: number) => {
    setData((current) => ({
      ...current,
      grades: { ...current.grades, [categoryId]: grade },
    }));
  };

  return (
    <div className="workspace">
      <section className="editor-panel" aria-label="Zeugnis bearbeiten">
        <div className="section-title">
          <div>
            <p className="eyebrow">Zeugnis-Werkstatt</p>
            <h1>Ein liebevolles Zeugnis fuer grosse Menschen</h1>
          </div>
          <div className="action-row">
            <button className="icon-button" onClick={reset} title="Neu anfangen" aria-label="Neu anfangen">
              <RotateCcw size={20} />
            </button>
            <button className="primary-button" onClick={() => window.print()}>
              <Download size={20} /> Drucken / PDF
            </button>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Dein Name
            <input
              value={data.childName}
              onChange={(event) => update("childName", event.target.value)}
              placeholder="z. B. Lina"
            />
          </label>
          <label>
            Zeugnis fuer
            <select
              value={data.recipient}
              onChange={(event) => update("recipient", event.target.value as Recipient)}
            >
              {recipients.map((recipient) => (
                <option key={recipient}>{recipient}</option>
              ))}
            </select>
          </label>
          {data.recipient === "Lieblingsmensch" ? (
            <label>
              Name
              <input
                value={data.customRecipient}
                onChange={(event) => update("customRecipient", event.target.value)}
                placeholder="z. B. Tante Mia"
              />
            </label>
          ) : null}
          <label>
            Schuljahr
            <input value={data.schoolYear} onChange={(event) => update("schoolYear", event.target.value)} />
          </label>
          <label>
            Ort
            <input
              value={data.location}
              onChange={(event) => update("location", event.target.value)}
              placeholder="z. B. Augsburg"
            />
          </label>
          <label>
            Datum
            <input type="date" value={data.date} onChange={(event) => update("date", event.target.value)} />
          </label>
        </div>

        <fieldset className="design-picker">
          <legend>Design</legend>
          {(["classic", "colorful", "chalk"] as Design[]).map((design) => (
            <button
              key={design}
              className={data.design === design ? "selected" : ""}
              onClick={() => update("design", design)}
              type="button"
            >
              <span className={`swatch ${design}`} />
              {design === "classic" ? "Klassisch" : design === "colorful" ? "Bunt" : "Tafel"}
            </button>
          ))}
        </fieldset>

        <div className="grade-list">
          {categories.map((category) => (
            <article className="grade-card" key={category.id}>
              <div>
                <h2>{category.title}</h2>
                <p>{category.childHint}</p>
              </div>
              <div className="grade-buttons" role="group" aria-label={`Note fuer ${category.title}`}>
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <button
                    className={data.grades[category.id] === grade ? "selected" : ""}
                    key={grade}
                    onClick={() => updateGrade(category.id, grade)}
                    title={gradeLabels[grade]}
                    type="button"
                  >
                    {grade}
                  </button>
                ))}
              </div>
              {data.grades[category.id] >= 5 ? (
                <p className="advice">
                  <Sparkles size={17} />
                  {category.advice}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        {lowGrades.length > 0 ? (
          <aside className="pedagogy-box">
            <HeartHandshake size={22} />
            <div>
              <strong>Hinweis fuer ein gutes Gespraech</strong>
              <p>
                Eine 5 oder 6 bedeutet hier nicht „du bist schlecht“. Sie zeigt: Hier wuenscht sich
                ein Kind mehr Verbindung, Ruhe oder gemeinsame Zeit. Am besten zusammen anschauen,
                nachfragen und einen kleinen ersten Schritt verabreden.
              </p>
            </div>
          </aside>
        ) : null}

        <div className="text-grid">
          <label>
            Das klappt richtig gut
            <textarea
              value={data.strengths}
              onChange={(event) => update("strengths", event.target.value)}
              placeholder="z. B. Du troestest mich, wenn ich traurig bin."
            />
          </label>
          <label>
            Das wuensche ich mir noch
            <textarea
              value={data.wishes}
              onChange={(event) => update("wishes", event.target.value)}
              placeholder="z. B. Mehr Vorlesezeit am Abend."
            />
          </label>
          <label>
            Mein schoenster Moment
            <textarea
              value={data.favoriteMoment}
              onChange={(event) => update("favoriteMoment", event.target.value)}
              placeholder="z. B. Unser Ausflug an den See."
            />
          </label>
          <label>
            Unterschrift
            <input
              value={data.signature}
              onChange={(event) => update("signature", event.target.value)}
              placeholder="z. B. Dein Max"
            />
          </label>
        </div>
      </section>

      <CertificatePreview data={data} finalRecipient={finalRecipient} />
    </div>
  );
}

function CertificatePreview({
  data,
  finalRecipient,
}: {
  data: CertificateData;
  finalRecipient: string;
}) {
  const lowGrades = categories.filter((category) => data.grades[category.id] >= 5);
  const formattedDate = data.date ? new Intl.DateTimeFormat("de-DE").format(new Date(data.date)) : "";

  return (
    <section className={`certificate ${data.design}`} aria-label="Zeugnisvorschau">
      <div className="certificate-header">
        <p>Schuljahr {data.schoolYear || "____ / ____"}</p>
        <h2>Zeugnis fuer {finalRecipient}</h2>
        <span>ausgestellt von {data.childName || "____________"}</span>
      </div>

      <div className="certificate-grades">
        {categories.map((category) => (
          <div className="certificate-row" key={category.id}>
            <span>{category.title}</span>
            <strong>{data.grades[category.id]}</strong>
          </div>
        ))}
      </div>

      <div className="certificate-notes">
        <NoteBlock title="Das klappt gut" text={data.strengths} />
        <NoteBlock title="Hier darf noch geuebt werden" text={data.wishes} />
        <NoteBlock title="Schoenster gemeinsamer Moment" text={data.favoriteMoment} />
      </div>

      {lowGrades.length > 0 ? (
        <div className="certificate-advice">
          <strong>Paedagogischer Tipp</strong>
          <p>
            Sprecht zuerst ueber das, was gut klappt. Danach sucht euch nur einen Wunsch aus und
            macht daraus eine kleine, freundliche Familien-Abmachung.
          </p>
        </div>
      ) : (
        <div className="certificate-advice positive">
          <strong>Familien-Kompliment</strong>
          <p>Viele gute Noten bedeuten: Hier wird schon viel gesehen, gehoert und gemeinsam gelacht.</p>
        </div>
      )}

      <div className="certificate-footer">
        <span>{data.location || "Ort"}, {formattedDate || "Datum"}</span>
        <span>{data.signature || "Unterschrift"}</span>
      </div>
    </section>
  );
}

function NoteBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <strong>{title}</strong>
      <p>{text || "........................................................................"}</p>
    </div>
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
        "Die App speichert Zeugnisdaten nur lokal im Browser des verwendeten Geraets.",
        "Es werden keine Tracking-Dienste eingebunden und keine Daten an einen Server uebertragen.",
        "Beim Drucken oder PDF-Speichern entscheidet der Browser des Geraets ueber die weitere Verarbeitung.",
      ],
    },
    "/cookies": {
      icon: <Cookie size={28} />,
      title: "Cookiehinweise",
      body: [
        "Diese App verwendet keine Cookies.",
        "Zur komfortablen Nutzung wird der aktuelle Entwurf im lokalen Browserspeicher gesichert.",
        "Der lokale Entwurf kann ueber „Neu anfangen“ in der App ersetzt werden.",
      ],
    },
    "/": {
      icon: <Info size={28} />,
      title: "",
      body: [],
    },
  }[route];

  return (
    <section className="legal-page">
      <div className="legal-icon">{content.icon}</div>
      <h1>{content.title}</h1>
      {content.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <button className="primary-button" onClick={() => navigate("/")}>
        <Check size={20} /> Zurueck zur App
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
