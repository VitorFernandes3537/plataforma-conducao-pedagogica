import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  abreContratoDiario,
  contratoDoDia,
  ContratoInvalido,
  fechaContratoDiario,
} from '@/db/contrato-diario'
import { garanteRegistroDiario } from '@/db/registro-diario'
import { alunos, contratosDiarios, dias, grupos, turmas, usuarios } from '@/db/schema'
import { AcessoNegado } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 12 em
// docs/BACKLOG.md. SSOT: `D5-CONTRATODIARIO` · Doc 5 §7.

describe('Issue 12 — contrato diário', () => {
  let banco: BancoEfemero

  /** Quantos dias o curso tem é configuração; aqui são quatro de exemplo. */
  const DIAS = 4

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

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 5001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    const pessoas = []
    for (const [i, nome] of ['Ana', 'Bruno'].entries()) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({ githubUserId: 5100 + i, githubLogin: nome.toLowerCase(), nome, papel: 'aluno' })
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
      instrutora: instrutora!,
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

  it('contrato_diario_exige_as_duas_linhas', async () => {
    const c = await cenario()
    const dia = c.dias[0]!

    // A segunda linha é a que importa (Doc 5 §7.1): sem ela o contrato não
    // vacina contra nada. Nenhuma das duas é opcional.
    for (const linhas of [
      { faremos: '', naoFaremos: 'Não vamos mexer no cálculo.' },
      { faremos: 'Vamos fechar a máquina de estados.', naoFaremos: '   ' },
      { faremos: '  ', naoFaremos: '' },
    ]) {
      await expect(
        abreContratoDiario(banco.db, c.ana.aluno.id, dia.id, linhas, c.ana.usuario.id),
      ).rejects.toThrow(ContratoInvalido)
    }
    expect(await contratoDoDia(banco.db, c.ana.aluno.id, dia.id)).toBeNull()

    // A obrigatoriedade é do BANCO, não só da aplicação: nenhum outro caminho de
    // escrita cria contrato com meia linha.
    const registro = await garanteRegistroDiario(banco.db, c.ana.aluno.id, dia.id)
    await expect(
      banco.db
        .insert(contratosDiarios)
        .values({ registroDiarioId: registro.id, faremos: 'algo', naoFaremos: '   ' }),
    ).rejects.toThrow()

    // Com as duas, abre — e o texto chega sem sobra de espaço nas pontas.
    await abreContratoDiario(
      banco.db,
      c.ana.aluno.id,
      dia.id,
      { faremos: '  Fechar a máquina de estados.  ', naoFaremos: '  Cálculo variável.  ' },
      c.ana.usuario.id,
    )
    const aberto = await contratoDoDia(banco.db, c.ana.aluno.id, dia.id)
    expect(aberto?.faremos).toBe('Fechar a máquina de estados.')
    expect(aberto?.naoFaremos).toBe('Cálculo variável.')
    expect(aberto?.cumprido).toBeNull()

    // E sem contrato aberto não há o que fechar: é o critério lido pelo outro
    // lado — as linhas são obrigatórias na abertura, e sem abertura não existe
    // fechamento.
    await expect(
      fechaContratoDiario(
        banco.db,
        c.bruno.aluno.id,
        dia.id,
        { cumprido: true, motivo: 'deu tudo certo' },
        c.bruno.usuario.id,
      ),
    ).rejects.toThrow(ContratoInvalido)
  })

  it('fechamento_registra_cumprimento', async () => {
    const c = await cenario()
    const dia = c.dias[0]!

    await abreContratoDiario(
      banco.db,
      c.ana.aluno.id,
      dia.id,
      { faremos: 'Terminar as transições.', naoFaremos: 'Tocar no relatório.' },
      c.ana.usuario.id,
    )

    // "Cumpriu ou não, e por quê" (Doc 5 §7). O porquê não é opcional, nem
    // quando cumpriu — o histórico é o insumo da retrospectiva (§7.2).
    await expect(
      fechaContratoDiario(
        banco.db,
        c.ana.aluno.id,
        dia.id,
        { cumprido: true, motivo: '  ' },
        c.ana.usuario.id,
      ),
    ).rejects.toThrow(ContratoInvalido)

    const { fechadoEm } = await fechaContratoDiario(
      banco.db,
      c.ana.aluno.id,
      dia.id,
      { cumprido: false, motivo: 'Travamos no estado de cancelamento.' },
      c.ana.usuario.id,
    )
    expect(fechadoEm).toBeInstanceOf(Date)

    const fechado = await contratoDoDia(banco.db, c.ana.aluno.id, dia.id)
    expect(fechado?.cumprido).toBe(false)
    expect(fechado?.motivoDoFechamento).toBe('Travamos no estado de cancelamento.')

    // Fechar duas vezes é recusado: um segundo veredito reescreveria o
    // histórico.
    await expect(
      fechaContratoDiario(
        banco.db,
        c.ana.aluno.id,
        dia.id,
        { cumprido: true, motivo: 'pensando melhor, deu' },
        c.ana.usuario.id,
      ),
    ).rejects.toThrow(ContratoInvalido)

    // E as duas linhas não se reescrevem depois do fechamento: poder mudar
    // "hoje NÃO faremos" sabendo o resultado destruiria o instrumento.
    await expect(
      abreContratoDiario(
        banco.db,
        c.ana.aluno.id,
        dia.id,
        { faremos: 'outra coisa', naoFaremos: 'outra coisa ainda' },
        c.ana.usuario.id,
      ),
    ).rejects.toThrow(ContratoInvalido)
    expect((await contratoDoDia(banco.db, c.ana.aluno.id, dia.id))?.faremos).toBe(
      'Terminar as transições.',
    )

    // Antes de fechar, corrigir é legítimo: são dois minutos de abertura.
    const segundoDia = c.dias[1]!
    await abreContratoDiario(
      banco.db,
      c.ana.aluno.id,
      segundoDia.id,
      { faremos: 'primeira versão', naoFaremos: 'nada' },
      c.ana.usuario.id,
    )
    await abreContratoDiario(
      banco.db,
      c.ana.aluno.id,
      segundoDia.id,
      { faremos: 'versão corrigida', naoFaremos: 'o relatório' },
      c.ana.usuario.id,
    )
    expect((await contratoDoDia(banco.db, c.ana.aluno.id, segundoDia.id))?.faremos).toBe(
      'versão corrigida',
    )

    // Estado impossível barrado pelo banco: fechado sem veredito.
    const registro = await garanteRegistroDiario(banco.db, c.bruno.aluno.id, dia.id)
    await expect(
      banco.db.insert(contratosDiarios).values({
        registroDiarioId: registro.id,
        faremos: 'a',
        naoFaremos: 'b',
        fechadoEm: new Date(),
      }),
    ).rejects.toThrow()

    // E motivo sem veredito também: sobra de fechamento em contrato aberto
    // apareceria na tela do aluno como dia já resolvido.
    await expect(
      banco.db.insert(contratosDiarios).values({
        registroDiarioId: registro.id,
        faremos: 'a',
        naoFaremos: 'b',
        motivoDoFechamento: 'sem veredito',
      }),
    ).rejects.toThrow()
  })

  it('contrato_e_producao_propria_do_aluno', async () => {
    const c = await cenario()
    const dia = c.dias[0]!

    // Um aluno não escreve o contrato do parceiro: quem se comprometeu é quem
    // escreve, senão o compromisso não é de ninguém.
    await expect(
      abreContratoDiario(
        banco.db,
        c.bruno.aluno.id,
        dia.id,
        { faremos: 'pelo colega', naoFaremos: 'nada' },
        c.ana.usuario.id,
      ),
    ).rejects.toThrow(AcessoNegado)

    // O instrutor pode — Doc 7 §3, "Instrutor: tudo" —, e é ele que fecha o dia
    // de quem faltou.
    await abreContratoDiario(
      banco.db,
      c.bruno.aluno.id,
      dia.id,
      { faremos: 'Repor o que perdeu.', naoFaremos: 'Avançar.' },
      c.instrutora.id,
    )
    await fechaContratoDiario(
      banco.db,
      c.bruno.aluno.id,
      dia.id,
      { cumprido: false, motivo: 'Ausente no dia.' },
      c.instrutora.id,
    )

    const fechado = await contratoDoDia(banco.db, c.bruno.aluno.id, dia.id)
    expect(fechado?.cumprido).toBe(false)

    // E ninguém fecha o contrato de outro aluno.
    await abreContratoDiario(
      banco.db,
      c.ana.aluno.id,
      c.dias[1]!.id,
      { faremos: 'Seguir.', naoFaremos: 'Refazer.' },
      c.ana.usuario.id,
    )
    await expect(
      fechaContratoDiario(
        banco.db,
        c.ana.aluno.id,
        c.dias[1]!.id,
        { cumprido: true, motivo: 'fechando pelo colega' },
        c.bruno.usuario.id,
      ),
    ).rejects.toThrow(AcessoNegado)
    expect((await contratoDoDia(banco.db, c.ana.aluno.id, c.dias[1]!.id))?.cumprido).toBeNull()
  })

  it('contrato_nao_atravessa_curso', async () => {
    // O contrato pendura no registro diário, e o registro tem gatilho de
    // coerência. Vale conferir que a proteção alcança este instrumento também:
    // contrato num dia de outro curso apareceria num calendário onde ninguém o
    // procura.
    const c = await cenario()
    const outroCurso = await criaCurso(banco, { nome: 'Outro curso' })
    const [diaAlheio] = await banco.db
      .insert(dias)
      .values({ cursoId: outroCurso.id, ordem: 1 })
      .returning()

    await expect(
      abreContratoDiario(
        banco.db,
        c.ana.aluno.id,
        diaAlheio!.id,
        { faremos: 'a', naoFaremos: 'b' },
        c.ana.usuario.id,
      ),
    ).rejects.toThrow()

    expect(await banco.db.select().from(contratosDiarios).where(eq(contratosDiarios.faremos, 'a'))).toHaveLength(0)
  })
})
