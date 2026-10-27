import test from "node:test"
import assert from "node:assert/strict"
import {
  GithubError,
  fetchGithubProfile,
  normalizeUsername,
  summarizeProfile,
} from "../src/lib/github.ts"

function user(count = 2) {
  return {
    login: "teste",
    name: "Pessoa Teste",
    avatar_url: "",
    html_url: "https://github.com/teste",
    bio: null,
    location: null,
    created_at: "2020-01-01T00:00:00Z",
    public_repos: count,
    followers: 11,
    following: 3,
  }
}

function repo(id, overrides = {}) {
  return {
    id,
    name: `repo-${id}`,
    description: null,
    html_url: `https://github.com/teste/repo-${id}`,
    language: "TypeScript",
    stargazers_count: 2,
    forks_count: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

const ok = (data) => new Response(JSON.stringify(data), { status: 200 })

test("aceita nomes válidos e remove o @ inicial", () => {
  assert.equal(normalizeUsername(" @Fabio-Leo19 "), "Fabio-Leo19")
  assert.throws(() => normalizeUsername("nome com espaço"), GithubError)
  assert.throws(
    () => normalizeUsername("https://github.com/octocat"),
    GithubError,
  )
  assert.throws(() => normalizeUsername("-invalido"), GithubError)
})

test("busca dados e repositórios públicos sem resultados estáticos", async () => {
  const paths = []
  const fetcher = async (url) => {
    paths.push(String(url))
    return ok(paths.length === 1 ? user() : [repo(1), repo(2)])
  }
  const profile = await fetchGithubProfile("teste", { fetcher })
  assert.equal(profile.user.followers, 11)
  assert.equal(profile.repos.length, 2)
  assert.equal(profile.complete, true)
  assert.match(paths[1], /per_page=100&page=1/)
})

test("indica quando um perfil ultrapassa o limite de paginação", async () => {
  let calls = 0
  const fetcher = async () =>
    ok(
      ++calls === 1
        ? user(120)
        : Array.from({ length: 100 }, (_, i) => repo(i)),
    )
  const profile = await fetchGithubProfile("teste", { fetcher, maxPages: 1 })
  assert.equal(profile.repos.length, 100)
  assert.equal(profile.complete, false)
  assert.equal(calls, 2)
})

test("soma estrelas e calcula linguagens e histórico a partir dos repositórios", () => {
  const profile = {
    user: user(3),
    repos: [
      repo(1, { stargazers_count: 10 }),
      repo(2, {
        stargazers_count: 1,
        language: "Python",
        created_at: "2023-01-01T00:00:00Z",
      }),
      repo(3, { stargazers_count: 5 }),
    ],
    complete: true,
    fetchedAt: Date.now(),
  }
  const result = summarizeProfile(profile)
  assert.equal(result.stars, 16)
  assert.equal(result.languages[0].name, "TypeScript")
  assert.equal(result.languages[0].count, 2)
  assert.equal(result.popular[0].id, 1)
  assert.ok(result.years.some((item) => item.year === 2024 && item.count === 2))
})

test("trata erro de usuário inexistente e limite de requisições", async () => {
  await assert.rejects(
    fetchGithubProfile("inexistente", {
      fetcher: async () => new Response("{}", { status: 404 }),
    }),
    (error) => error.kind === "notfound",
  )

  await assert.rejects(
    fetchGithubProfile("teste", {
      fetcher: async () =>
        new Response("{}", {
          status: 403,
          headers: { "x-ratelimit-remaining": "0" },
        }),
    }),
    (error) => error.kind === "rate",
  )

  await assert.rejects(
    fetchGithubProfile("teste", {
      fetcher: async () =>
        new Response(JSON.stringify({ message: "You have exceeded a secondary rate limit" }), {
          status: 403,
        }),
    }),
    (error) => error.kind === "rate",
  )

  await assert.rejects(
    fetchGithubProfile("teste", {
      fetcher: async () => new Response("{}", { status: 429 }),
    }),
    (error) => error.kind === "rate",
  )
})

test("mostra erro genérico para falha de servidor e falha de rede", async () => {
  await assert.rejects(
    fetchGithubProfile("teste", {
      fetcher: async () => new Response("{}", { status: 500 }),
    }),
    (error) => error.kind === "unknown" && /HTTP 500/.test(error.message),
  )
  await assert.rejects(
    fetchGithubProfile("teste", {
      fetcher: async () => { throw new TypeError("Failed to fetch") },
    }),
    (error) => error.kind === "network",
  )
})

test("perfil sem repositórios retorna dados vazios sem requisição extra", async () => {
  let calls = 0
  const profile = await fetchGithubProfile("teste", {
    fetcher: async () => { calls++; return ok(user(0)) },
  })
  assert.equal(calls, 1)
  assert.equal(profile.repos.length, 0)
  assert.equal(profile.complete, true)
  assert.deepEqual(summarizeProfile(profile).languages, [])
})
