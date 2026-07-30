import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import {
  escreveNoMural,
  ItemDeMuralInvalido,
  muralDaTurma,
  muralEmAberto,
  reabreItem,
  riscaItem,
} from '@/db/mural'
import {
  alunos,
  blocos,
  dias,
  grupos,
  itensDeMural,
  obstaculos,
  turmas,
  usuarios,
} from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 15 em
// docs/BACKLOG.md. SSOT: `D5-MURAL` · Doc 5 §8 · `D3-07`.

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 15 — mural do "precisamos saber"', () => {
  let banco: BancoEfemero

  /**
   * Os tipos de bloco são vocabulário do curso e entram como DADO — `blocos.tipo`
   * é texto justamente por isso. Nenhum destes nomes existe em `src/`.
   */
  const TIPOS_DE_BLOCO = ['abertura', 'obstaculo', 'implementacao', 'fechamento']

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const obstaculosCriados = await banco.db
      .insert(obstaculos)
      .values([
        {
          cursoId: curso.id,
          ordem: 1,
          pergunta: 'Por que meu programa aceita um estado que não existe?',
          peso: 1,
        },
        {
          cursoId: curso.id,
          ordem: 2,
          pergunta: 'Por que minha condicional não para de crescer?',
          peso: 2,
        },
      ])
      .returning()

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 3001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()
    const [usuarioAluno] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 3002, githubLogin: 'aluno', nome: 'Aluno', papel: 'aluno' })
      .returning()

    const gruposCriados = await banco.db
      .insert(grupos)
      .values([{ turmaId: turma!.id }, { turmaId: turma!.id }])
      .returning()

    await banco.db.insert(alunos).values({
      turmaId: turma!.id,
      usuarioId: usuarioAluno!.id,
      grupoId: gruposCriados[0]!.id,
      posicaoNoGrupo: 1,
    })

    return {
      curso,
      turma: turma!,
      primeiro: obstaculosCriados[0]!,
      segundo: obstaculosCriados[1]!,
      instrutora: instrutora!,
      aluno: usuarioAluno!,
      grupoA: gruposCriados[0]!,
      grupoB: gruposCriados[1]!,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('item_de_mural_exige_vinculo_com_obstaculo', async () => {
    const c = await cenario()

    await escreveNoMural(
      banco.db,
      c.grupoA.id,
      c.primeiro.id,
      'Como impedir que um estado mude de qualquer lugar?',
    )

    // Sem obstáculo o item não tem onde aparecer: é a pergunta que agrupa, e o
    // mural não tem lista solta.
    await expect(
      banco.db
        .insert(itensDeMural)
        .values({ grupoId: c.grupoA.id, texto: 'solto' } as never),
    ).rejects.toThrow()

    // Item em branco também não entra — nem pela aplicação, nem pelo banco.
    await expect(
      escreveNoMural(banco.db, c.grupoA.id, c.primeiro.id, '   '),
    ).rejects.toThrow(ItemDeMuralInvalido)
    await expect(
      banco.db
        .insert(itensDeMural)
        .values({ grupoId: c.grupoA.id, obstaculoId: c.primeiro.id, texto: '  ' }),
    ).rejects.toThrow()

    // E o obstáculo tem de ser do curso da turma do grupo. A chave estrangeira
    // garante que existe; o gatilho garante que é o certo — item agrupado sob
    // uma pergunta que a turma nunca viu vira ruído na primeira tela do aluno.
    const outroCurso = await criaCurso(banco, { nome: 'Outro curso' })
    const [obstaculoAlheio] = await banco.db
      .insert(obstaculos)
      .values({ cursoId: outroCurso.id, ordem: 1, pergunta: 'Pergunta de outro curso?', peso: 1 })
      .returning()

    const cruzado = await banco.db
      .insert(itensDeMural)
      .values({ grupoId: c.grupoA.id, obstaculoId: obstaculoAlheio!.id, texto: 'de fora' })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(cruzado).toBeInstanceOf(Error)
    expect(causaDe(cruzado)).toMatch(/e do curso .* e o grupo .* e do curso/)
  })

  it('apenas_instrutor_risca_item', async () => {
    const c = await cenario()

    const { id } = await escreveNoMural(
      banco.db,
      c.grupoA.id,
      c.primeiro.id,
      'Dá para ter uma lista com tipos diferentes juntos?',
    )

    // O grupo escreve e NÃO risca. Se pudesse, o mural deixaria de mostrar o que
    // a turma ainda não sabe e passaria a mostrar o que cada grupo acha que já
    // sabe (Doc 5 §8.1).
    await expect(riscaItem(banco.db, id, c.aluno.id)).rejects.toThrow(NaoAutorizado)

    const aindaAberto = await muralDaTurma(banco.db, c.turma.id)
    expect(aindaAberto[0]?.itens[0]?.status).toBe('aberto')

    // O instrutor risca, e fica registrado quem riscou e quando — o mural é
    // consultado na abertura de todo dia para saber o que já foi respondido.
    const { resolvidoEm } = await riscaItem(banco.db, id, c.instrutora.id)
    expect(resolvidoEm).toBeInstanceOf(Date)

    const riscado = await banco.db.select().from(itensDeMural).where(eq(itensDeMural.id, id))
    expect(riscado[0]?.status).toBe('resolvido')
    expect(riscado[0]?.resolvidoPorId).toBe(c.instrutora.id)

    // Riscar duas vezes é recusado: o segundo risco moveria a data e o autor do
    // primeiro.
    await expect(riscaItem(banco.db, id, c.instrutora.id)).rejects.toThrow(ItemDeMuralInvalido)

    // Estado impossível barrado pelo banco: resolvido sem quem resolveu.
    await expect(
      banco.db
        .update(itensDeMural)
        .set({ status: 'resolvido', resolvidoPorId: null, resolvidoEm: null })
        .where(eq(itensDeMural.id, id)),
    ).rejects.toThrow()

    // Riscar por engano tem volta, e a volta também é do instrutor.
    await expect(reabreItem(banco.db, id, c.aluno.id)).rejects.toThrow(NaoAutorizado)
    const { reabertos } = await reabreItem(banco.db, id, c.instrutora.id)
    expect(reabertos).toBe(1)

    const reaberto = await banco.db.select().from(itensDeMural).where(eq(itensDeMural.id, id))
    expect(reaberto[0]?.status).toBe('aberto')
    expect(reaberto[0]?.resolvidoPorId).toBeNull()
  })

  it('mural_agrupa_por_pergunta', async () => {
    const c = await cenario()

    await escreveNoMural(banco.db, c.grupoA.id, c.primeiro.id, 'Primeira dúvida.')
    await escreveNoMural(banco.db, c.grupoB.id, c.primeiro.id, 'Segunda dúvida, mesmo obstáculo.')
    await escreveNoMural(banco.db, c.grupoA.id, c.segundo.id, 'Dúvida do outro obstáculo.')

    const mural = await muralDaTurma(banco.db, c.turma.id)

    // A chave do agrupamento é a PERGUNTA, nunca o número. Agrupar por ordinal
    // transformaria o mural em índice de aula numerada — que é exatamente o que
    // separa o método de um currículo (`D3-07`).
    expect(mural.map((g) => g.pergunta)).toEqual([c.primeiro.pergunta, c.segundo.pergunta])
    expect(mural.every((g) => g.pergunta.trim().length > 0)).toBe(true)
    expect(mural[0]?.itens).toHaveLength(2)
    expect(mural[1]?.itens).toHaveLength(1)

    // Dois grupos travados na mesma pergunta aparecem juntos: é o que faz a sala
    // ver que ninguém está sozinho travando (Doc 5 §8.2).
    expect(new Set(mural[0]!.itens.map((i) => i.grupoId)).size).toBe(2)

    // A pergunta SEM dúvida nenhuma continua aparecendo: significa que a turma
    // passou por ali sem travar, e o instrutor lê isso na abertura.
    const [terceiro] = await banco.db
      .insert(obstaculos)
      .values({ cursoId: c.curso.id, ordem: 3, pergunta: 'Ninguém travou aqui?', peso: 1 })
      .returning()
    const comVazio = await muralDaTurma(banco.db, c.turma.id)
    expect(comVazio).toHaveLength(3)
    expect(comVazio.find((g) => g.obstaculoId === terceiro!.id)?.itens).toHaveLength(0)

    // Riscado continua vindo, marcado: o mural é o que sobrevive ao dia e
    // alimenta a retrospectiva, e apagar o resolvido apagaria metade dela.
    const primeiroItem = mural[0]!.itens[0]!
    await riscaItem(banco.db, primeiroItem.id, c.instrutora.id)
    const depois = await muralDaTurma(banco.db, c.turma.id)
    expect(depois[0]?.itens).toHaveLength(2)
    expect(depois[0]?.itens.filter((i) => i.status === 'resolvido')).toHaveLength(1)

    // A leitura do degrau 2 da escada traz só o que a turma ainda não sabe.
    const emAberto = await muralEmAberto(banco.db, c.turma.id)
    expect(emAberto.flatMap((g) => g.itens)).toHaveLength(2)
    expect(emAberto.every((g) => g.itens.length > 0)).toBe(true)

    // O mural é da TURMA: item de outra turma não vaza.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: c.curso.id, nome: 'Outra turma' })
      .returning()
    const [grupoDaOutra] = await banco.db
      .insert(grupos)
      .values({ turmaId: outraTurma!.id })
      .returning()
    await escreveNoMural(banco.db, grupoDaOutra!.id, c.primeiro.id, 'Dúvida da outra turma.')

    expect((await muralDaTurma(banco.db, c.turma.id))[0]?.itens).toHaveLength(2)
    expect((await muralDaTurma(banco.db, outraTurma!.id))[0]?.itens).toHaveLength(1)
  })

  it('mural_acessivel_durante_implementacao', async () => {
    const c = await cenario()

    // O dia tem os quatro blocos configurados, com os tipos vindo de DADO — o
    // Doc 4 §2 nomeia os blocos com vocabulário do curso, e `blocos.tipo` é
    // texto por isso.
    const [dia] = await banco.db
      .insert(dias)
      .values({ cursoId: c.curso.id, ordem: 4 })
      .returning()
    await banco.db.insert(blocos).values(
      TIPOS_DE_BLOCO.map((tipo, i) => ({
        diaId: dia!.id,
        ordem: i + 1,
        duracaoMinutos: 30,
        tipo,
      })),
    )

    // Nenhum bloco fecha o mural. A plataforma não sabe que bloco está
    // acontecendo, e não deve saber: o Doc 5 §8.1 descreve QUANDO o grupo
    // escreve, que é conduta de sala, não trava de software. Fechar o mural por
    // bloco tiraria o degrau 2 da escada exatamente de quem está travado.
    for (const bloco of await banco.db.select().from(blocos).where(eq(blocos.diaId, dia!.id))) {
      const { id } = await escreveNoMural(
        banco.db,
        c.grupoA.id,
        c.primeiro.id,
        `Dúvida durante ${bloco.tipo}.`,
      )
      expect(id).toBeTruthy()
    }

    const mural = await muralDaTurma(banco.db, c.turma.id)
    expect(mural[0]?.itens).toHaveLength(TIPOS_DE_BLOCO.length)

    // E a leitura funciona igual: o mural é consultado na abertura de todo dia e
    // durante os blocos, sem estado que dependa do relógio.
    expect(await muralEmAberto(banco.db, c.turma.id)).toHaveLength(1)

    // A prova de que não há trava por bloco: nenhum tipo de bloco aparece no
    // código do mural. Se aparecesse, seria vocabulário do curso embutido
    // (CLAUDE.md §4.2) e uma regra que ninguém escreveu em documento nenhum.
    const fonte = readFileSync('src/db/mural.ts', 'utf8')
    for (const tipo of TIPOS_DE_BLOCO) {
      expect(fonte).not.toContain(`'${tipo}'`)
    }
  })
})
