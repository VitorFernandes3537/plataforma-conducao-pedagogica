import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  avancaDia,
  diaCorrenteDaTurma,
  diaDoAluno,
  DiaInvalido,
  turmasDoInstrutor,
} from '@/db/dia-corrente'
import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import { alunos, dias, marcos, turmas, usuarios } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// O dia corrente não deriva de nenhum critério de aceite do BACKLOG: é decisão
// de desenvolvedor, autorizada por Doc 7 §0.2, e existe porque toda tela precisa
// saber que dia é hoje e nenhuma consulta sabia. A sincronia é do Doc 4 §5.2.

describe('Dia corrente da turma', () => {
  let banco: BancoEfemero

  const TOTAL_DE_DIAS = 4

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const diasCriados = await banco.db
      .insert(dias)
      .values(Array.from({ length: TOTAL_DE_DIAS }, (_, i) => ({ cursoId: curso.id, ordem: i + 1 })))
      .returning()

    // Um marco no terceiro dia: a tela precisa saber que hoje é portão.
    await banco.db
      .insert(marcos)
      .values({ diaId: diasCriados[2]!.id, nome: 'Escopo aprovado', tipo: 'duro' })

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 5001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()
    const [usuarioAluno] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 5002, githubLogin: 'aluno', nome: 'Aluno', papel: 'aluno' })
      .returning()
    const [aluno] = await banco.db
      .insert(alunos)
      .values({ turmaId: turma!.id, usuarioId: usuarioAluno!.id })
      .returning()

    return {
      curso,
      turma: turma!,
      dias: diasCriados,
      instrutora: instrutora!,
      usuarioAluno: usuarioAluno!,
      aluno: aluno!,
    }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('turma_comeca_sem_dia_corrente', async () => {
    const c = await cenario()

    // Nulo é resposta, não erro: a turma existe cadastrada antes de o curso
    // começar, e a tela precisa poder dizer "ainda não começou".
    expect(await diaCorrenteDaTurma(banco.db, c.turma.id)).toBeNull()
    expect(await diaDoAluno(banco.db, c.usuarioAluno.id)).toBeNull()

    const listagem = await turmasDoInstrutor(banco.db)
    expect(listagem).toHaveLength(1)
    expect(listagem[0]?.ordem).toBeNull()
    expect(listagem[0]?.totalDeDias).toBe(TOTAL_DE_DIAS)
  })

  it('instrutor_avanca_um_dia_por_vez', async () => {
    const c = await cenario()

    const primeiro = await avancaDia(banco.db, c.turma.id, c.instrutora.id)
    expect(primeiro.ordem).toBe(1)
    expect(primeiro.totalDeDias).toBe(TOTAL_DE_DIAS)
    expect(primeiro.marco).toBeNull()

    // Sempre o próximo, nunca um salto: pular dia deixaria o material, a
    // avaliação e o mural daquele dia sem ninguém, e a captura contínua depende
    // de cada dia acontecer.
    const segundo = await avancaDia(banco.db, c.turma.id, c.instrutora.id)
    expect(segundo.ordem).toBe(2)

    const terceiro = await avancaDia(banco.db, c.turma.id, c.instrutora.id)
    expect(terceiro.ordem).toBe(3)
    // O marco do dia vem junto: a tela precisa saber que hoje é portão.
    expect(terceiro.marco).toMatchObject({ nome: 'Escopo aprovado', tipo: 'duro' })

    await avancaDia(banco.db, c.turma.id, c.instrutora.id)

    // O último dia é o último: não há para onde avançar, e a recusa é frase.
    await expect(avancaDia(banco.db, c.turma.id, c.instrutora.id)).rejects.toThrow(DiaInvalido)
    expect((await diaCorrenteDaTurma(banco.db, c.turma.id))?.ordem).toBe(TOTAL_DE_DIAS)

    // Avançar é ato do instrutor. O aluno não decide quando a turma anda — é
    // exatamente a sincronia que o limiar do Doc 4 §5.2 protege.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: c.curso.id, nome: 'Outra' })
      .returning()
    await expect(
      avancaDia(banco.db, outraTurma!.id, c.usuarioAluno.id),
    ).rejects.toThrow(NaoAutorizado)
  })

  it('o_dia_do_aluno_e_o_da_turma_dele', async () => {
    const c = await cenario()
    await avancaDia(banco.db, c.turma.id, c.instrutora.id)
    await avancaDia(banco.db, c.turma.id, c.instrutora.id)

    const doAluno = await diaDoAluno(banco.db, c.usuarioAluno.id)
    expect(doAluno?.ordem).toBe(2)
    expect(doAluno?.turmaId).toBe(c.turma.id)

    // Outra turma anda no próprio passo: duas turmas do mesmo curso podem estar
    // em dias diferentes, e é por isso que o ponteiro é da turma e não do curso.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: c.curso.id, nome: 'Outra' })
      .returning()
    await avancaDia(banco.db, outraTurma!.id, c.instrutora.id)

    expect((await diaCorrenteDaTurma(banco.db, outraTurma!.id))?.ordem).toBe(1)
    expect((await diaCorrenteDaTurma(banco.db, c.turma.id))?.ordem).toBe(2)

    // Aluno sem matrícula não tem dia.
    const [semTurma] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 5099, githubLogin: 'solto', nome: 'Solto', papel: 'aluno' })
      .returning()
    expect(await diaDoAluno(banco.db, semTurma!.id)).toBeNull()
  })

  it('apagar_o_dia_nao_apaga_a_turma', async () => {
    // `set null` e não `cascade`: se um dia for removido do calendário, a turma
    // volta a não ter dia corrente em vez de desaparecer com ele.
    const c = await cenario()
    await avancaDia(banco.db, c.turma.id, c.instrutora.id)

    await banco.db.delete(dias).where(eq(dias.id, c.dias[0]!.id))

    expect(await banco.db.select().from(turmas)).toHaveLength(1)
    expect(await diaCorrenteDaTurma(banco.db, c.turma.id)).toBeNull()
  })
})
