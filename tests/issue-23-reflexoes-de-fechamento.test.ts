import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { confirmaPush } from '@/db/registro-diario'
import {
  reflexoesDoCurso,
  ReflexaoInvalida,
  respondeReflexao,
  situacaoDasReflexoes,
} from '@/db/reflexao'
import { notaDoAluno, pendenciasDeInstrumentos } from '@/db/rubrica'
import {
  alunos,
  dias,
  eixos,
  grupos,
  instrumentosDoEixo,
  niveisDeAvaliacao,
  reflexoesDeFechamento,
  respostasDeReflexao,
  turmas,
  usuarios,
} from '@/db/schema'
import { AcessoNegado } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'
import { ID_INEXISTENTE } from './suporte/identificadores'

// Nomes vindos literalmente dos critérios de aceite da issue 23 em
// docs/BACKLOG.md. SSOT: Doc 6 §5.1 · Doc 6 §7 · `D6-EIXOS`.

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 23 — reflexões de fechamento', () => {
  let banco: BancoEfemero

  /** Calendário curto: quantos dias o curso tem é configuração. */
  const DIAS = 3

  /**
   * As duas reflexões deste curso fictício, com os enunciados traduzidos.
   *
   * A segunda é a que o Doc 6 §5.1 chama de único instrumento que captura o
   * pensamento — as outras capturam o código.
   */
  const REFLEXOES = [
    {
      ordem: 1,
      enunciado: 'O que a ferramenta fazia por você, que agora você precisa fazer sozinho?',
    },
    {
      ordem: 2,
      enunciado: 'O que mudou no jeito que você pensa antes de começar a escrever?',
    },
  ]

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const diasCriados = await banco.db
      .insert(dias)
      .values(Array.from({ length: DIAS }, (_, i) => ({ cursoId: curso.id, ordem: i + 1 })))
      .returning()

    await banco.db.insert(niveisDeAvaliacao).values(
      [0, 1, 2, 3].map((valor) => ({
        cursoId: curso.id,
        valor,
        descritor: `Nível ${valor}`,
        contaComoSuperacao: valor >= 1,
      })),
    )

    // As reflexões são respondidas nos dois últimos dias.
    const reflexoes = await banco.db
      .insert(reflexoesDeFechamento)
      .values(
        REFLEXOES.map((r, i) => ({
          cursoId: curso.id,
          ...r,
          diaId: diasCriados[DIAS - 2 + i]!.id,
        })),
      )
      .returning()

    // Um eixo de presença que confere push e reflexão. O peso de cada
    // instrumento é do curso: a reflexão que captura o pensamento não pode valer
    // o mesmo que um clique de confirmação.
    const [eixoDePratica] = await banco.db
      .insert(eixos)
      .values({
        cursoId: curso.id,
        ordem: 1,
        nome: 'Prática',
        peso: 0.2,
        unidade: 'aluno' as const,
        fonte: 'presenca_de_instrumentos' as const,
      })
      .returning()

    await banco.db.insert(instrumentosDoEixo).values([
      { eixoId: eixoDePratica!.id, tipo: 'confirmacao_de_push' as const, peso: 1 },
      { eixoId: eixoDePratica!.id, tipo: 'reflexao_de_fechamento' as const, peso: 2 },
    ])

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 2301, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    const pessoas = []
    for (const [i, nome] of ['Ana', 'Bruno'].entries()) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({ githubUserId: 2310 + i, githubLogin: nome.toLowerCase(), nome, papel: 'aluno' })
        .returning()
      const [aluno] = await banco.db
        .insert(alunos)
        .values({
          turmaId: turma!.id,
          usuarioId: usuario!.id,
          grupoId: grupo!.id,
          posicaoNoGrupo: i + 1,
        })
        .returning()
      pessoas.push({ aluno: aluno!, usuario: usuario! })
    }

    return {
      curso,
      turma: turma!,
      dias: diasCriados,
      reflexoes,
      eixoDePratica: eixoDePratica!,
      instrutora: instrutora!,
      grupo: grupo!,
      ana: pessoas[0]!,
      bruno: pessoas[1]!,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('reflexao_pertence_a_aluno_e_dia', async () => {
    const c = await cenario()

    await respondeReflexao(
      banco.db,
      c.ana.aluno.id,
      c.reflexoes[1]!.id,
      '  Passei a desenhar os estados antes de abrir o editor.  ',
      c.ana.usuario.id,
    )

    const daAna = await situacaoDasReflexoes(banco.db, c.ana.aluno.id)
    expect(daAna).toHaveLength(REFLEXOES.length)
    expect(daAna[1]?.respondida).toBe(true)
    expect(daAna[1]?.texto).toBe('Passei a desenhar os estados antes de abrir o editor.')
    expect(daAna[1]?.diaId).toBe(c.dias[DIAS - 1]!.id)

    // É de um aluno: a de Bruno continua vazia, mesmo no mesmo grupo. A reflexão
    // captura o pensamento de quem escreve, e não há pensamento de par.
    const doBruno = await situacaoDasReflexoes(banco.db, c.bruno.aluno.id)
    expect(doBruno.every((r) => !r.respondida)).toBe(true)

    // E é de um dia: o dia vem da reflexão, não de quem chama. Sem isso a
    // retrospectiva do último dia poderia ser respondida no primeiro, quando não
    // há o que retrospectar.
    const cruzada = await banco.db
      .insert(respostasDeReflexao)
      .values({
        registroDiarioId: (await registroNoDia(c.ana.aluno.id, c.dias[0]!.id))!,
        reflexaoId: c.reflexoes[1]!.id,
        texto: 'respondendo cedo demais',
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(cruzada).toBeInstanceOf(Error)
    expect(causaDe(cruzada)).toMatch(/e respondida no dia .* e o registro e do dia/)

    // Texto em branco não entra, nem pela aplicação nem pelo banco.
    await expect(
      respondeReflexao(banco.db, c.ana.aluno.id, c.reflexoes[0]!.id, '   ', c.ana.usuario.id),
    ).rejects.toThrow(ReflexaoInvalida)

    // Reescrever é o caminho normal: não há resposta certa, então não há
    // momento em que o texto passe a estar fechado (Doc 6 §5.1).
    await respondeReflexao(
      banco.db,
      c.ana.aluno.id,
      c.reflexoes[1]!.id,
      'Versão revista.',
      c.ana.usuario.id,
    )
    expect((await situacaoDasReflexoes(banco.db, c.ana.aluno.id))[1]?.texto).toBe('Versão revista.')

    // Reflexão é produção própria.
    await expect(
      respondeReflexao(banco.db, c.bruno.aluno.id, c.reflexoes[0]!.id, 'pelo colega', c.ana.usuario.id),
    ).rejects.toThrow(AcessoNegado)

    await expect(
      respondeReflexao(banco.db, c.ana.aluno.id, ID_INEXISTENTE, 'texto', c.ana.usuario.id),
    ).rejects.toThrow(ReflexaoInvalida)
  })

  async function registroNoDia(alunoId: string, diaId: string) {
    const { garanteRegistroDiario } = await import('@/db/registro-diario')
    return (await garanteRegistroDiario(banco.db, alunoId, diaId)).id
  }

  it('enunciado_da_reflexao_e_configuravel', async () => {
    const c = await cenario()

    const doCurso = await reflexoesDoCurso(banco.db, c.curso.id)
    expect(doCurso.map((r) => r.enunciado)).toEqual(REFLEXOES.map((r) => r.enunciado))

    // O enunciado É o instrumento: trocar a pergunta troca o que se captura. Por
    // isso é dado, e outro curso pergunta outra coisa, em outra quantidade.
    const outro = await criaCurso(banco, { nome: 'Outro curso' })
    const [diaDoOutro] = await banco.db
      .insert(dias)
      .values({ cursoId: outro.id, ordem: 1 })
      .returning()
    await banco.db.insert(reflexoesDeFechamento).values({
      cursoId: outro.id,
      ordem: 1,
      enunciado: 'Pergunta única deste outro curso?',
      diaId: diaDoOutro!.id,
    })

    const doOutro = await reflexoesDoCurso(banco.db, outro.id)
    expect(doOutro).toHaveLength(1)
    expect(doOutro[0]?.enunciado).not.toBe(doCurso[0]?.enunciado)

    // Enunciado em branco não entra, e a ordem é única no curso.
    await expect(
      banco.db.insert(reflexoesDeFechamento).values({
        cursoId: outro.id,
        ordem: 2,
        enunciado: '  ',
        diaId: diaDoOutro!.id,
      }),
    ).rejects.toThrow()
    await expect(
      banco.db.insert(reflexoesDeFechamento).values({
        cursoId: outro.id,
        ordem: 1,
        enunciado: 'repetida',
        diaId: diaDoOutro!.id,
      }),
    ).rejects.toThrow()

    // Reflexão de outro curso não é respondível: pediria ao aluno uma pergunta
    // que a turma dele nunca recebeu.
    const alheia = await respondeReflexao(
      banco.db,
      c.ana.aluno.id,
      doOutro[0]!.id,
      'texto',
      c.ana.usuario.id,
    ).then(
      () => null,
      (e: unknown) => e,
    )
    expect(alheia).toBeInstanceOf(Error)
  })

  it('reflexao_entra_no_eixo_3', async () => {
    const c = await cenario()

    // Sem nada entregue, o eixo de prática existe e vale zero — não é nulo,
    // porque os instrumentos eram esperados e não vieram.
    const vazio = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(vazio.eixos[0]?.nome).toBe('Prática')
    expect(vazio.eixos[0]?.proporcao).toBeCloseTo(0)

    // Push em todos os dias: o instrumento de peso 1 chega a 1, o de peso 2
    // continua em 0. Média ponderada = (1×1 + 0×2) / 3.
    for (const dia of c.dias) {
      await confirmaPush(banco.db, c.ana.aluno.id, dia.id, c.ana.usuario.id)
    }
    const soPush = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(soPush.eixos[0]?.proporcao).toBeCloseTo(1 / 3)

    // Responder as duas reflexões leva o eixo ao máximo. É o critério: a
    // reflexão ENTRA no eixo, com o peso que o curso deu.
    for (const reflexao of c.reflexoes) {
      await respondeReflexao(
        banco.db,
        c.ana.aluno.id,
        reflexao.id,
        `Resposta à reflexão ${reflexao.ordem}.`,
        c.ana.usuario.id,
      )
    }
    const completo = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(completo.eixos[0]?.proporcao).toBeCloseTo(1)

    // O peso é do curso, e mudá-lo muda a nota sem tocar em código: a reflexão
    // que captura o pensamento não pode valer o mesmo que um clique.
    await banco.db
      .update(instrumentosDoEixo)
      .set({ peso: 9 })
      .where(eq(instrumentosDoEixo.tipo, 'reflexao_de_fechamento'))

    // Só metade das reflexões, com peso alto: o eixo cai muito mais.
    await banco.db.delete(respostasDeReflexao)
    await respondeReflexao(
      banco.db,
      c.ana.aluno.id,
      c.reflexoes[0]!.id,
      'Só a primeira.',
      c.ana.usuario.id,
    )
    const comPesoAlto = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(comPesoAlto.eixos[0]?.proporcao).toBeCloseTo((1 * 1 + 0.5 * 9) / 10)
  })

  it('reflexao_pendente_aparece_na_agregacao', async () => {
    const c = await cenario()

    // Nada entregue: as duas pendências aparecem, com o tamanho de cada uma.
    const tudoPendente = await pendenciasDeInstrumentos(banco.db, c.ana.aluno.id)
    expect(tudoPendente.map((p) => p.tipo).sort()).toEqual([
      'confirmacao_de_push',
      'reflexao_de_fechamento',
    ])
    const daReflexao = tudoPendente.find((p) => p.tipo === 'reflexao_de_fechamento')
    expect(daReflexao?.entregues).toBe(0)
    expect(daReflexao?.esperados).toBe(REFLEXOES.length)

    // Responder uma reduz a pendência sem apagá-la: o instrutor precisa ver que
    // falta a outra, e a da retrospectiva é o único instrumento que captura o
    // pensamento (Doc 6 §5.1).
    await respondeReflexao(
      banco.db,
      c.ana.aluno.id,
      c.reflexoes[0]!.id,
      'Primeira respondida.',
      c.ana.usuario.id,
    )
    const parcial = await pendenciasDeInstrumentos(banco.db, c.ana.aluno.id)
    const aindaFalta = parcial.find((p) => p.tipo === 'reflexao_de_fechamento')
    expect(aindaFalta?.entregues).toBe(1)
    expect(aindaFalta?.esperados).toBe(REFLEXOES.length)

    // Respondendo a segunda, a pendência da reflexão some — e só ela.
    await respondeReflexao(
      banco.db,
      c.ana.aluno.id,
      c.reflexoes[1]!.id,
      'Segunda respondida.',
      c.ana.usuario.id,
    )
    const semReflexao = await pendenciasDeInstrumentos(banco.db, c.ana.aluno.id)
    expect(semReflexao.map((p) => p.tipo)).toEqual(['confirmacao_de_push'])

    // Com tudo entregue, nenhuma pendência.
    for (const dia of c.dias) {
      await confirmaPush(banco.db, c.ana.aluno.id, dia.id, c.ana.usuario.id)
    }
    expect(await pendenciasDeInstrumentos(banco.db, c.ana.aluno.id)).toHaveLength(0)

    // A pendência é por aluno: a de Bruno continua inteira.
    expect(await pendenciasDeInstrumentos(banco.db, c.bruno.aluno.id)).toHaveLength(2)
  })

  it('instrumento_sem_nada_esperado_nao_conta_contra', async () => {
    // Cobrar crítica de um grupo que não foi sorteado em rodada nenhuma puniria
    // quem cumpriu tudo o que existia para cumprir. Instrumento com zero
    // esperado sai da conta em vez de contar como zero.
    const c = await cenario()

    await banco.db
      .insert(instrumentosDoEixo)
      .values({ eixoId: c.eixoDePratica.id, tipo: 'registro_de_critica' as const, peso: 5 })

    for (const dia of c.dias) {
      await confirmaPush(banco.db, c.ana.aluno.id, dia.id, c.ana.usuario.id)
    }
    for (const reflexao of c.reflexoes) {
      await respondeReflexao(banco.db, c.ana.aluno.id, reflexao.id, 'texto', c.ana.usuario.id)
    }

    // Sem rodada de crítica nenhuma, o eixo chega ao máximo mesmo com o
    // instrumento de peso 5 declarado.
    const nota = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(nota.eixos[0]?.proporcao).toBeCloseTo(1)
    expect(await pendenciasDeInstrumentos(banco.db, c.ana.aluno.id)).toHaveLength(0)
  })
})
