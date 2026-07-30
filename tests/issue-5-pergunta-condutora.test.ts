import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { perguntaCondutoraDaTurma, perguntaCondutoraDoUsuario } from '@/db/curso'
import { alunos, cursos, turmas, usuarios } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'

// Nomes vindos literalmente dos critérios de aceite da issue 5 em
// docs/BACKLOG.md. SSOT: `D1-PERGUNTA`.

const GRUPO_DO_ALUNO = 'src/app/(aluno)'

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

function paginasDoAluno(diretorio: string): string[] {
  const encontradas: string[] = []
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, entrada.name)
    if (entrada.isDirectory()) encontradas.push(...paginasDoAluno(caminho))
    else if (entrada.name === 'page.tsx') encontradas.push(caminho)
  }
  return encontradas
}

describe('Issue 5 — pergunta condutora persistente', () => {
  let banco: BancoEfemero

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('pergunta_condutora_em_todas_as_telas_do_aluno', async () => {
    // A garantia é ESTRUTURAL, não de disciplina: a pergunta é renderizada
    // pelo layout do grupo de rotas, então qualquer tela nova sob ele nasce
    // com ela. Uma lista de páginas que "precisam mostrar" falharia em
    // silêncio no dia em que alguém criasse a próxima.
    const layout = join(GRUPO_DO_ALUNO, 'layout.tsx')
    expect(existsSync(layout)).toBe(true)

    const fonte = readFileSync(layout, 'utf8')
    expect(fonte).toContain('PerguntaCondutora')

    // E nenhuma página do aluno pode renderizá-la por conta própria: isso
    // duplicaria na tela e sinalizaria que alguém saiu do layout.
    for (const pagina of paginasDoAluno(GRUPO_DO_ALUNO)) {
      expect(readFileSync(pagina, 'utf8'), `${pagina} não deve repetir a pergunta`).not.toContain(
        '<PerguntaCondutora',
      )
    }

    // O dado chega de verdade pela matrícula do usuário.
    const [curso] = await banco.db
      .insert(cursos)
      .values({
        nome: 'Curso',
        tamanhoMaximoDeGrupo: 2,
        perguntaCondutora: 'Como um sistema representa um negócio que muda de regra?',
      })
      .returning()
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso!.id, nome: 'Turma' })
      .returning()
    const [usuario] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 1, githubLogin: 'ana', nome: 'Ana', papel: 'aluno' })
      .returning()
    await banco.db.insert(alunos).values({ turmaId: turma!.id, usuarioId: usuario!.id })

    expect(await perguntaCondutoraDoUsuario(banco.db, usuario!.id)).toBe(
      'Como um sistema representa um negócio que muda de regra?',
    )

    // Sem matrícula não há pergunta — caso real no primeiro login.
    const [semTurma] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 2, githubLogin: 'bruno', nome: 'Bruno', papel: 'aluno' })
      .returning()
    expect(await perguntaCondutoraDoUsuario(banco.db, semTurma!.id)).toBeNull()
  })

  it('pergunta_condutora_e_configuravel', async () => {
    // Dois cursos, duas perguntas diferentes: o texto é dado, não literal.
    const primeira = 'Como um sistema representa um negócio que muda de regra?'
    const segunda = 'Por que duas telas parecidas não deveriam ser dois códigos?'

    const criados = await banco.db
      .insert(cursos)
      .values([
        { nome: 'Curso A', tamanhoMaximoDeGrupo: 2, perguntaCondutora: primeira },
        { nome: 'Curso B', tamanhoMaximoDeGrupo: 3, perguntaCondutora: segunda },
      ])
      .returning()

    const turmasCriadas = await banco.db
      .insert(turmas)
      .values([
        { cursoId: criados[0]!.id, nome: 'T-A' },
        { cursoId: criados[1]!.id, nome: 'T-B' },
      ])
      .returning()

    expect(await perguntaCondutoraDaTurma(banco.db, turmasCriadas[0]!.id)).toBe(primeira)
    expect(await perguntaCondutoraDaTurma(banco.db, turmasCriadas[1]!.id)).toBe(segunda)

    // Curso sem pergunta não é curso por projetos: o banco rejeita vazio e
    // rejeita só espaço em branco.
    const erro = await banco.db
      .insert(cursos)
      .values({ nome: 'Curso vazio', tamanhoMaximoDeGrupo: 2, perguntaCondutora: '   ' })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(erro).toBeInstanceOf(Error)
    expect(causaDe(erro)).toMatch(/pergunta_condutora_nao_vazia/)

    // Nenhuma pergunta literal no código que a serve nem no componente.
    const fontes = ['src/db/curso.ts', 'src/components/pergunta-condutora.tsx']
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n')
    expect(fontes).not.toMatch(/\?['"`]/)
  })
})
