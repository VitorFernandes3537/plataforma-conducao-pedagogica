import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { formularioDoCurso, perguntasDoFormularioEmOrdem } from '@/db/formulario'
import { formularios, perguntasDoFormulario } from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 6 em
// docs/BACKLOG.md. SSOT: `D2-CONTRATO` · Doc 2 §4.2 · Doc 7 §2.2.

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 6 — FormularioDeEscopo configurável', () => {
  let banco: BancoEfemero

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('formulario_tem_perguntas_configuraveis', async () => {
    const curso = await criaCurso(banco)
    const [formulario] = await banco.db
      .insert(formularios)
      .values({ cursoId: curso.id, nome: 'Formulário de escopo' })
      .returning()

    // Inseridas fora de ordem de propósito: a sequência é do dado.
    await banco.db.insert(perguntasDoFormulario).values([
      {
        formularioId: formulario!.id,
        ordem: 2,
        enunciado: 'Qual recurso é escasso?',
        criterioDeAceite: 'Nomeia um recurso finito e explica por que limita.',
      },
      {
        formularioId: formulario!.id,
        ordem: 1,
        enunciado: 'Qual é o atendimento no seu domínio?',
        criterioDeAceite: 'Descreve um evento, não um cadastro.',
      },
    ])

    const perguntas = await perguntasDoFormularioEmOrdem(banco.db, formulario!.id)

    expect(perguntas.map((p) => p.ordem)).toEqual([1, 2])
    expect(perguntas[0]?.enunciado).toBe('Qual é o atendimento no seu domínio?')
    // Enunciado E critério de aceite: sem critério declarado a pergunta é
    // opinião, e é dele que a issue 7 vai derivar a validação.
    expect(perguntas[0]?.criterioDeAceite).toBe('Descreve um evento, não um cadastro.')

    // A CONTAGEM É CONFIGURAÇÃO. Dois formulários com quantidades diferentes, e
    // nenhuma delas é sete.
    const outro = await criaCurso(banco, { nome: 'Outro curso' })
    const [formularioDoOutro] = await banco.db
      .insert(formularios)
      .values({ cursoId: outro.id, nome: 'Formulário curto' })
      .returning()
    await banco.db.insert(perguntasDoFormulario).values(
      [1, 2, 3, 4].map((ordem) => ({
        formularioId: formularioDoOutro!.id,
        ordem,
        enunciado: `Pergunta ${ordem}`,
        criterioDeAceite: `Critério ${ordem}`,
      })),
    )

    expect(await perguntasDoFormularioEmOrdem(banco.db, formularioDoOutro!.id)).toHaveLength(4)
    expect(await perguntasDoFormularioEmOrdem(banco.db, formulario!.id)).toHaveLength(2)

    // Duas perguntas na mesma posição do mesmo formulário não existem.
    await expect(
      banco.db.insert(perguntasDoFormulario).values({
        formularioId: formulario!.id,
        ordem: 1,
        enunciado: 'Duplicada',
        criterioDeAceite: 'x',
      }),
    ).rejects.toThrow()

    // Curso sem formulário é estado válido: o instrutor pode não ter cadastrado.
    const semNada = await criaCurso(banco, { nome: 'Sem formulário' })
    expect(await formularioDoCurso(banco.db, semNada.id)).toBeNull()
    expect(await formularioDoCurso(banco.db, curso.id)).toEqual({ id: formulario!.id })

    // Nenhuma contagem de perguntas no código — sete é o número deste curso.
    const fontes = ['src/db/formulario.ts', 'src/db/schema/index.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join('\n')
    expect(fontes).not.toMatch(/\b7\b|\bsete\b/i)
  })
})
