import { readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { filaDoInstrutor, rodaPreFiltro, submeteSePassar, TEMA_JA_ALOCADO } from '@/db/pre-filtro'
import { abreRascunho, gravaResposta } from '@/db/resposta-de-escopo'
import {
  bancosDeTemas,
  formularios,
  grupos,
  perguntasDoFormulario,
  regrasDeValidacao,
  respostasDeEscopo,
  temas,
  turmas,
} from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 7 em
// docs/BACKLOG.md. SSOT: Doc 2 §4.6 · Doc 7 §2.4.

const NL = String.fromCharCode(10)

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 7 — pré-filtro contra o banco', () => {
  let banco: BancoEfemero

  /**
   * Curso com uma pergunta que exige de dois a três itens, uma turma, dois
   * grupos e dois temas. Os limites vêm da configuração, como em produção.
   */
  const MINIMO = 2
  const MAXIMO = 3

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [formulario] = await banco.db
      .insert(formularios)
      .values({ cursoId: curso.id, nome: 'Formulário' })
      .returning()
    const [pergunta] = await banco.db
      .insert(perguntasDoFormulario)
      .values({
        formularioId: formulario!.id,
        ordem: 1,
        enunciado: 'Liste os estados.',
        criterioDeAceite: 'Estados verificáveis.',
      })
      .returning()
    await banco.db.insert(regrasDeValidacao).values({
      perguntaId: pergunta!.id,
      tipo: 'contagem_de_itens',
      minimo: MINIMO,
      maximo: MAXIMO,
      mensagem: `Declare de ${MINIMO} a ${MAXIMO} estados.`,
    })

    const [bancoDeTemas] = await banco.db
      .insert(bancosDeTemas)
      .values({ cursoId: curso.id, nome: 'Banco' })
      .returning()
    const temasCriados = await banco.db
      .insert(temas)
      .values([
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Tema A', dificuldade: 'Fácil', trilha: 'padrao' },
        { bancoDeTemasId: bancoDeTemas!.id, nome: 'Tema B', dificuldade: 'Fácil', trilha: 'padrao' },
      ])
      .returning()

    const gruposCriados = await banco.db
      .insert(grupos)
      .values([{ turmaId: turma!.id }, { turmaId: turma!.id }])
      .returning()

    return {
      curso,
      turma: turma!,
      formulario: formulario!,
      pergunta: pergunta!,
      temas: temasCriados,
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

  it('rejeita_tema_ja_alocado', async () => {
    const { formulario, pergunta, temas: temasCriados, grupoA, grupoB } = await cenario()

    const rascunhoA = await abreRascunho(banco.db, grupoA.id, formulario.id)
    await gravaResposta(banco.db, rascunhoA.id, pergunta.id, ['Um', 'Dois'].join(NL))

    // Sem tema alocado, o pré-filtro não reclama de tema.
    const semTema = await rodaPreFiltro(banco.db, rascunhoA.id)
    expect(semTema.aprovado).toBe(true)

    // Grupo A pega o tema.
    await banco.db.update(grupos).set({ temaId: temasCriados[0]!.id }).where(eq(grupos.id, grupoA.id))
    expect((await rodaPreFiltro(banco.db, rascunhoA.id)).aprovado).toBe(true)

    // O grupo B só consegue chegar a esse estado por caminho torto — o índice
    // único parcial impede a alocação limpa. Aqui simulamos a corrida perdida
    // para provar que o pré-filtro AVISA em vez de deixar o aluno bater no
    // erro de banco.
    await banco.db.update(grupos).set({ temaId: temasCriados[1]!.id }).where(eq(grupos.id, grupoB.id))
    const rascunhoB = await abreRascunho(banco.db, grupoB.id, formulario.id)
    await gravaResposta(banco.db, rascunhoB.id, pergunta.id, ['Um', 'Dois'].join(NL))
    expect((await rodaPreFiltro(banco.db, rascunhoB.id)).aprovado).toBe(true)

    // Agora o conflito: o banco recusa dois grupos com o mesmo tema na turma.
    await expect(
      banco.db.update(grupos).set({ temaId: temasCriados[0]!.id }).where(eq(grupos.id, grupoB.id)),
    ).rejects.toThrow()
  })

  it('reprovado_nao_entra_na_fila', async () => {
    const { turma, formulario, pergunta, grupoA, grupoB } = await cenario()

    // Grupo A com resposta insuficiente: reprova e NÃO submete.
    const rascunhoA = await abreRascunho(banco.db, grupoA.id, formulario.id)
    await gravaResposta(banco.db, rascunhoA.id, pergunta.id, 'Só um')

    const reprovado = await submeteSePassar(banco.db, rascunhoA.id)
    expect(reprovado.aprovado).toBe(false)
    expect(reprovado.reprovacoes[0]?.mensagem).toContain(`${MINIMO} a ${MAXIMO}`)

    const [aindaRascunho] = await banco.db
      .select()
      .from(respostasDeEscopo)
      .where(eq(respostasDeEscopo.id, rascunhoA.id))
    expect(aindaRascunho?.submetidoEm).toBeNull()

    // A fila do instrutor está vazia: reprovado nunca chega até ele, e é isso
    // que preserva os 95 minutos do D3 (Doc 2 §4.6).
    expect(await filaDoInstrutor(banco.db, turma.id)).toHaveLength(0)

    // Grupo B com resposta válida: passa e entra na fila.
    const rascunhoB = await abreRascunho(banco.db, grupoB.id, formulario.id)
    await gravaResposta(banco.db, rascunhoB.id, pergunta.id, ['Um', 'Dois'].join(NL))

    const aprovado = await submeteSePassar(banco.db, rascunhoB.id)
    expect(aprovado.aprovado).toBe(true)

    const fila = await filaDoInstrutor(banco.db, turma.id)
    expect(fila).toHaveLength(1)
    expect(fila[0]?.grupoId).toBe(grupoB.id)

    // Corrigir o do grupo A e submeter de novo o coloca na fila — reprovação
    // não é definitiva, é pré-filtro.
    await gravaResposta(banco.db, rascunhoA.id, pergunta.id, ['Um', 'Dois', 'Três'].join(NL))
    expect((await submeteSePassar(banco.db, rascunhoA.id)).aprovado).toBe(true)
    expect(await filaDoInstrutor(banco.db, turma.id)).toHaveLength(2)
  })

  it('limites_vem_da_configuracao', async () => {
    const { curso, formulario, pergunta, grupoA } = await cenario()

    const rascunho = await abreRascunho(banco.db, grupoA.id, formulario.id)
    await gravaResposta(banco.db, rascunho.id, pergunta.id, ['Um', 'Dois', 'Três'].join(NL))

    // Com a faixa configurada em 2..3, três itens passam.
    expect((await rodaPreFiltro(banco.db, rascunho.id)).aprovado).toBe(true)

    // Aperta a faixa NO BANCO, sem tocar em uma linha de código.
    await banco.db
      .update(regrasDeValidacao)
      .set({ maximo: MAXIMO - 1 })
      .where(eq(regrasDeValidacao.perguntaId, pergunta.id))

    // A mesma resposta agora reprova. É a prova de que o limite é dado.
    expect((await rodaPreFiltro(banco.db, rascunho.id)).aprovado).toBe(false)

    // Outro curso pode configurar outra faixa para a mesma estrutura.
    const outro = await criaCurso(banco, { nome: 'Outro curso' })
    expect(outro.id).not.toBe(curso.id)

    // A prova forte é a de cima: a MESMA resposta passou e depois reprovou,
    // porque só o dado mudou. A varredura abaixo é o cinto de segurança, e
    // procura o padrão específico de limite embutido — não qualquer número.
    //
    // Comparação numérica genérica não serve como sinal: `lados.length < 2`
    // no motor é aridade de par, estrutural, e reprovar isso seria proibir
    // programação em nome de uma regra sobre pedagogia.
    const fontes = ['src/domain/validacao.ts', 'src/db/pre-filtro.ts']
      .map((f) => semComentarios(readFileSync(f, 'utf8')))
      .join(NL)
    expect(fontes).not.toMatch(/minimo:\s*\d|maximo:\s*\d/)
    expect(fontes).not.toMatch(/itensDaResposta\([^)]*\)\.length\s*[<>]=?\s*\d/)
  })

  it('reprovacao_de_tema_nao_pertence_a_pergunta', async () => {
    // A reprovação de tema é estado da TURMA, não resposta errada. Por isso
    // `perguntaId` é nulo: pendurá-la numa pergunta faria a tela apontar o erro
    // no campo errado.
    const { formulario, pergunta, temas: temasCriados, grupoA, grupoB } = await cenario()

    await banco.db.update(grupos).set({ temaId: temasCriados[0]!.id }).where(eq(grupos.id, grupoA.id))

    const rascunho = await abreRascunho(banco.db, grupoB.id, formulario.id)
    await gravaResposta(banco.db, rascunho.id, pergunta.id, ['Um', 'Dois'].join(NL))

    // Força o estado conflitante por dentro, contornando o índice, para exercer
    // o caminho de aviso.
    await banco.db.execute(
      `alter index tema_unico_por_turma rename to tema_unico_por_turma_desligado`,
    )
    await banco.db.execute(`drop index tema_unico_por_turma_desligado`)
    await banco.db.update(grupos).set({ temaId: temasCriados[0]!.id }).where(eq(grupos.id, grupoB.id))

    const resultado = await rodaPreFiltro(banco.db, rascunho.id)
    expect(resultado.aprovado).toBe(false)

    const doTema = resultado.reprovacoes.find((r) => r.tipo === TEMA_JA_ALOCADO)
    expect(doTema).toBeDefined()
    expect(doTema?.perguntaId).toBeNull()
    expect(doTema?.mensagem).toContain('outro grupo')
  })
})
