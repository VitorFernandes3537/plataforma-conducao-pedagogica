import { readdirSync, readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { alunos, grupos, repositorios, turmas, usuarios } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 1 em
// docs/BACKLOG.md. SSOT: Doc 2 §2.4.1 (tamanho do grupo) · Doc 5 §6
// (repositório individual) · Doc 6 §9.1 (copiloto).

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

/**
 * Remove os IDs SSOT antes da varredura de vocabulário.
 *
 * A regra do CLAUDE.md §4.2 proíbe conceito do curso em ENTIDADE, coluna, rota,
 * componente e nome de teste. Um ID como `D6-PESOS-PAREDE` não é nada disso: é o
 * ponteiro para o documento-dono, e a §5 exige justamente que ele apareça no
 * código para que uma mudança de regra seja rastreável por busca.
 *
 * A exceção é estreita de propósito — casa só o formato `D<n>-MAIÚSCULAS`. A
 * palavra solta continua sendo defeito em qualquer outro lugar.
 */
const ID_SSOT = new RegExp(String.raw`\bD\d+-[A-Z][A-Z-]*\b`, 'g')

function semIdsSsot(fonte: string): string {
  return fonte.replace(ID_SSOT, 'SSOT')
}

describe('Issue 1 — modelo genérico: Curso, Turma, Aluno, Grupo', () => {
  let banco: BancoEfemero

  // Nenhum número aqui é regra: é a configuração deste curso de teste.
  const TAMANHO_MAXIMO = 2

  async function cenario() {
    const curso = await criaCurso(banco, { tamanhoMaximoDeGrupo: TAMANHO_MAXIMO })
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma de teste' })
      .returning()
    const [grupo] = await banco.db
      .insert(grupos)
      .values({ turmaId: turma!.id })
      .returning()
    return { curso: curso!, turma: turma!, grupo: grupo! }
  }

  /** Identidade mora em `usuarios`; `alunos` é a matrícula numa turma. */
  async function novoAluno(turmaId: string, githubUserId: number, nome: string) {
    const [usuario] = await banco.db
      .insert(usuarios)
      .values({ githubUserId, githubLogin: `user${githubUserId}`, nome, papel: 'aluno' })
      .returning()
    return { turmaId, usuarioId: usuario!.id }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    // Defensivo: se o beforeEach falhar, o erro real é o dele, e um
    // TypeError aqui só esconderia a causa.
    await banco?.encerra()
  })

  it('grupo_aceita_um_ou_dois_alunos', async () => {
    const { turma, grupo } = await cenario()

    await banco.db
      .insert(alunos)
      .values({ ...(await novoAluno(turma.id, 1, 'Primeiro')), grupoId: grupo.id, posicaoNoGrupo: 1 })
    await banco.db
      .insert(alunos)
      .values({ ...(await novoAluno(turma.id, 2, 'Segundo')), grupoId: grupo.id, posicaoNoGrupo: 2 })

    const doGrupo = await banco.db.select().from(alunos).where(eq(alunos.grupoId, grupo.id))
    expect(doGrupo).toHaveLength(2)

    // O terceiro é rejeitado pelo banco, não pela aplicação — o limite vem
    // da configuração do curso, lido pelo gatilho. Verificar a causa prova
    // que rejeitou por isso, e não por outra constraint da tabela.
    const erro = await banco.db
      .insert(alunos)
      .values({ ...(await novoAluno(turma.id, 3, 'Terceiro')), grupoId: grupo.id, posicaoNoGrupo: 3 })
      .then(
        () => null,
        (e: unknown) => e,
      )

    expect(erro).toBeInstanceOf(Error)
    expect(causaDe(erro)).toMatch(/configura no maximo 2/)
  })

  it('cada_aluno_tem_repositorio_proprio', async () => {
    const { turma, grupo } = await cenario()

    const [a] = await banco.db
      .insert(alunos)
      .values({ ...(await novoAluno(turma.id, 10, 'A')), grupoId: grupo.id, posicaoNoGrupo: 1 })
      .returning()
    const [b] = await banco.db
      .insert(alunos)
      .values({ ...(await novoAluno(turma.id, 11, 'B')), grupoId: grupo.id, posicaoNoGrupo: 2 })
      .returning()

    await banco.db.insert(repositorios).values({ alunoId: a!.id, url: 'https://github.com/a/p' })
    await banco.db.insert(repositorios).values({ alunoId: b!.id, url: 'https://github.com/b/p' })

    const todos = await banco.db.select().from(repositorios)
    expect(todos).toHaveLength(2)
    expect(new Set(todos.map((r) => r.alunoId)).size).toBe(2)

    // Um aluno não tem dois repositórios.
    await expect(
      banco.db.insert(repositorios).values({ alunoId: a!.id, url: 'https://github.com/a/outro' }),
    ).rejects.toThrow()
  })

  it('aluno_tem_estado_copiloto', async () => {
    const { turma, grupo } = await cenario()

    const [aluno] = await banco.db
      .insert(alunos)
      .values({ ...(await novoAluno(turma.id, 20, 'C')), grupoId: grupo.id, posicaoNoGrupo: 1 })
      .returning()

    expect(aluno!.copiloto).toBe(false)

    const [convertido] = await banco.db
      .update(alunos)
      .set({ copiloto: true })
      .where(eq(alunos.id, aluno!.id))
      .returning()

    expect(convertido!.copiloto).toBe(true)
  })

  it('aluno_solo_e_valido', async () => {
    const { turma, grupo } = await cenario()

    const [solo] = await banco.db
      .insert(alunos)
      .values({ ...(await novoAluno(turma.id, 30, 'Solo')), grupoId: grupo.id, posicaoNoGrupo: 1 })
      .returning()

    await banco.db
      .insert(repositorios)
      .values({ alunoId: solo!.id, url: 'https://github.com/solo/p' })

    const doGrupo = await banco.db.select().from(alunos).where(eq(alunos.grupoId, grupo.id))
    expect(doGrupo).toHaveLength(1)

    const seuRepo = await banco.db
      .select()
      .from(repositorios)
      .where(eq(repositorios.alunoId, solo!.id))
    expect(seuRepo).toHaveLength(1)
  })

  it('modelo_nao_menciona_conceito_do_curso', () => {
    const schema = readFileSync('src/db/schema/index.ts', 'utf8')
    const migrations = readdirSync('drizzle')
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(`drizzle/${f}`, 'utf8'))
      .join('\n')

    // CLAUDE.md §4.2. Fronteira de palavra para não acusar "duplicata"
    // por causa de "dupla".
    const proibidos = /\b(poo|c#|csharp|parede|paredes|dupla|duplas|python|biblioteca|bibliotecas)\b/i

    expect(semIdsSsot(schema)).not.toMatch(proibidos)
    expect(semIdsSsot(migrations)).not.toMatch(proibidos)
  })
})
