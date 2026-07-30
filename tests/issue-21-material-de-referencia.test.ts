import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { referenciasVisiveis } from '@/db/material'
import { dias, materiaisDeReferencia } from '@/db/schema'
import { podeVer, type Ator } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 21 em
// docs/BACKLOG.md. SSOT: Doc 5 §3.1 e §3.2 (`D5-RECUPERACAO`) · `D3-ORDEM`.

const ALUNO: Ator = { papel: 'aluno', usuarioId: 'u-aluno', grupoId: 'g-1' }
const INSTRUTOR: Ator = { papel: 'instrutor', usuarioId: 'u-instrutor' }

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 21 — material de referência com liberação temporizada', () => {
  let banco: BancoEfemero

  /** Cinco dias, e material de referência liberado nos dias 1, 3 e 5. */
  async function cenario() {
    const curso = await criaCurso(banco)
    const diasCriados = await banco.db
      .insert(dias)
      .values([1, 2, 3, 4, 5].map((ordem) => ({ cursoId: curso.id, ordem })))
      .returning()

    await banco.db.insert(materiaisDeReferencia).values([
      {
        diaDeLiberacaoId: diasCriados[0]!.id,
        titulo: 'Espelho do primeiro dia',
        url: 'https://github.com/instrutor/espelho/tree/d1',
      },
      {
        diaDeLiberacaoId: diasCriados[2]!.id,
        titulo: 'Espelho do terceiro dia',
        url: 'https://github.com/instrutor/espelho/tree/d3',
      },
      {
        diaDeLiberacaoId: diasCriados[4]!.id,
        titulo: 'Espelho do quinto dia',
        url: 'https://github.com/instrutor/espelho/tree/d5',
      },
    ])

    return { curso, diasCriados }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('material_de_referencia_tem_dia_de_liberacao', async () => {
    const { curso, diasCriados } = await cenario()

    const todos = await referenciasVisiveis(banco.db, curso.id, 5, INSTRUTOR)
    expect(todos.map((m) => m.ordemDeLiberacao)).toEqual([1, 3, 5])

    // A plataforma não hospeda código (fora de escopo da issue): o material é
    // uma URL, e o que não é endereço é rejeitado pelo banco.
    const erro = await banco.db
      .insert(materiaisDeReferencia)
      .values({
        diaDeLiberacaoId: diasCriados[1]!.id,
        titulo: 'Não é endereço',
        url: 'apenas um texto',
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(erro).toBeInstanceOf(Error)
    expect(causaDe(erro)).toMatch(/material_de_referencia_e_url/)

    // Apagar o dia leva o material com ele — referência órfã não existe.
    await banco.db.delete(dias)
    expect(await referenciasVisiveis(banco.db, curso.id, 5, INSTRUTOR)).toHaveLength(0)
  })

  it('material_invisivel_antes_do_dia_de_liberacao', async () => {
    const { curso } = await cenario()

    // No dia 2, o do dia 3 e o do dia 5 ainda não existem para o aluno.
    const noDia2 = await referenciasVisiveis(banco.db, curso.id, 2, ALUNO)
    expect(noDia2.map((m) => m.ordemDeLiberacao)).toEqual([1])
    expect(noDia2.map((m) => m.titulo)).not.toContain('Espelho do terceiro dia')

    // Antes do primeiro dia de liberação, nada.
    expect(await referenciasVisiveis(banco.db, curso.id, 0, ALUNO)).toHaveLength(0)

    // A política diz a mesma coisa, e é ela que as telas consultam.
    expect(podeVer(ALUNO, { tipo: 'material-de-referencia', liberado: false })).toBe(false)
    expect(podeVer(ALUNO, { tipo: 'material-de-referencia', liberado: true })).toBe(true)
  })

  it('material_de_dias_anteriores_permanece_acessivel', async () => {
    const { curso } = await cenario()

    // Doc 5 §3.1: o atraso protege o dia corrente, não os anteriores. Quem
    // faltou no primeiro dia recupera por ele enquanto o curso avança.
    const noDia3 = await referenciasVisiveis(banco.db, curso.id, 3, ALUNO)
    expect(noDia3.map((m) => m.ordemDeLiberacao)).toEqual([1, 3])

    const noDia5 = await referenciasVisiveis(banco.db, curso.id, 5, ALUNO)
    expect(noDia5.map((m) => m.ordemDeLiberacao)).toEqual([1, 3, 5])

    // E continua acessível depois do fim do curso.
    const depois = await referenciasVisiveis(banco.db, curso.id, 99, ALUNO)
    expect(depois).toHaveLength(3)
  })

  it('instrutor_ve_todo_o_material', async () => {
    const { curso } = await cenario()

    // Doc 7 §3: "Instrutor — Tudo." Inclusive antes de qualquer liberação.
    const antesDeTudo = await referenciasVisiveis(banco.db, curso.id, 0, INSTRUTOR)
    expect(antesDeTudo).toHaveLength(3)
    expect(antesDeTudo.map((m) => m.ordemDeLiberacao)).toEqual([1, 3, 5])

    // No dia 1 o aluno vê um, o instrutor vê os três.
    expect(await referenciasVisiveis(banco.db, curso.id, 1, ALUNO)).toHaveLength(1)
    expect(await referenciasVisiveis(banco.db, curso.id, 1, INSTRUTOR)).toHaveLength(3)

    expect(podeVer(INSTRUTOR, { tipo: 'material-de-referencia', liberado: false })).toBe(true)
  })

  it('material_de_outro_curso_nao_vaza', async () => {
    const { curso } = await cenario()

    // Duas turmas rodando ao mesmo tempo é o caso que a plataforma existe para
    // servir — o material de um curso não pode aparecer no outro.
    const outro = await criaCurso(banco, { nome: 'Outro curso' })
    const [diaDoOutro] = await banco.db
      .insert(dias)
      .values({ cursoId: outro.id, ordem: 1 })
      .returning()
    await banco.db.insert(materiaisDeReferencia).values({
      diaDeLiberacaoId: diaDoOutro!.id,
      titulo: 'Espelho de outro curso',
      url: 'https://github.com/outro/espelho',
    })

    const doPrimeiro = await referenciasVisiveis(banco.db, curso.id, 99, INSTRUTOR)
    expect(doPrimeiro.map((m) => m.titulo)).not.toContain('Espelho de outro curso')
    expect(doPrimeiro).toHaveLength(3)
  })
})
