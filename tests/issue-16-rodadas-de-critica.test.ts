import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  CriticaInvalida,
  pendenciasDaRodada,
  registraCritica,
  roteiroDaRodada,
  situacaoDaRodada,
  sorteiaRodada,
} from '@/db/critica'
import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import {
  grupos,
  perguntasDoRoteiro,
  registrosDeCritica,
  rodadasDeCritica,
  turmas,
  usuarios,
} from '@/db/schema'
import { chaveDoPar, sorteiaEmparelhamento } from '@/domain/sorteio'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 16 em
// docs/BACKLOG.md. SSOT: `D5-CRITICA` · Doc 5 §4.

/**
 * Gerador determinístico.
 *
 * O sorteio recebe a aleatoriedade por parâmetro justamente para isto: um
 * sorteio que chama `Math.random` por dentro não se reproduz, e o teste teria de
 * afirmar propriedades fracas em vez do resultado.
 *
 * O aquecimento não é enfeite. Sementes sequenciais neste gerador produzem
 * primeiras saídas separadas por menos de 0,0004 — de 1 a 40, todas caem na
 * mesma fatia e embaralham igual. Sem descartar as primeiras saídas, um teste
 * que varia a semente estaria repetindo o mesmo sorteio quarenta vezes e
 * concluindo que o sorteio não varia. Em produção o gerador é `Math.random` e
 * o problema não existe.
 */
function geradorDe(semente: number): () => number {
  let estado = semente >>> 0
  const proximo = () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
  for (let i = 0; i < 12; i += 1) proximo()
  return proximo
}

describe('Issue 16 — rodadas de crítica com sorteio e roteiros', () => {
  let banco: BancoEfemero

  /** Seis grupos: par, para o emparelhamento fechar sem sobra. */
  const GRUPOS = 6

  async function cenario(quantosGrupos = GRUPOS) {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const rodadas = await banco.db
      .insert(rodadasDeCritica)
      .values([
        { cursoId: curso.id, ordem: 1, nome: 'Primeira rodada' },
        { cursoId: curso.id, ordem: 2, nome: 'Segunda rodada' },
      ])
      .returning()

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 1201, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()
    const [aluno] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 1202, githubLogin: 'aluno', nome: 'Aluno', papel: 'aluno' })
      .returning()

    const gruposCriados = []
    for (let i = 0; i < quantosGrupos; i += 1) {
      const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()
      gruposCriados.push(grupo!)
    }

    return {
      curso,
      turma: turma!,
      primeira: rodadas[0]!,
      segunda: rodadas[1]!,
      instrutora: instrutora!,
      aluno: aluno!,
      grupos: gruposCriados,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('sorteio_da_rodada_2_nao_repete_par', async () => {
    const c = await cenario()

    const primeira = await sorteiaRodada(
      banco.db,
      c.primeira.id,
      c.turma.id,
      c.instrutora.id,
      geradorDe(7),
    )

    // Um emparelhamento vira DUAS linhas: o par se critica nos dois sentidos na
    // mesma sessão, "25 minutos por direção" (Doc 5 §4.5).
    expect(primeira.pares).toHaveLength(GRUPOS)
    expect(primeira.semPar).toHaveLength(0)

    const encontrosDaPrimeira = new Set(
      primeira.pares.map((p) => chaveDoPar(p.revisorId, p.revisadoId)),
    )
    expect(encontrosDaPrimeira.size).toBe(GRUPOS / 2)

    // Cada grupo revisa um e é revisado por um.
    expect(new Set(primeira.pares.map((p) => p.revisorId)).size).toBe(GRUPOS)
    expect(new Set(primeira.pares.map((p) => p.revisadoId)).size).toBe(GRUPOS)

    const segunda = await sorteiaRodada(
      banco.db,
      c.segunda.id,
      c.turma.id,
      c.instrutora.id,
      geradorDe(99),
    )

    // Nenhum encontro se repete. A chave é NÃO ordenada de propósito: repetir
    // com a seta invertida cumpriria a letra e destruiria o efeito declarado —
    // cada grupo enxergar dois temas alheios (Doc 5 §4.1).
    for (const par of segunda.pares) {
      expect(encontrosDaPrimeira.has(chaveDoPar(par.revisorId, par.revisadoId))).toBe(false)
    }

    // E o efeito acontece: cada grupo viu dois temas diferentes.
    for (const grupo of c.grupos) {
      const vistos = [...primeira.pares, ...segunda.pares]
        .filter((p) => p.revisorId === grupo.id)
        .map((p) => p.revisadoId)
      expect(new Set(vistos).size).toBe(2)
    }

    // Sortear a mesma rodada duas vezes é recusado: desfaria pareamentos que a
    // turma já está usando.
    await expect(
      sorteiaRodada(banco.db, c.primeira.id, c.turma.id, c.instrutora.id, geradorDe(1)),
    ).rejects.toThrow(CriticaInvalida)

    // E sortear é ato do instrutor.
    const [terceira] = await banco.db
      .insert(rodadasDeCritica)
      .values({ cursoId: c.curso.id, ordem: 3, nome: 'Terceira' })
      .returning()
    await expect(
      sorteiaRodada(banco.db, terceira!.id, c.turma.id, c.aluno.id, geradorDe(2)),
    ).rejects.toThrow(NaoAutorizado)
  })

  it('critica_exige_explicacao_do_tema_alheio', async () => {
    const c = await cenario()
    const { pares } = await sorteiaRodada(
      banco.db,
      c.primeira.id,
      c.turma.id,
      c.instrutora.id,
      geradorDe(7),
    )
    const par = pares[0]!

    // Sem a frase não há registro. É a regra que impede a crítica entre
    // iniciantes de virar elogio mútuo (Doc 5 §4.2).
    for (const vazio of ['', '   ']) {
      await expect(
        registraCritica(banco.db, par.parId, par.revisorId, {
          explicacaoDoTema: vazio,
          cenarioQueQuebra: 'E se cancelarem depois de começar?',
        }),
      ).rejects.toThrow(CriticaInvalida)
    }

    // Nem pelo banco.
    await expect(
      banco.db.insert(registrosDeCritica).values({
        parId: par.parId,
        explicacaoDoTema: '  ',
        cenarioQueQuebra: 'algo',
      }),
    ).rejects.toThrow()

    await registraCritica(banco.db, par.parId, par.revisorId, {
      explicacaoDoTema: '  Eles controlam reservas de sala com prazo de devolução.  ',
      cenarioQueQuebra: 'E se cancelarem depois de já ter começado?',
    })

    const [gravado] = await banco.db
      .select()
      .from(registrosDeCritica)
      .where(eq(registrosDeCritica.parId, par.parId))
    expect(gravado?.explicacaoDoTema).toBe('Eles controlam reservas de sala com prazo de devolução.')

    // Um registro por sentido: o índice único impede dois.
    await expect(
      banco.db.insert(registrosDeCritica).values({
        parId: par.parId,
        explicacaoDoTema: 'outra',
        cenarioQueQuebra: 'outro',
      }),
    ).rejects.toThrow()
  })

  it('critica_exige_cenario_de_quebra', async () => {
    const c = await cenario()
    const { pares } = await sorteiaRodada(
      banco.db,
      c.primeira.id,
      c.turma.id,
      c.instrutora.id,
      geradorDe(7),
    )
    const par = pares[0]!

    // "Pelo menos um cenário concreto que quebra — não uma opinião." A
    // plataforma exige que o campo exista; se o conteúdo é cenário ou desabafo é
    // leitura humana, e automatizar isso seria corrigir conteúdo (Doc 7 §6).
    for (const vazio of ['', '  ']) {
      await expect(
        registraCritica(banco.db, par.parId, par.revisorId, {
          explicacaoDoTema: 'Eles controlam reservas de sala.',
          cenarioQueQuebra: vazio,
        }),
      ).rejects.toThrow(CriticaInvalida)
    }

    await expect(
      banco.db.insert(registrosDeCritica).values({
        parId: par.parId,
        explicacaoDoTema: 'algo',
        cenarioQueQuebra: '   ',
      }),
    ).rejects.toThrow()

    await registraCritica(banco.db, par.parId, par.revisorId, {
      explicacaoDoTema: 'Eles controlam reservas de sala.',
      cenarioQueQuebra: 'E se o cliente cancelar depois de já ter começado?',
    })
    expect(await banco.db.select().from(registrosDeCritica)).toHaveLength(1)

    // A nota da crítica não existe: ela entra no eixo pela EXISTÊNCIA do
    // registro. Pontuar a qualidade faria o iniciante escrever para a nota.
    const [linha] = await banco.db.select().from(registrosDeCritica)
    expect(Object.keys(linha ?? {})).not.toContain('nota')
  })

  it('rodada_incompleta_pendente_para_ambos', async () => {
    const c = await cenario()
    const { pares } = await sorteiaRodada(
      banco.db,
      c.primeira.id,
      c.turma.id,
      c.instrutora.id,
      geradorDe(7),
    )

    const ida = pares[0]!
    const volta = pares.find(
      (p) => p.revisorId === ida.revisadoId && p.revisadoId === ida.revisorId,
    )!
    expect(volta).toBeDefined()

    // Antes de qualquer registro, os dois lados têm pendência — e em papéis
    // diferentes: um deve escrever, o outro ainda não recebeu.
    const doRevisor = await pendenciasDaRodada(banco.db, c.primeira.id, ida.revisorId)
    expect(doRevisor.some((p) => p.deve && p.parId === ida.parId)).toBe(true)
    expect(doRevisor.some((p) => p.aguarda && p.parId === volta.parId)).toBe(true)

    // O revisor escreve. A pendência DELE some, a do outro lado continua — e é
    // essa metade que costuma sumir das telas, porque quem espera não tem nada a
    // fazer e ninguém lembra dele.
    await registraCritica(banco.db, ida.parId, ida.revisorId, {
      explicacaoDoTema: 'Eles controlam reservas de sala.',
      cenarioQueQuebra: 'E se cancelarem depois de começar?',
    })

    const depoisDoRevisor = await pendenciasDaRodada(banco.db, c.primeira.id, ida.revisorId)
    expect(depoisDoRevisor.some((p) => p.deve)).toBe(false)
    expect(depoisDoRevisor.some((p) => p.aguarda)).toBe(true)

    const doRevisado = await pendenciasDaRodada(banco.db, c.primeira.id, ida.revisadoId)
    expect(doRevisado.some((p) => p.aguarda)).toBe(false)
    expect(doRevisado.some((p) => p.deve)).toBe(true)

    // Com os dois sentidos escritos, ninguém tem pendência.
    await registraCritica(banco.db, volta.parId, volta.revisorId, {
      explicacaoDoTema: 'Eles atendem chamados com prioridade.',
      cenarioQueQuebra: 'E se dois chamados disputarem o mesmo técnico?',
    })
    expect(await pendenciasDaRodada(banco.db, c.primeira.id, ida.revisorId)).toHaveLength(0)
    expect(await pendenciasDaRodada(banco.db, c.primeira.id, ida.revisadoId)).toHaveLength(0)

    // E o instrutor vê a rodada inteira, com o que falta.
    const situacao = await situacaoDaRodada(banco.db, c.primeira.id, c.turma.id)
    expect(situacao).toHaveLength(GRUPOS)
    expect(situacao.filter((s) => s.registrada)).toHaveLength(2)
  })

  it('roteiro_e_configuravel_por_rodada', async () => {
    const c = await cenario()

    // Cada rodada tem roteiro próprio: a primeira revisa arquitetura, a segunda
    // revisa como o colega absorveu a mudança (Doc 5 §4.3 e §4.4). Quantas
    // perguntas cada uma tem também é configuração.
    const daPrimeira = [
      'Quais são os estados, e qual transição o código recusou?',
      'Onde mora a regra da transição? Existe em mais de um lugar?',
      'Se eu pedisse um estado novo, quantos arquivos vocês abririam?',
    ]
    const daSegunda = [
      'Sem olhar o código: qual era a regra deles, e o que mudou?',
      'Quantos arquivos foram tocados para absorver?',
    ]

    await banco.db
      .insert(perguntasDoRoteiro)
      .values(daPrimeira.map((enunciado, i) => ({ rodadaId: c.primeira.id, ordem: i + 1, enunciado })))
    await banco.db
      .insert(perguntasDoRoteiro)
      .values(daSegunda.map((enunciado, i) => ({ rodadaId: c.segunda.id, ordem: i + 1, enunciado })))

    expect((await roteiroDaRodada(banco.db, c.primeira.id)).map((p) => p.enunciado)).toEqual(
      daPrimeira,
    )
    expect((await roteiroDaRodada(banco.db, c.segunda.id)).map((p) => p.enunciado)).toEqual(
      daSegunda,
    )

    // Pergunta em branco não entra, e a ordem é única na rodada.
    await expect(
      banco.db
        .insert(perguntasDoRoteiro)
        .values({ rodadaId: c.primeira.id, ordem: 4, enunciado: '   ' }),
    ).rejects.toThrow()
    await expect(
      banco.db
        .insert(perguntasDoRoteiro)
        .values({ rodadaId: c.primeira.id, ordem: 1, enunciado: 'repetida' }),
    ).rejects.toThrow()

    // Nenhuma pergunta do roteiro mora no código: são conteúdo do curso.
    const fonte = readFileSync('src/db/critica.ts', 'utf8')
    for (const pergunta of [...daPrimeira, ...daSegunda]) {
      expect(fonte).not.toContain(pergunta)
    }
  })

  it('turma_impar_devolve_quem_ficou_sem_par', async () => {
    // Com número ímpar de grupos sobra um, e a plataforma NÃO inventa o que
    // fazer com ele: nenhum documento diz se forma trio, revisa o instrutor ou
    // fica de fora. Devolver a sobra explícita é a diferença entre o instrutor
    // saber e descobrir no meio da aula.
    const c = await cenario(5)

    const { pares, semPar } = await sorteiaRodada(
      banco.db,
      c.primeira.id,
      c.turma.id,
      c.instrutora.id,
      geradorDe(13),
    )

    expect(semPar).toHaveLength(1)
    expect(pares).toHaveLength(4)
    expect(pares.some((p) => p.revisorId === semPar[0] || p.revisadoId === semPar[0])).toBe(false)

    // Quem sobra não é sempre o último da lista: o lugar vazio entra no sorteio
    // como qualquer outro, senão o mesmo grupo ficaria de fora toda rodada.
    const sobras = new Set<string>()
    for (let semente = 1; semente <= 40; semente += 1) {
      const resultado = sorteiaEmparelhamento(
        c.grupos.map((g) => g.id),
        new Set(),
        geradorDe(semente),
      )
      resultado?.semPar.forEach((g) => sobras.add(g))
    }
    expect(sobras.size).toBeGreaterThan(1)
  })

  it('sorteio_falha_alto_quando_nao_ha_emparelhamento', async () => {
    // Com poucos grupos as rodadas esgotam as combinações. Falhar alto é melhor
    // que sortear repetido em silêncio: o instrutor ainda pode juntar turmas ou
    // aceitar a repetição, mas só se souber.
    const ids = ['a', 'b']
    const primeiro = sorteiaEmparelhamento(ids, new Set(), geradorDe(3))
    expect(primeiro?.pares).toHaveLength(1)

    const esgotado = sorteiaEmparelhamento(ids, new Set([chaveDoPar('a', 'b')]), geradorDe(3))
    expect(esgotado).toBeNull()

    // E o retrocesso encontra solução onde o guloso falharia: com o encontro
    // {a,b} proibido, `a` precisa desistir do primeiro candidato.
    const comRetrocesso = sorteiaEmparelhamento(
      ['a', 'b', 'c', 'd'],
      new Set([chaveDoPar('a', 'b'), chaveDoPar('c', 'd')]),
      geradorDe(5),
    )
    expect(comRetrocesso).not.toBeNull()
    expect(comRetrocesso!.pares).toHaveLength(2)
    for (const par of comRetrocesso!.pares) {
      expect([chaveDoPar('a', 'b'), chaveDoPar('c', 'd')]).not.toContain(chaveDoPar(par.a, par.b))
    }
  })
})
