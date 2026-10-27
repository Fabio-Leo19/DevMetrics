import { type FormEvent, useEffect, useState } from "react"
import {
  ArrowRight,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Calendar,
  Clock3,
  Code2,
  ExternalLink,
  GitFork,
  MapPin,
  Menu,
  Moon,
  Search,
  Star,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import {
  createBrowserRouter,
  Link,
  NavLink,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useParams,
} from "react-router"
import {
  type GithubError,
  type GithubProfile,
  type GithubRepo,
  type LanguageShare,
  formatDate,
  formatNumber,
  formatRecent,
  getGithubProfile,
  normalizeUsername,
  summarizeProfile,
} from "./lib/github"

function Brand() {
  return (
    <Link to="/" className="brand" aria-label="DevMetrics, página inicial">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      <span>DevMetrics</span>
    </Link>
  )
}

function Layout() {
  const [light, setLight] = useState(
    () => localStorage.getItem("devmetrics-theme") === "light",
  )
  const [menu, setMenu] = useState(false)
  const location = useLocation()

  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark"
    localStorage.setItem("devmetrics-theme", light ? "light" : "dark")
  }, [light])

  useEffect(() => {
    setMenu(false)
    const frame = requestAnimationFrame(() => {
      if (location.hash)
        document.getElementById(location.hash.substring(1))?.scrollIntoView()
      else window.scrollTo(0, 0)
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])

  return (
    <div className="app-shell">
      <header className="site-header">
        <Brand />
        <nav
          className={menu ? "nav open" : "nav"}
          aria-label="Navegação principal"
        >
          <NavLink to="/" end>
            Explorar
          </NavLink>
          <NavLink to="/comparar">Comparar</NavLink>
          <Link to="/#sobre">Sobre</Link>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            onClick={() => setLight(!light)}
            aria-label={light ? "Ativar tema escuro" : "Ativar tema claro"}
            title="Alternar tema"
          >
            {light ? <Moon /> : <Sun />}
          </button>
          <button
            className="icon-button menu-button"
            type="button"
            onClick={() => setMenu(!menu)}
            aria-expanded={menu}
            aria-label="Abrir menu"
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>
        <Brand />
        <span>Dados públicos do GitHub · contexto antes de comparação.</span>
      </footer>
    </div>
  )
}

function SearchBox({
  compact = false,
  initialValue = "Fabio-Leo19",
}: {
  compact?: boolean
  initialValue?: string
}) {
  const navigate = useNavigate()
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState("")
  useEffect(() => {
    setValue(initialValue)
    setError("")
  }, [initialValue])

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      navigate(`/perfil/${encodeURIComponent(normalizeUsername(value))}`)
      setError("")
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  return (
    <div className={`search-container ${compact ? "compact" : ""}`}>
      <form
        className={`search-box ${compact ? "compact" : ""}`}
        onSubmit={submit}
      >
        <Search aria-hidden="true" />
        <label
          className="sr-only"
          htmlFor={compact ? "search-small" : "search-main"}
        >
          Usuário do GitHub
        </label>
        <input
          id={compact ? "search-small" : "search-main"}
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError("")
          }}
          placeholder="nome-de-usuario"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="primary-button" type="submit">
          Analisar perfil <ArrowRight />
        </button>
      </form>
      {error && (
        <p className="form-feedback" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

/** Prévia visual sem dados pessoais ou estatísticas inventadas. */
function Preview() {
  return (
    <div
      className="preview-wrap"
      aria-label="Prévia visual do dashboard, sem dados de um perfil real"
    >
      <div className="preview-top">
        <span>
          <i /> VISÃO GERAL / PRÉVIA
        </span>
        <span>Modelo de interface · sem consulta</span>
      </div>
      <div className="preview-grid">
        <div className="mini-profile">
          <div className="avatar avatar-sm">?</div>
          <div>
            <b>Seu perfil aqui</b>
            <span>@nome-de-usuario</span>
          </div>
        </div>
        <div className="mini-metrics">
          <span>
            <b>—</b> repositórios
          </span>
          <span>
            <b>—</b> estrelas
          </span>
          <span>
            <b>—</b> seguidores
          </span>
        </div>
        <div className="mini-chart">
          <span>Linguagem principal</span>
          <div>
            <i style={{ width: "56%" }} />
          </div>
          <small>Aparece depois da pesquisa</small>
        </div>
      </div>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          <Code2 /> EXPLORADOR DE PERFIS PÚBLICOS
        </div>
        <h1>
          Seu código conta
          <br />
          uma <em>história.</em>
        </h1>
        <p>
          Explore repositórios, linguagens e atividades de desenvolvimento em um
          só lugar.
        </p>
        <SearchBox />
        <div className="privacy-note">
          <Code2 /> As pesquisas usam dados públicos do GitHub. A prévia abaixo
          mostra apenas como o painel é organizado.
        </div>
        <Preview />
      </section>
      <section className="about-section" id="sobre">
        <span className="section-index">01 / PROPÓSITO</span>
        <h2>Contexto antes de comparação.</h2>
        <p>
          DevMetrics organiza dados públicos de projetos sem criar notas de
          produtividade. Os números ajudam a explorar trajetórias — não a
          definir quem é “melhor”.
        </p>
      </section>
    </>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: LucideIcon
}) {
  return (
    <div className="stat">
      <div>
        <Icon />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  )
}

function Avatar({
  profile,
  small = false,
}: {
  profile: GithubProfile
  small?: boolean
}) {
  const name = profile.user.name || profile.user.login
  return (
    <div className={`avatar ${small ? "avatar-sm" : ""}`}>
      <img
        src={profile.user.avatar_url}
        alt={`Avatar de ${name}`}
        loading="lazy"
      />
    </div>
  )
}

function RepoCard({ repo }: { repo: GithubRepo }) {
  return (
    <a
      className="repo-card"
      href={repo.html_url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div>
        <BookOpen />
        <b>{repo.name}</b>
        <ExternalLink />
      </div>
      <p>{repo.description || "Sem descrição pública."}</p>
      <footer>
        <span>
          <i className="dot" />
          {repo.language || "Não informada"}
        </span>
        <span>
          <Star />
          {formatNumber(repo.stargazers_count)}
        </span>
        <span>
          <GitFork />
          {formatNumber(repo.forks_count)}
        </span>
      </footer>
    </a>
  )
}

function LanguagesChart({
  languages,
  total,
}: {
  languages: LanguageShare[]
  total: number
}) {
  const [mode, setMode] = useState<"count" | "percent">("percent")
  return (
    <div className="panel language-panel">
      <div className="panel-head">
        <div>
          <span className="kicker">LINGUAGENS</span>
          <h3>Distribuição dos projetos</h3>
          <p className="chart-caption">
            Linguagem principal dos {formatNumber(total)} repositórios
            analisados.
          </p>
        </div>
        <button
          type="button"
          className="ghost-button"
          onClick={() => setMode(mode === "count" ? "percent" : "count")}
          aria-label={
            mode === "percent"
              ? "Mostrar quantidade de projetos"
              : "Mostrar participação percentual"
          }
          title="Alternar entre porcentagem e quantidade"
        >
          {mode === "percent" ? "Participação" : "Quantidade"}{" "}
          <ArrowLeftRight />
        </button>
      </div>
      <div
        className="stacked-bar"
        role="img"
        aria-label={languages
          .map((item) => `${item.name}: ${item.count} projetos`)
          .join("; ")}
      >
        {languages.map((item) => (
          <i
            key={item.name}
            data-tooltip={`${item.name}: ${item.count} projetos (${Math.round(item.percent)}%)`}
            title={`${item.name}: ${item.count} projetos`}
            style={{ width: `${item.percent}%`, background: item.color }}
          />
        ))}
      </div>
      <div className="legend">
        {languages.map((item) => (
          <div key={item.name}>
            <span>
              <i style={{ background: item.color }} />
              {item.name}
            </span>
            <b>
              {mode === "percent"
                ? `${Math.round(item.percent)}%`
                : formatNumber(item.count)}
            </b>
          </div>
        ))}
      </div>
    </div>
  )
}

function YearChart({ years }: { years: { year: number; count: number }[] }) {
  const max = Math.max(1, ...years.map((item) => item.count))
  return (
    <div className="panel year-panel">
      <div className="panel-head">
        <div>
          <span className="kicker">HISTÓRICO</span>
          <h3>Projetos por ano</h3>
          <p className="chart-caption">
            Até seis anos de criação mais recentes dos projetos analisados.
          </p>
        </div>
      </div>
      <div
        className="bars"
        role="img"
        aria-label={years
          .map((item) => `${item.year}: ${item.count} projetos`)
          .join("; ")}
      >
        {years.map((item) => (
          <div key={item.year}>
            <i
              title={`${item.count} projetos em ${item.year}`}
              data-tooltip={`${item.count} projetos em ${item.year}`}
              style={{ height: `${(item.count / max) * 80}%` }}
            />
            <span>{item.year}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

type ProfileState =
  | { status: "loading" }
  | { status: "ready"; data: GithubProfile }
  | { status: "error"; error: GithubError }

function useProfile(username: string, retryKey: number): ProfileState {
  const [state, setState] = useState<ProfileState>({ status: "loading" })
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState({ status: "loading" })
    getGithubProfile(username, controller.signal)
      .then((data) => {
        if (active) setState({ status: "ready", data })
      })
      .catch((error) => {
        if (active) setState({ status: "error", error: error as GithubError })
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [username, retryKey])
  return state
}

function Profile() {
  const username = useParams().username || ""
  const [retryKey, setRetryKey] = useState(0)
  const state = useProfile(username, retryKey)
  if (state.status === "loading") return <LoadingProfile />
  if (state.status === "error") {
    return (
      <StatePage
        error={state.error}
        username={username}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    )
  }
  const profile = state.data
  const { user, repos, complete } = profile
  const summary = summarizeProfile(profile)

  return (
    <div className="page dashboard">
      <div className="page-tools">
        <div>
          <span className="kicker">PERFIL / DADOS PÚBLICOS</span>
          <span className="updated">
            <Clock3 /> Consultado{" "}
            {new Date(profile.fetchedAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <SearchBox compact initialValue={user.login} />
      </div>
      {!complete && (
        <div className="notice">
          <Clock3 />
          <div>
            <b>Recorte parcial</b>
            <span>
              Analisamos {formatNumber(repos.length)} dos{" "}
              {formatNumber(user.public_repos)} repositórios públicos. Estrelas,
              linguagens e histórico consideram apenas os projetos carregados.
            </span>
          </div>
        </div>
      )}
      <section className="profile-head">
        <Avatar profile={profile} />
        <div className="profile-copy">
          <span className="example-badge">DADOS PÚBLICOS</span>
          <h1>{user.name || user.login}</h1>
          <a href={user.html_url} target="_blank" rel="noopener noreferrer">
            @{user.login} <ExternalLink />
          </a>
          <p>{user.bio || "Este perfil não possui uma biografia pública."}</p>
          <div className="meta">
            {user.location && (
              <span>
                <MapPin /> {user.location}
              </span>
            )}
            <span>
              <Calendar /> No GitHub desde {formatDate(user.created_at)}
            </span>
          </div>
        </div>
        <a
          className="secondary-button"
          href={user.html_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Code2 /> Ver no GitHub
        </a>
      </section>
      <section className="stats-grid" aria-label="Estatísticas do perfil">
        <Stat
          label="REPOSITÓRIOS PÚBLICOS"
          value={formatNumber(user.public_repos)}
          icon={BookOpen}
        />
        <Stat
          label="SEGUIDORES"
          value={formatNumber(user.followers)}
          icon={Users}
        />
        <Stat
          label="SEGUINDO"
          value={formatNumber(user.following)}
          icon={Users}
        />
        <Stat
          label="ESTRELAS ANALISADAS"
          value={formatNumber(summary.stars)}
          icon={Star}
        />
      </section>
      {repos.length ? (
        <>
          <section className="analytics-grid">
            <LanguagesChart
              languages={summary.languages}
              total={repos.length}
            />
            <YearChart years={summary.years} />
          </section>
          <section className="repo-section">
            <div className="section-title">
              <div>
                <span className="kicker">DESTAQUES</span>
                <h2>Repositórios populares</h2>
              </div>
              <span>Ordenados por estrelas</span>
            </div>
            <div className="repo-grid">
              {summary.popular.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          </section>
          <section className="recent-section">
            <div className="section-title">
              <div>
                <span className="kicker">ATIVIDADE</span>
                <h2>Atualizados recentemente</h2>
              </div>
            </div>
            <div className="recent-list">
              {summary.recent.map((repo) => (
                <div key={repo.id}>
                  <div>
                    <span className="repo-icon">
                      <BookOpen />
                    </span>
                    <span>
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <b>{repo.name}</b>
                      </a>
                      <small>
                        {repo.description || "Sem descrição pública."}
                      </small>
                    </span>
                  </div>
                  <time dateTime={repo.updated_at}>
                    {formatRecent(repo.updated_at)}
                  </time>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-data">
          <span className="state-icon">
            <BookOpen />
          </span>
          <div>
            <h2>Nenhum repositório público</h2>
            <p>
              Este perfil existe, mas não há repositórios públicos para
              analisar.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function StatePage({
  error,
  username,
  onRetry,
}: {
  error: GithubError
  username: string
  onRetry: () => void
}) {
  const notFound = error.kind === "notfound"
  const rate = error.kind === "rate"
  return (
    <div className="state-page">
      <span className="state-code">
        {notFound ? "404" : rate ? "429" : "!"}
      </span>
      <div className="state-icon">{notFound ? <Search /> : <X />}</div>
      <h1>
        {notFound
          ? "Usuário não encontrado."
          : rate
            ? "Muitas consultas por enquanto."
            : "Não foi possível consultar."}
      </h1>
      <p>{error.message}</p>
      <button
        type="button"
        className="secondary-button retry-button"
        onClick={onRetry}
      >
        Tentar novamente
      </button>
      <SearchBox initialValue={username} />
      <Link to="/" className="text-link">
        Voltar para o início
      </Link>
    </div>
  )
}

function LoadingProfile() {
  return (
    <div
      className="page dashboard loading-page"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="loading-label">
        <span className="spinner lime" />
        Consultando perfil público e repositórios…
      </div>
      <div className="skeleton profile-skeleton" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="stat" key={item}>
            <i className="skeleton line short" />
            <i className="skeleton line value" />
          </div>
        ))}
      </div>
      <div className="analytics-grid">
        <div className="panel skeleton-panel">
          <i className="skeleton line" />
          <i className="skeleton chart-line" />
        </div>
        <div className="panel skeleton-panel">
          <i className="skeleton line" />
          <i className="skeleton chart-line" />
        </div>
      </div>
    </div>
  )
}

function CompareProfile({ profile }: { profile: GithubProfile }) {
  return (
    <div className="compare-profile">
      <Avatar profile={profile} small />
      <div>
        <span className="example-badge">DADOS PÚBLICOS</span>
        <h2>{profile.user.name || profile.user.login}</h2>
        <a
          href={profile.user.html_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{profile.user.login} <ExternalLink className="inline-external" />
        </a>
      </div>
    </div>
  )
}

function Comparison({
  profiles,
}: {
  profiles: [GithubProfile, GithubProfile]
}) {
  const [a, b] = profiles
  const one = summarizeProfile(a)
  const two = summarizeProfile(b)
  const fields = [
    {
      label: "Repositórios públicos",
      values: [a.user.public_repos, b.user.public_repos],
    },
    { label: "Seguidores", values: [a.user.followers, b.user.followers] },
    { label: "Estrelas analisadas", values: [one.stars, two.stars] },
  ]
  const primary = [one.primaryLanguage, two.primaryLanguage]
  return (
    <div className="comparison">
      <CompareProfile profile={a} />
      <CompareProfile profile={b} />
      <div className="comparison-table">
        {fields.map((row) => {
          const max = Math.max(...row.values, 1)
          return (
            <div className="compare-row" key={row.label}>
              <span className="compare-label">{row.label}</span>
              {row.values.map((value, index) => (
                <div
                  className={`compare-value ${index === 0 ? "left" : ""}`}
                  key={index}
                >
                  <b>{formatNumber(value)}</b>
                  <i>
                    <em style={{ width: `${(value / max) * 100}%` }} />
                  </i>
                </div>
              ))}
            </div>
          )
        })}
        <div className="compare-row">
          <span className="compare-label">Linguagem principal</span>
          {primary.map((item, index) => (
            <div
              className={`compare-value ${index === 0 ? "left" : ""}`}
              key={index}
            >
              <b>
                {item ? `${item.name} · ${Math.round(item.percent)}%` : "—"}
              </b>
              <i>
                <em style={{ width: `${item?.percent || 0}%` }} />
              </i>
            </div>
          ))}
        </div>
      </div>
      <p className="comparison-note">
        <BarChart3 /> Barras normalizadas dentro de cada indicador. Estrelas e
        linguagens consideram os repositórios analisados (até 500 por perfil);
        não representam uma pontuação geral.
      </p>
    </div>
  )
}

function Compare() {
  const [left, setLeft] = useState("Fabio-Leo19")
  const [right, setRight] = useState("octocat")
  const [names, setNames] = useState<[string, string] | null>(null)
  const [profiles, setProfiles] =
    useState<[GithubProfile, GithubProfile] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const next: [string, string] = [
        normalizeUsername(left),
        normalizeUsername(right),
      ]
      if (next[0].toLowerCase() === next[1].toLowerCase()) {
        setError("Escolha dois perfis diferentes para comparar.")
        setProfiles(null)
        setNames(null)
        return
      }
      setError("")
      setProfiles(null)
      setNames(next)
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  useEffect(() => {
    if (!names) return
    const controller = new AbortController()
    let active = true
    setLoading(true)
    Promise.all(names.map((name) => getGithubProfile(name, controller.signal)))
      .then((results) => {
        if (active) setProfiles(results as [GithubProfile, GithubProfile])
      })
      .catch((reason) => {
        if (active)
          setError(
            (reason as Error).message || "Não foi possível comparar os perfis.",
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [names])

  return (
    <div className="page compare-page">
      <div className="compare-intro">
        <span className="kicker">COMPARAR / DADOS PÚBLICOS</span>
        <h1>Dois perfis, lado a lado.</h1>
        <p>
          Observe diferenças de trajetória e tecnologias sem transformar dados
          em ranking.
        </p>
      </div>
      <form className="compare-form" onSubmit={submit}>
        <label>
          <span>PRIMEIRO PERFIL</span>
          <div>
            <Code2 />
            <input
              value={left}
              onChange={(event) => {
                setLeft(event.target.value)
                setError("")
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </label>
        <span className="versus">VS</span>
        <label>
          <span>SEGUNDO PERFIL</span>
          <div>
            <Code2 />
            <input
              value={right}
              onChange={(event) => {
                setRight(event.target.value)
                setError("")
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </label>
        <button className="primary-button" disabled={loading} type="submit">
          {loading ? (
            <>
              <span className="spinner" />
              Comparando
            </>
          ) : (
            "Comparar perfis"
          )}
        </button>
      </form>
      {error && (
        <p className="compare-feedback" role="alert">
          {error}
        </p>
      )}
      {loading && (
        <div className="compare-loading" role="status">
          <span className="spinner lime" /> Buscando dados dos dois perfis…
        </div>
      )}
      {profiles && !loading ? (
        <Comparison profiles={profiles} />
      ) : (
        !loading &&
        !error && (
          <p className="compare-hint">
            Digite dois nomes de usuário e clique em “Comparar perfis” para
            consultar os dados reais.
          </p>
        )
      )}
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "perfil/:username", Component: Profile },
      { path: "comparar", Component: Compare },
      { path: "*", Component: Home },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
