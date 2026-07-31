import { config as carregaEnv } from 'dotenv'
import { Client } from 'pg'

/**
 * Matricula uma pessoa real como instrutor.
 *
 * Existe por causa de um buraco de partida: o `signIn` só deixa entrar quem já
 * está em `usuarios` (ADR 0002), e nada criava a primeira linha. O seed cria um
 * instrutor fictício com identificador inventado, então a pessoa de verdade
 * batia em "acesso negado" no primeiro login e não havia por onde sair.
 *
 * É script de linha de comando, e não tela, de propósito: quem executa precisa
 * de acesso ao banco. Uma tela que criasse instrutor seria uma porta aberta —
 * o primeiro a chegar viraria dono do curso.
 *
 *   npm run instrutor -- <login-do-github>
 *   npm run instrutor -- <login-do-github> <id-numerico>
 *
 * O identificador numérico é a chave (ADR 0002 §2): o login é exibição, o
 * GitHub deixa trocá-lo, e o antigo fica livre para outra pessoa registrar. Se
 * a consulta à API pública falhar — rede, proxy —, passe o número na mão; ele
 * aparece em https://api.github.com/users/<login>
 */
async function idDoGitHub(login) {
  const resposta = await fetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
    headers: { accept: 'application/vnd.github+json' },
  })

  if (!resposta.ok) {
    throw new Error(
      `A API do GitHub respondeu ${resposta.status} para "${login}". ` +
        'Confira o login, ou passe o identificador numérico como segundo argumento.',
    )
  }

  const perfil = await resposta.json()
  if (!Number.isSafeInteger(perfil.id)) {
    throw new Error('A API do GitHub não devolveu um identificador numérico utilizável.')
  }
  return { id: perfil.id, nome: perfil.name || perfil.login }
}

async function principal() {
  carregaEnv({ path: '.env.local', quiet: true })

  const [login, idInformado] = process.argv.slice(2)

  if (!login) {
    console.error('Uso: npm run instrutor -- <login-do-github> [id-numerico]')
    process.exitCode = 1
    return
  }

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não definida. Confira o .env.local.')
    process.exitCode = 1
    return
  }

  const perfil = idInformado
    ? { id: Number(idInformado), nome: login }
    : await idDoGitHub(login).catch((erro) => {
        console.error(String(erro.message))
        console.error('\nPara descobrir o número na mão:')
        console.error(`  https://api.github.com/users/${login}`)
        process.exit(1)
      })

  if (!Number.isSafeInteger(perfil.id)) {
    console.error(`"${idInformado}" não é um identificador numérico válido.`)
    process.exitCode = 1
    return
  }

  const cliente = new Client({ connectionString: process.env.DATABASE_URL })
  await cliente.connect()

  try {
    // Promove quem já existe em vez de recusar: quem entrou como aluno e passa a
    // conduzir é caso real, e recriar a linha perderia o vínculo com tudo que
    // ela já assinou.
    const { rows } = await cliente.query(
      `insert into usuarios (github_user_id, github_login, nome, papel)
            values ($1, $2, $3, 'instrutor')
       on conflict (github_user_id)
       do update set github_login = excluded.github_login,
                     nome         = excluded.nome,
                     papel        = 'instrutor'
         returning id, github_user_id, github_login, papel`,
      [perfil.id, login, perfil.nome],
    )

    const usuario = rows[0]
    console.log(`Instrutor matriculado: ${usuario.github_login} (id ${usuario.github_user_id}).`)
    console.log('Agora o login pelo GitHub funciona para esta conta.')
  } finally {
    await cliente.end()
  }
}

principal().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : String(erro))
  process.exitCode = 1
})
