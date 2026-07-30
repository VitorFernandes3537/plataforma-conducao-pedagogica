import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  atribui,
  atribuicoesDoDia,
  historicoDeMonitoria,
  monitoriasPorAluno,
  removeAtribuicao,
} from '@/db/extensao'
import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import { alunos, atribuicoesDeExtensao, dias, grupos, obstaculos, turmas, usuarios } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 22 em
// docs/BACKLOG.md. SSOT: `D3-EXTENSOES` · Doc 3 §5 · Doc 5 §1.2.

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 22 — atribuição de extensão e monitoria', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    // Dois obstáculos, cada um com a extensão pré-escrita — é a decisão D3-05:
    // pré-escrever para a escolha não ser feita em cima da hora.
    const obstaculosCriados = await banco.db
      .insert(obstaculos)
      .values([
        {
          cursoId: curso.id,
          ordem: 1,
          pergunta: 'Por que meu programa aceita um estado que não existe?',
          extensao: 'Troque um primitivo por um tipo próprio que recusa valor inválido.',
          peso: 1,
        },
        {
          cursoId: curso.id,
          ordem: 2,
          pergunta: 'Por que minha condicional não para de crescer?',
          extensao: 'Implemente a categoria seguinte sem tocar em nenhuma classe existente.',
          peso: 2,
        },
      ])
      .returning()

    // Três dias: o primeiro sem obstáculo, os outros com um cada.
    const diasCriados = await banco.db
      .insert(dias)
      .values([
        { cursoId: curso.id, ordem: 1 },
        { cursoId: curso.id, ordem: 2, obstaculoId: obstaculosCriados[0]!.id },
        { cursoId: curso.id, ordem: 3, obstaculoId: obstaculosCriados[1]!.id },
      ])
      .returning()

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 2201, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    const pessoas = []
    for (const [i, nome] of ['Ana', 'Bruno', 'Carla'].entries()) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({ githubUserId: 2210 + i, githubLogin: nome.toLowerCase(), nome, papel: 'aluno' })
        .returning()
      const [aluno] = await banco.db
        .insert(alunos)
        .values({ turmaId: turma!.id, usuarioId: usuario!.id })
        .returning()
      pessoas.push({ aluno: aluno!, usuario: usuario!, nome })
    }

    return {
      curso,
      turma: turma!,
      grupo: grupo!,
      obstaculos: obstaculosCriados,
      diaSemObstaculo: diasCriados[0]!,
      dias: [diasCriados[1]!, diasCriados[2]!],
      instrutora: instrutora!,
      ana: pessoas[0]!,
      bruno: pessoas[1]!,
      carla: pessoas[2]!,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('instrutor_registra_atribuicao', async () => {
    const c = await cenario()

    const { id } = await atribui(
      banco.db,
      c.ana.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'extensao',
      c.instrutora.id,
    )
    expect(id).toBeTruthy()

    const [gravada] = await banco.db
      .select()
      .from(atribuicoesDeExtensao)
      .where(eq(atribuicoesDeExtensao.id, id))
    expect(gravada?.alunoId).toBe(c.ana.aluno.id)
    expect(gravada?.obstaculoId).toBe(c.obstaculos[0]!.id)
    expect(gravada?.atribuidoPorId).toBe(c.instrutora.id)

    // Só o instrutor atribui: é decisão de condução, e o aluno que se
    // autoatribuísse extensão estaria decidindo que já venceu.
    await expect(
      atribui(
        banco.db,
        c.bruno.aluno.id,
        c.obstaculos[0]!.id,
        c.dias[0]!.id,
        'extensao',
        c.ana.usuario.id,
      ),
    ).rejects.toThrow(NaoAutorizado)

    // Reatribuir troca o tipo em vez de duplicar: três horas de aula não
    // comportam extensão e monitoria ao mesmo aluno no mesmo dia.
    await atribui(
      banco.db,
      c.ana.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'monitoria',
      c.instrutora.id,
    )
    const doDia = await banco.db
      .select()
      .from(atribuicoesDeExtensao)
      .where(eq(atribuicoesDeExtensao.diaId, c.dias[0]!.id))
    expect(doDia).toHaveLength(1)
    expect(doDia[0]?.tipo).toBe('monitoria')

    // Desfazer existe: quem terminou antes pode ter terminado errado.
    const { removidas } = await removeAtribuicao(
      banco.db,
      c.ana.aluno.id,
      c.dias[0]!.id,
      c.instrutora.id,
    )
    expect(removidas).toBe(1)
    expect(await banco.db.select().from(atribuicoesDeExtensao)).toHaveLength(0)
  })

  it('atribuicao_tem_tipo_extensao_ou_monitoria', async () => {
    const c = await cenario()

    await atribui(
      banco.db,
      c.ana.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'extensao',
      c.instrutora.id,
    )
    await atribui(
      banco.db,
      c.bruno.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'monitoria',
      c.instrutora.id,
    )

    const doDia = await atribuicoesDoDia(banco.db, c.turma.id, c.dias[0]!.id)
    expect(doDia.map((a) => a.tipo).sort()).toEqual(['extensao', 'monitoria'])

    // Um terceiro tipo não existe: o Doc 3 §5 dá duas saídas para quem termina
    // antes, e nenhuma delas é avançar.
    await expect(
      banco.db.insert(atribuicoesDeExtensao).values({
        alunoId: c.carla.aluno.id,
        obstaculoId: c.obstaculos[0]!.id,
        diaId: c.dias[0]!.id,
        tipo: 'avanca' as never,
        atribuidoPorId: c.instrutora.id,
      }),
    ).rejects.toThrow()

    // E a atribuição é do obstáculo QUE O DIA TRABALHA. Atribuir a extensão do
    // obstáculo seguinte seria exatamente o adiantamento individual que quebra a
    // sincronia (Doc 3 §5).
    const adiantada = await atribui(
      banco.db,
      c.carla.aluno.id,
      c.obstaculos[1]!.id,
      c.dias[0]!.id,
      'extensao',
      c.instrutora.id,
    ).then(
      () => null,
      (e: unknown) => e,
    )
    expect(adiantada).toBeInstanceOf(Error)
    expect(causaDe(adiantada)).toMatch(/trabalha o obstaculo .* e a atribuicao e do obstaculo/)

    // Dia sem obstáculo não recebe atribuição: não há o que aprofundar.
    const semObstaculo = await atribui(
      banco.db,
      c.carla.aluno.id,
      c.obstaculos[0]!.id,
      c.diaSemObstaculo.id,
      'extensao',
      c.instrutora.id,
    ).then(
      () => null,
      (e: unknown) => e,
    )
    expect(semObstaculo).toBeInstanceOf(Error)
    expect(causaDe(semObstaculo)).toMatch(/nao trabalha obstaculo nenhum/)
  })

  it('painel_mostra_extensao_e_monitoria', async () => {
    const c = await cenario()

    await atribui(
      banco.db,
      c.ana.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'extensao',
      c.instrutora.id,
    )
    await atribui(
      banco.db,
      c.bruno.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'monitoria',
      c.instrutora.id,
    )

    const doDia = await atribuicoesDoDia(banco.db, c.turma.id, c.dias[0]!.id)
    expect(doDia).toHaveLength(2)

    const emExtensao = doDia.find((a) => a.tipo === 'extensao')
    expect(emExtensao?.nome).toBe('Ana')
    // O texto pré-escrito vem junto: é para isso que ele é pré-escrito.
    expect(emExtensao?.extensao).toBe(c.obstaculos[0]!.extensao)

    const emMonitoria = doDia.find((a) => a.tipo === 'monitoria')
    expect(emMonitoria?.nome).toBe('Bruno')

    // Quem não recebeu atribuição não aparece: o painel responde quem está em
    // quê, não quem existe.
    expect(doDia.map((a) => a.nome)).not.toContain('Carla')

    // É por DIA: o mesmo painel no dia seguinte está vazio até alguém terminar
    // antes de novo.
    expect(await atribuicoesDoDia(banco.db, c.turma.id, c.dias[1]!.id)).toHaveLength(0)

    // E é por turma: atribuição de outra turma não vaza.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: c.curso.id, nome: 'Outra turma' })
      .returning()
    const [deFora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 2299, githubLogin: 'defora', nome: 'De Fora', papel: 'aluno' })
      .returning()
    const [alunoDeFora] = await banco.db
      .insert(alunos)
      .values({ turmaId: outraTurma!.id, usuarioId: deFora!.id })
      .returning()
    await atribui(
      banco.db,
      alunoDeFora!.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'extensao',
      c.instrutora.id,
    )

    expect(await atribuicoesDoDia(banco.db, c.turma.id, c.dias[0]!.id)).toHaveLength(2)
    expect(await atribuicoesDoDia(banco.db, outraTurma!.id, c.dias[0]!.id)).toHaveLength(1)
  })

  it('historico_de_monitoria_por_aluno', async () => {
    const c = await cenario()

    // Ana monitora nos dois dias; Bruno numa vez; Carla nenhuma.
    await atribui(
      banco.db,
      c.ana.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'monitoria',
      c.instrutora.id,
    )
    await atribui(
      banco.db,
      c.ana.aluno.id,
      c.obstaculos[1]!.id,
      c.dias[1]!.id,
      'monitoria',
      c.instrutora.id,
    )
    await atribui(
      banco.db,
      c.bruno.aluno.id,
      c.obstaculos[0]!.id,
      c.dias[0]!.id,
      'monitoria',
      c.instrutora.id,
    )
    // Extensão não é monitoria e não entra no histórico dela.
    await atribui(
      banco.db,
      c.bruno.aluno.id,
      c.obstaculos[1]!.id,
      c.dias[1]!.id,
      'extensao',
      c.instrutora.id,
    )

    const daAna = await historicoDeMonitoria(banco.db, c.ana.aluno.id)
    expect(daAna).toHaveLength(2)
    // Do mais recente para o mais antigo: o instrutor quer saber quem monitorou
    // ontem antes de atribuir hoje.
    expect(daAna.map((m) => m.ordemDoDia)).toEqual([3, 2])
    expect(daAna[0]?.pergunta).toBe(c.obstaculos[1]!.pergunta)

    const doBruno = await historicoDeMonitoria(banco.db, c.bruno.aluno.id)
    expect(doBruno).toHaveLength(1)
    expect(await historicoDeMonitoria(banco.db, c.carla.aluno.id)).toHaveLength(0)

    // A contagem por turma é o que torna a rotatividade verificável de relance.
    // "Se virar rotina fixa, o aluno forte para de codar e vira professor não
    // remunerado" (Doc 3 §5) — e quem nunca monitorou aparece com zero, porque
    // é justamente quem a rotatividade precisa alcançar.
    const contagem = await monitoriasPorAluno(banco.db, c.turma.id)
    expect(contagem).toHaveLength(3)
    expect(contagem[0]).toMatchObject({ nome: 'Ana', monitorias: 2 })
    expect(contagem[1]).toMatchObject({ nome: 'Bruno', monitorias: 1 })
    expect(contagem[2]).toMatchObject({ nome: 'Carla', monitorias: 0 })

    // A plataforma NÃO sugere quem monitora quem: está fora de escopo, e a
    // escolha depende de quem está travado em quê naquela tarde.
    expect(Object.keys(contagem[0] ?? {})).not.toContain('sugestao')
  })
})
