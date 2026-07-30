import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  aprova,
  devolve,
  estadoDoEscopo,
  NaoAutorizado,
  TransicaoIlegal,
} from '@/db/fila-de-aprovacao'
import { abreRascunho, EscopoInvalido, gravaResposta, submete } from '@/db/resposta-de-escopo'
import {
  formularios,
  grupos,
  perguntasDoFormulario,
  respostasDeEscopo,
  respostasDePergunta,
  turmas,
  usuarios,
} from '@/db/schema'
import { ESTADOS_DO_ESCOPO, transicaoPermitida, type EstadoDoEscopo } from '@/domain/escopo'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 9 em
// docs/BACKLOG.md. SSOT: Doc 2 §4.5 e §4.6.

describe('Issue 9 — fila de aprovação e máquina de estados', () => {
  let banco: BancoEfemero

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
        enunciado: 'Descreva o escopo.',
        criterioDeAceite: 'Escopo verificável.',
      })
      .returning()

    const pessoas = await banco.db
      .insert(usuarios)
      .values([
        { githubUserId: 9001, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' },
        { githubUserId: 9002, githubLogin: 'aluno', nome: 'Aluno', papel: 'aluno' },
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
      instrutora: pessoas[0]!,
      aluno: pessoas[1]!,
      grupoA: gruposCriados[0]!,
      grupoB: gruposCriados[1]!,
    }
  }

  /** Um escopo preenchido e entregue, pronto para a decisão do instrutor. */
  async function escopoSubmetido(grupoId: string, formularioId: string, perguntaId: string) {
    const rascunho = await abreRascunho(banco.db, grupoId, formularioId)
    await gravaResposta(banco.db, rascunho.id, perguntaId, 'Escopo do grupo')
    await submete(banco.db, rascunho.id)
    return rascunho
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('recusa_transicao_ilegal_do_formulario', async () => {
    const { formulario, pergunta, instrutora, grupoA } = await cenario()

    const rascunho = await abreRascunho(banco.db, grupoA.id, formulario.id)
    await gravaResposta(banco.db, rascunho.id, pergunta.id, 'Escopo do grupo')

    // Rascunho não se aprova nem se devolve: só o que foi entregue é decidido.
    expect(await estadoDoEscopo(banco.db, rascunho.id)).toBe('rascunho')
    await expect(aprova(banco.db, rascunho.id, instrutora.id)).rejects.toThrow(TransicaoIlegal)
    await expect(devolve(banco.db, rascunho.id, instrutora.id, 'faltou')).rejects.toThrow(
      TransicaoIlegal,
    )
    expect(await estadoDoEscopo(banco.db, rascunho.id)).toBe('rascunho')

    await submete(banco.db, rascunho.id)
    expect(await estadoDoEscopo(banco.db, rascunho.id)).toBe('submetido')

    await aprova(banco.db, rascunho.id, instrutora.id)
    expect(await estadoDoEscopo(banco.db, rascunho.id)).toBe('aprovado')

    // Aprovado é terminal: nem devolver, nem aprovar de novo, nem reenviar. A
    // única mudança admitida depois dele é a poda da issue 10, que não troca
    // de estado.
    const recusa = await aprova(banco.db, rascunho.id, instrutora.id).then(
      () => null,
      (e: unknown) => e as Error,
    )
    expect(recusa).toBeInstanceOf(TransicaoIlegal)
    expect(recusa?.message).toContain('não muda mais de estado')

    await expect(devolve(banco.db, rascunho.id, instrutora.id, 'mudei de ideia')).rejects.toThrow(
      TransicaoIlegal,
    )
    await expect(submete(banco.db, rascunho.id)).rejects.toThrow()
    expect(await estadoDoEscopo(banco.db, rascunho.id)).toBe('aprovado')
  })

  it('devolvido_volta_para_a_fila_depois_de_corrigido', async () => {
    const { formulario, pergunta, instrutora, grupoA } = await cenario()
    const escopo = await escopoSubmetido(grupoA.id, formulario.id, pergunta.id)

    await devolve(banco.db, escopo.id, instrutora.id, 'O estado C5 não aparece nas transições.')
    expect(await estadoDoEscopo(banco.db, escopo.id)).toBe('devolvido')

    // Devolvido é editável de propósito — devolver existe para corrigir.
    await gravaResposta(banco.db, escopo.id, pergunta.id, 'Escopo corrigido')

    await submete(banco.db, escopo.id)
    expect(await estadoDoEscopo(banco.db, escopo.id)).toBe('submetido')

    // O motivo antigo desaparece no reenvio: motivo pendurado em escopo que
    // voltou para a fila apareceria ao grupo como correção ainda pendente.
    const [depois] = await banco.db
      .select()
      .from(respostasDeEscopo)
      .where(eq(respostasDeEscopo.id, escopo.id))
    expect(depois?.motivoDaDevolucao).toBeNull()
    expect(depois?.decididoEm).toBeNull()
    expect(depois?.decididoPorId).toBeNull()

    await aprova(banco.db, escopo.id, instrutora.id)
    expect(await estadoDoEscopo(banco.db, escopo.id)).toBe('aprovado')
  })

  it('aprovado_e_somente_leitura_para_aluno', async () => {
    const { formulario, pergunta, instrutora, grupoA } = await cenario()
    const escopo = await escopoSubmetido(grupoA.id, formulario.id, pergunta.id)

    await aprova(banco.db, escopo.id, instrutora.id)

    // Pelo caminho da aplicação, o grupo recebe uma frase.
    const recusa = await gravaResposta(banco.db, escopo.id, pergunta.id, 'Escopo ampliado').then(
      () => null,
      (e: unknown) => e as Error,
    )
    expect(recusa).toBeInstanceOf(EscopoInvalido)
    expect(recusa?.message).toContain('aprovado')

    // E por qualquer outro caminho, o banco recusa. É o que torna a regra
    // imburlável: nem UPDATE direto, nem resposta a uma pergunta que ainda não
    // tinha sido respondida, entra em escopo aprovado.
    await expect(
      banco.db
        .update(respostasDePergunta)
        .set({ texto: 'por dentro' })
        .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id)),
    ).rejects.toThrow()

    const [outraPergunta] = await banco.db
      .insert(perguntasDoFormulario)
      .values({
        formularioId: formulario.id,
        ordem: 2,
        enunciado: 'Outra pergunta.',
        criterioDeAceite: 'Verificável.',
      })
      .returning()

    await expect(
      banco.db
        .insert(respostasDePergunta)
        .values({ respostaDeEscopoId: escopo.id, perguntaId: outraPergunta!.id, texto: 'nova' }),
    ).rejects.toThrow()

    // O texto entregue continua sendo o que o instrutor aprovou: é o gabarito
    // de correção a partir daqui (Doc 2 §4.5.1).
    const [guardada] = await banco.db
      .select({ texto: respostasDePergunta.texto })
      .from(respostasDePergunta)
      .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id))
    expect(guardada?.texto).toBe('Escopo do grupo')
  })

  it('submetido_tambem_e_somente_leitura', async () => {
    // A imutabilidade não começa na aprovação: entre entregar e ser decidido, o
    // formulário também está fechado. Sem isso a fila do instrutor seria um
    // alvo móvel, e ele julgaria um texto que mudou enquanto lia.
    const { formulario, pergunta, grupoA } = await cenario()
    const escopo = await escopoSubmetido(grupoA.id, formulario.id, pergunta.id)

    await expect(gravaResposta(banco.db, escopo.id, pergunta.id, 'trocando')).rejects.toThrow(
      EscopoInvalido,
    )
    await expect(
      banco.db
        .update(respostasDePergunta)
        .set({ texto: 'por dentro' })
        .where(eq(respostasDePergunta.respostaDeEscopoId, escopo.id)),
    ).rejects.toThrow()
  })

  it('somente_instrutor_decide', async () => {
    const { formulario, pergunta, aluno, grupoA } = await cenario()
    const escopo = await escopoSubmetido(grupoA.id, formulario.id, pergunta.id)

    // A matriz de permissões já barra a rota; esta é a segunda tranca, porque a
    // decisão que libera o grupo a construir não pode depender de o adaptador
    // ter chamado o guarda certo.
    await expect(aprova(banco.db, escopo.id, aluno.id)).rejects.toThrow(NaoAutorizado)
    await expect(devolve(banco.db, escopo.id, aluno.id, 'motivo')).rejects.toThrow(NaoAutorizado)
    expect(await estadoDoEscopo(banco.db, escopo.id)).toBe('submetido')
  })

  it('o_mapa_de_transicoes_nao_tem_estado_sem_saida_de_entrada', () => {
    // Guarda contra estado órfão: um estado ao qual nada leva é estado morto, e
    // um estado do qual nada sai que não seja o terminal trava o grupo.
    const alcancaveis = ESTADOS_DO_ESCOPO.filter((destino) =>
      ESTADOS_DO_ESCOPO.some((origem) => origem !== destino && transicaoPermitida(origem, destino)),
    )

    expect(alcancaveis).toEqual(['submetido', 'aprovado', 'devolvido'])

    const terminais = ESTADOS_DO_ESCOPO.filter(
      (origem) => !ESTADOS_DO_ESCOPO.some((destino) => transicaoPermitida(origem, destino)),
    )
    expect(terminais).toEqual<EstadoDoEscopo[]>(['aprovado'])
  })
})
