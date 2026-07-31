import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  criticaDoGrupoNaRodada,
  CriticaInvalida,
  registraCritica,
  sorteiaRodada,
} from '@/db/critica'
import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import {
  bancosDeTemas,
  grupos,
  rodadasDeCritica,
  temas,
  turmas,
  usuarios,
} from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

function geradorDe(semente: number): () => number {
  let estado = semente >>> 0
  const proximo = () => {
    estado = (estado * 1664525 + 1013904223) % 4294967296
    return estado / 4294967296
  }
  for (let i = 0; i < 12; i += 1) proximo()
  return proximo
}

/**
 * A tela de crítica pede uma consulta que não existia — o pareamento do grupo
 * nos dois sentidos, com a identidade do outro grupo — e a escrita da crítica
 * ganhou a autorização que lhe faltava. As duas são regra, e por isso têm teste.
 */
describe('tela de crítica', () => {
  let banco: BancoEfemero

  /** Curso com dois temas, uma turma, dois grupos com tema, e uma rodada. */
  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [banco2] = await banco.db
      .insert(bancosDeTemas)
      .values({ cursoId: curso.id, nome: 'Banco' })
      .returning()
    const temasCriados = await banco.db
      .insert(temas)
      .values([
        { bancoDeTemasId: banco2!.id, nome: 'Barbearia', dificuldade: 'fácil', trilha: 'padrao' },
        { bancoDeTemasId: banco2!.id, nome: 'Biblioteca', dificuldade: 'fácil', trilha: 'padrao' },
      ])
      .returning()
    const [rodada] = await banco.db
      .insert(rodadasDeCritica)
      .values({ cursoId: curso.id, ordem: 1, nome: 'Crítica 1' })
      .returning()
    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 1, githubLogin: 'inst', nome: 'Inst', papel: 'instrutor' })
      .returning()

    const g = []
    for (const tema of temasCriados) {
      const [grupo] = await banco.db
        .insert(grupos)
        .values({ turmaId: turma!.id, temaId: tema.id })
        .returning()
      g.push(grupo!)
    }

    return { curso, turma: turma!, rodada: rodada!, instrutora: instrutora!, grupos: g }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('rodada_inexistente_devolve_nulo', async () => {
    const c = await cenario()
    expect(
      await criticaDoGrupoNaRodada(banco.db, crypto.randomUUID(), c.grupos[0]!.id),
    ).toBeNull()
  })

  it('grupo_nao_sorteado_nao_tem_par_nenhum', async () => {
    const c = await cenario()
    // A rodada existe, mas ninguém foi sorteado ainda.
    const visao = await criticaDoGrupoNaRodada(banco.db, c.rodada.id, c.grupos[0]!.id)

    expect(visao).not.toBeNull()
    expect(visao!.rodada.nome).toBe('Crítica 1')
    // É assim que a tela declara a ausência, em vez de mostrar formulário.
    expect(visao!.escrevo).toBeNull()
    expect(visao!.recebo).toBeNull()
  })

  it('traz_os_dois_sentidos_com_a_identidade_do_outro_grupo', async () => {
    const c = await cenario()
    await sorteiaRodada(banco.db, c.rodada.id, c.turma.id, c.instrutora.id, geradorDe(3))

    const visao = await criticaDoGrupoNaRodada(banco.db, c.rodada.id, c.grupos[0]!.id)

    // Com dois grupos, cada um revisa e é revisado pelo outro.
    expect(visao!.escrevo).not.toBeNull()
    expect(visao!.recebo).not.toBeNull()

    // O grupo que este revisa é o outro, e vem com tema para o revisor se
    // orientar (Doc 5 §4.1).
    expect(visao!.escrevo!.revisado.grupoId).toBe(c.grupos[1]!.id)
    expect(visao!.escrevo!.revisado.tema).toBe('Biblioteca')

    // Ainda não escreveu nada.
    expect(visao!.escrevo!.registro).toBeNull()
    // Nem recebeu.
    expect(visao!.recebo!.registro).toBeNull()
  })

  it('a_critica_recebida_some_ate_o_revisor_escrever', async () => {
    const c = await cenario()
    await sorteiaRodada(banco.db, c.rodada.id, c.turma.id, c.instrutora.id, geradorDe(3))

    const antes = await criticaDoGrupoNaRodada(banco.db, c.rodada.id, c.grupos[0]!.id)
    const meuPar = antes!.escrevo!.parId

    // O grupo 0 escreve sobre o grupo 1.
    await registraCritica(banco.db, meuPar, c.grupos[0]!.id, {
      explicacaoDoTema: 'Eles controlam empréstimos com prazo por tipo de acervo.',
      cenarioQueQuebra: 'E se devolverem um exemplar que nunca foi emprestado?',
    })

    // Agora o grupo 1 vê a crítica que recebeu.
    const doOutro = await criticaDoGrupoNaRodada(banco.db, c.rodada.id, c.grupos[1]!.id)
    expect(doOutro!.recebo!.registro?.explicacaoDoTema).toContain('empréstimos')
    // E o grupo 0 vê o que escreveu, para poder corrigir.
    const meu = await criticaDoGrupoNaRodada(banco.db, c.rodada.id, c.grupos[0]!.id)
    expect(meu!.escrevo!.registro?.cenarioQueQuebra).toContain('exemplar')
  })

  it('so_o_grupo_que_revisa_escreve_a_critica_do_par', async () => {
    const c = await cenario()
    await sorteiaRodada(banco.db, c.rodada.id, c.turma.id, c.instrutora.id, geradorDe(3))

    const visao = await criticaDoGrupoNaRodada(banco.db, c.rodada.id, c.grupos[0]!.id)
    const parId = visao!.escrevo!.parId

    // O grupo 1 é o revisado deste par — não pode escrever a crítica dele
    // passando o parId direto. É o que barra a chamada à server action por fora
    // da tela.
    await expect(
      registraCritica(banco.db, parId, c.grupos[1]!.id, {
        explicacaoDoTema: 'tentando escrever a crítica de mim mesmo',
        cenarioQueQuebra: 'qualquer',
      }),
    ).rejects.toBeInstanceOf(NaoAutorizado)
  })

  it('par_inexistente_e_recusado', async () => {
    const c = await cenario()
    await expect(
      registraCritica(banco.db, crypto.randomUUID(), c.grupos[0]!.id, {
        explicacaoDoTema: 'a',
        cenarioQueQuebra: 'b',
      }),
    ).rejects.toBeInstanceOf(CriticaInvalida)
  })

  it('grupo_sem_tema_nao_quebra_a_consulta', async () => {
    const c = await cenario()
    // Um grupo a mais, sem tema — não deveria acontecer no D6, mas a consulta
    // não pode quebrar por isso.
    await banco.db.update(grupos).set({ temaId: null }).where(eq(grupos.id, c.grupos[1]!.id))
    await sorteiaRodada(banco.db, c.rodada.id, c.turma.id, c.instrutora.id, geradorDe(3))

    const visao = await criticaDoGrupoNaRodada(banco.db, c.rodada.id, c.grupos[0]!.id)
    expect(visao!.escrevo!.revisado.tema).toBeNull()
  })
})
