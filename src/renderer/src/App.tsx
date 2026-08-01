import { BookOpen, Check, Circle, Feather, Home, Settings, Sparkles, Target } from 'lucide-react'

const priorities = ['Finish the Kairo foundation', 'Read 15 pages', 'Evening reflection']

export function App(): React.JSX.Element {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span>K</span>
          <strong>KAIRO</strong>
        </div>
        <nav>
          <a className="active">
            <Home size={17} />
            Command Center
          </a>
          <a>
            <Feather size={17} />
            Daily Log
          </a>
          <a>
            <Target size={17} />
            Commitments
          </a>
          <a>
            <BookOpen size={17} />
            History
          </a>
          <a>
            <Sparkles size={17} />
            Weekly Review
          </a>
        </nav>
        <a className="settings">
          <Settings size={17} />
          Settings
        </a>
      </aside>
      <section className="content">
        <header>
          <p className="eyebrow">SATURDAY · AUGUST 1</p>
          <h1>Good evening, David.</h1>
          <p className="lede">The day is ending. Take a moment to close it with intention.</p>
        </header>
        <div className="rule" />
        <section className="mission">
          <p className="eyebrow">TODAY'S MISSION</p>
          <h2>Lay a strong foundation.</h2>
          <p>Keep the system calm, useful, and honest.</p>
        </section>
        <div className="grid">
          <section>
            <div className="section-title">
              <p className="eyebrow">PRIORITIES</p>
              <span>1 / 3</span>
            </div>
            <div className="checklist">
              {priorities.map((item, i) => (
                <div className="check" key={item}>
                  {i === 0 ? (
                    <span className="done">
                      <Check size={13} />
                    </span>
                  ) : (
                    <Circle size={17} />
                  )}
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="pulse">
            <p className="eyebrow">TODAY'S PULSE</p>
            <div className="score">
              <strong>64</strong>
              <span>/ 100</span>
            </div>
            <div className="progress">
              <i />
            </div>
            <p>Steady progress. Protect the final hour.</p>
          </section>
        </div>
        <section className="reflection">
          <p className="eyebrow">EVENING REFLECTION</p>
          <h3>What moved you forward today?</h3>
          <button>
            Begin reflection <span>→</span>
          </button>
        </section>
      </section>
    </main>
  )
}
