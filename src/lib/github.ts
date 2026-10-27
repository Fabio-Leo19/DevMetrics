/** Leitura de informações públicas; nenhuma credencial é armazenada no navegador. */
export interface GithubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  bio: string | null
  location: string | null
  created_at: string
  public_repos: number
  followers: number
  following: number
}

export interface GithubRepo {
  id: number
  name: string
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  created_at: string
  updated_at: string
}

export interface GithubProfile {
  user: GithubUser
  repos: GithubRepo[]
  complete: boolean
  fetchedAt: number
}

export type GithubErrorKind = "invalid" | "notfound" | "rate" | "network" | "unknown"

export class GithubError extends Error {
  kind: GithubErrorKind

  constructor(kind: GithubErrorKind, message: string) {
    super(message)
    this.kind = kind
    this.name = "GithubError"
  }
}

export function normalizeUsername(input: string): string {
  const username = input.trim().replace(/^@/, "")
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    throw new GithubError(
      "invalid",
      "Digite um usuário válido do GitHub (sem espaços ou links).",
    )
  }
  return username
}

async function githubRequest<T>(
  url: string,
  fetcher: typeof fetch,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response
  try {
    response = await fetcher(url, {
      signal,
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new GithubError(
      "network",
      "Não foi possível conectar ao GitHub. Confira a conexão e tente de novo.",
    )
  }

  if (!response.ok) {
    if (response.status === 404)
      throw new GithubError(
        "notfound",
        "Não encontramos esse usuário no GitHub.",
      )
    let secondaryRateLimit = false
    if (response.status === 403) {
      const details: unknown = await response.json().catch(() => null)
      if (details && typeof details === "object" && "message" in details) {
        const message = (details as { message: unknown }).message
        secondaryRateLimit =
          typeof message === "string" &&
          /secondary rate limit|rate limit exceeded/i.test(message)
      }
    }
    if (
      response.status === 429 ||
      (response.status === 403 &&
        (response.headers.get("x-ratelimit-remaining") === "0" ||
          secondaryRateLimit))
    ) {
      throw new GithubError(
        "rate",
        "O GitHub limitou as consultas por enquanto. Aguarde alguns minutos antes de tentar novamente.",
      )
    }
    throw new GithubError(
      "unknown",
      `O GitHub não conseguiu responder à consulta (HTTP ${response.status}).`,
    )
  }

  return response.json() as Promise<T>
}

/** Até 500 repositórios por perfil; o painel informa quando o recorte é parcial. */
export async function fetchGithubProfile(
  input: string,
  options: {
    signal?: AbortSignal
    fetcher?: typeof fetch
    maxPages?: number
  } = {},
): Promise<GithubProfile> {
  const username = normalizeUsername(input)
  const fetcher = options.fetcher ?? fetch
  const maxPages = Math.max(1, Math.min(5, options.maxPages ?? 5))
  const base = `https://api.github.com/users/${encodeURIComponent(username)}`
  const user = await githubRequest<GithubUser>(base, fetcher, options.signal)
  const repos: GithubRepo[] = []
  const pages = Math.min(Math.ceil(user.public_repos / 100), maxPages)

  for (let page = 1; page <= pages; page++) {
    const result = await githubRequest<GithubRepo[]>(
      `${base}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
      fetcher,
      options.signal,
    )
    repos.push(...result)
    if (result.length < 100) break
  }

  return {
    user,
    repos,
    complete: repos.length >= user.public_repos,
    fetchedAt: Date.now(),
  }
}

const cache = new Map<string, { profile: GithubProfile; expires: number }>()
const CACHE_MS = 5 * 60 * 1000

export async function getGithubProfile(
  username: string,
  signal?: AbortSignal,
): Promise<GithubProfile> {
  const key = normalizeUsername(username).toLowerCase()
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) return cached.profile
  const profile = await fetchGithubProfile(key, { signal })
  cache.set(key, { profile, expires: Date.now() + CACHE_MS })
  return profile
}

export interface LanguageShare {
  name: string
  count: number
  percent: number
  color: string
}

const chartColors = ["#C5F36B", "#91B65A", "#6B884E", "#455B3E", "#778581"]

export function summarizeProfile(profile: GithubProfile) {
  const repos = profile.repos
  const stars = repos.reduce((total, repo) => total + repo.stargazers_count, 0)
  const languageCounts = new Map<string, number>()
  const yearCounts = new Map<number, number>()

  for (const repo of repos) {
    const language = repo.language || "Não informada"
    languageCounts.set(language, (languageCounts.get(language) || 0) + 1)
    const year = new Date(repo.created_at).getUTCFullYear()
    if (Number.isFinite(year))
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
  }

  const allLanguages = [...languageCounts].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )
  const grouped = allLanguages.slice(0, 4)
  const others = allLanguages.slice(4).reduce((sum, item) => sum + item[1], 0)
  if (others) grouped.push(["Outras", others])
  const languages: LanguageShare[] = grouped.map(([name, count], index) => ({
    name,
    count,
    percent: repos.length ? (count / repos.length) * 100 : 0,
    color: chartColors[index],
  }))

  const years = [...yearCounts]
    .sort((a, b) => a[0] - b[0])
    .slice(-6)
    .map(([year, count]) => ({ year, count }))

  return {
    stars,
    languages,
    years,
    popular: [...repos]
      .sort(
        (a, b) =>
          b.stargazers_count - a.stargazers_count ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 6),
    recent: [...repos]
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .slice(0, 5),
    primaryLanguage: languages[0] || null,
  }
}

export const formatNumber = (number: number) =>
  new Intl.NumberFormat("pt-BR").format(number)

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date))
}

export function formatRecent(date: string) {
  const days = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(date)) / 86_400_000),
  )
  if (days === 0) return "hoje"
  if (days === 1) return "ontem"
  if (days < 30) return `há ${days} dias`
  if (days < 365) {
    const months = Math.floor(days / 30)
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  }
  return formatDate(date)
}
