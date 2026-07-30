import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { aprova } from '@/db/fila-de-aprovacao'
import { derivacaoDoGrupo, geraIncremento } from '@/db/incremento'
import { lancaAvaliacaoDoAluno } from '@/db/registro-diario'
import { abreRascunho, gravaResposta, submete } from '@/db/resposta-de-escopo'
import {
  AgregacaoInvalida,
  bancoDePerguntas,
  finalizaAgregacao,
  notaDoAluno,
  notaVisivel,
  perguntasDaDefesaDoGrupo,
  registraDefesa,
} from '@/db/rubrica'
import {
  alunos,
  avaliacoesDaDefesa,
  avaliacoesDeMudanca,
  dias,
  eixos,
  formularios,
  grupos,
  incrementos,
  lacunasDoModelo,
  modelosDeMudanca,
  niveisDeAvaliacao,
  obstaculos,
  perguntasDaDefesa,
  perguntasDoFormulario,
  registrosDeDefesa,
  turmas,
  usuarios,
} from '@/db/schema'
import { AcessoNegado, type Ator } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 18 em
// docs/BACKLOG.md. SSOT: `D6-EIXOS` · `D6-ESCALA` · `D6-PESOS-PAREDE` ·
// `D6-DEFESA` · Doc 6 §1.1 e §9.1.

/** O drizzle embrulha o erro do Postgres; a mensagem real fica em `cause`. */
function causaDe(erro: unknown): string {
  const causa = erro instanceof Error ? erro.cause : undefined
  return causa instanceof Error ? causa.message : String(causa)
}

describe('Issue 18 — agregação da rubrica e defesa oral', () => {
  let banco: BancoEfemero

  /** Escala e pesos de um curso fictício. Nenhum número aqui é regra. */
  const ESCALA = [0, 1, 2, 3]
  const TETO = 3
  const PESO_DO_MODELO = 0.5
  const PESO_DA_ABSORCAO = 0.3

  async function cenario() {
    const curso = await criaCurso(banco, { minimoDeItensImutaveis: 2 })
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const niveis = await banco.db
      .insert(niveisDeAvaliacao)
      .values(
        ESCALA.map((valor) => ({
          cursoId: curso.id,
          valor,
          descritor: `Nível ${valor}`,
          contaComoSuperacao: valor >= 1,
        })),
      )
      .returning()

    // Três obstáculos, o do meio pesando o dobro — como o Doc 6 §3.1 faz com o
    // obstáculo central do curso dele. Qual pesa mais é configuração.
    const obstaculosCriados = await banco.db
      .insert(obstaculos)
      .values([
        { cursoId: curso.id, ordem: 1, pergunta: 'Primeira pergunta?', peso: 1 },
        { cursoId: curso.id, ordem: 2, pergunta: 'Segunda pergunta?', peso: 2 },
        { cursoId: curso.id, ordem: 3, pergunta: 'Terceira pergunta?', peso: 1 },
      ])
      .returning()

    const eixosCriados = await banco.db
      .insert(eixos)
      .values([
        {
          cursoId: curso.id,
          ordem: 1,
          nome: 'Modelo',
          peso: PESO_DO_MODELO,
          unidade: 'aluno' as const,
          fonte: 'avaliacao_de_obstaculo' as const,
        },
        {
          cursoId: curso.id,
          ordem: 2,
          nome: 'Absorção',
          peso: PESO_DA_ABSORCAO,
          unidade: 'grupo' as const,
          fonte: 'avaliacao_de_incremento' as const,
        },
      ])
      .returning()

    const perguntas = await banco.db
      .insert(perguntasDaDefesa)
      .values([
        { cursoId: curso.id, ordem: 1, enunciado: 'Por que essa regra está aqui e não ali?' },
        { cursoId: curso.id, ordem: 2, enunciado: 'O que quebra se eu mudar isso?' },
        { cursoId: curso.id, ordem: 3, enunciado: 'Onde essa regra mora? É só um lugar?' },
      ])
      .returning()

    const diasCriados = await banco.db
      .insert(dias)
      .values([1, 2, 3].map((ordem) => ({ cursoId: curso.id, ordem })))
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
        enunciado: 'Escopo?',
        criterioDeAceite: 'Verificável.',
        alimentaIncremento: true,
      })
      .returning()

    const [modelo] = await banco.db
      .insert(modelosDeMudanca)
      .values({
        cursoId: curso.id,
        ordem: 1,
        rotulo: 'Nova regra de cálculo',
        entraNaVersaoReduzida: true,
      })
      .returning()
    await banco.db.insert(lacunasDoModelo).values({
      modeloDeMudancaId: modelo!.id,
      ordem: 1,
      chave: 'formula',
      rotulo: 'Como passa a ser calculado',
      obrigatoria: true,
    })

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 1801, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    const integrantes = []
    for (const [i, nome] of ['Ana', 'Bruno'].entries()) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({ githubUserId: 1810 + i, githubLogin: nome.toLowerCase(), nome, papel: 'aluno' })
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
      integrantes.push({ aluno: aluno!, usuario: usuario! })
    }

    return {
      curso,
      turma: turma!,
      niveis,
      obstaculos: obstaculosCriados,
      eixoDoModelo: eixosCriados[0]!,
      eixoDaAbsorcao: eixosCriados[1]!,
      perguntas,
      dias: diasCriados,
      formulario: formulario!,
      pergunta: pergunta!,
      modelo: modelo!,
      instrutora: instrutora!,
      grupo: grupo!,
      ana: integrantes[0]!,
      bruno: integrantes[1]!,
    }
  }

  function nivel(c: Awaited<ReturnType<typeof cenario>>, valor: number) {
    return c.niveis.find((n) => n.valor === valor)!
  }

  /** Lança a mesma nota em todos os obstáculos, para um aluno. */
  async function lancaTodos(
    c: Awaited<ReturnType<typeof cenario>>,
    alunoId: string,
    valor: number,
  ) {
    for (const [i, obstaculo] of c.obstaculos.entries()) {
      await lancaAvaliacaoDoAluno(banco.db, alunoId, {
        diaId: c.dias[i]!.id,
        obstaculoId: obstaculo.id,
        valor,
        instrutorId: c.instrutora.id,
      })
    }
  }

  /** Incremento aprovado e avaliado, que é o que alimenta o eixo de grupo. */
  async function incrementoAvaliado(c: Awaited<ReturnType<typeof cenario>>, valor: number) {
    const escopo = await abreRascunho(banco.db, c.grupo.id, c.formulario.id)
    await gravaResposta(banco.db, escopo.id, c.pergunta.id, 'Escopo do grupo')
    await submete(banco.db, escopo.id)
    await aprova(banco.db, escopo.id, c.instrutora.id)

    const derivacao = await derivacaoDoGrupo(banco.db, c.grupo.id, 'reduzida')
    await geraIncremento(
      banco.db,
      c.grupo.id,
      {
        remetente: 'A direção do serviço',
        contexto: 'Contexto.',
        versao: 'reduzida',
        diaDeLiberacaoId: c.dias[2]!.id,
        lacunas: Object.fromEntries(
          derivacao.mudancas.flatMap((m) => m.lacunas.map((l) => [l.lacunaId, 'valor'])),
        ),
        itensImutaveis: ['Um', 'Dois'],
      },
      c.instrutora.id,
    )

    const [incremento] = await banco.db.select().from(incrementos)
    await banco.db.insert(avaliacoesDeMudanca).values({
      incrementoId: incremento!.id,
      modeloDeMudancaId: c.modelo.id,
      nivelId: nivel(c, valor).id,
      lancadoPorId: c.instrutora.id,
    })
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('agregacao_respeita_pesos_por_eixo', async () => {
    const c = await cenario()

    // Modelo no máximo, absorção na metade.
    await lancaTodos(c, c.ana.aluno.id, TETO)
    await incrementoAvaliado(c, 1)

    const nota = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(nota.completa).toBe(true)
    expect(nota.eixos.map((e) => e.nome)).toEqual(['Modelo', 'Absorção'])

    const doModelo = nota.eixos[0]!
    const daAbsorcao = nota.eixos[1]!
    expect(doModelo.proporcao).toBeCloseTo(1)
    expect(daAbsorcao.proporcao).toBeCloseTo(1 / TETO)

    // A final é a média ponderada pelos pesos DECLARADOS. Divide pela soma dos
    // pesos em vez de exigir que somem 1: exigir isso seria regra que nenhum
    // documento escreveu, e um curso com quatro eixos teria de recalcular os
    // quatro para mexer em um.
    const esperada =
      (1 * PESO_DO_MODELO + (1 / TETO) * PESO_DA_ABSORCAO) / (PESO_DO_MODELO + PESO_DA_ABSORCAO)
    expect(nota.proporcao).toBeCloseTo(esperada)

    // Mudar só o peso muda a nota, sem tocar em código: "três agregações
    // distintas, com pesos configuráveis" (Doc 6 §13).
    await banco.db.update(eixos).set({ peso: 0.1 }).where(eq(eixos.id, c.eixoDoModelo.id))

    const depois = await notaDoAluno(banco.db, c.ana.aluno.id)
    const outra = (1 * 0.1 + (1 / TETO) * PESO_DA_ABSORCAO) / (0.1 + PESO_DA_ABSORCAO)
    expect(depois.proporcao).toBeCloseTo(outra)
    expect(depois.proporcao).not.toBeCloseTo(esperada)

    // Peso zero é recusado pelo banco: tiraria o eixo da nota sem tirá-lo da
    // rubrica, e o aluno seria avaliado num eixo que não vale nada.
    await expect(
      banco.db.update(eixos).set({ peso: 0 }).where(eq(eixos.id, c.eixoDoModelo.id)),
    ).rejects.toThrow()
  })

  it('agregacao_respeita_unidade_do_eixo', async () => {
    const c = await cenario()

    // Ana no máximo, Bruno no mínimo — no eixo de ALUNO. O incremento é um só,
    // no eixo de GRUPO.
    await lancaTodos(c, c.ana.aluno.id, TETO)
    await lancaTodos(c, c.bruno.aluno.id, 0)
    await incrementoAvaliado(c, TETO)

    const daAna = await notaDoAluno(banco.db, c.ana.aluno.id)
    const doBruno = await notaDoAluno(banco.db, c.bruno.aluno.id)

    // O eixo de aluno separa os dois: é o que impede o ausente de herdar a nota
    // do parceiro (Doc 6 §1.1).
    expect(daAna.eixos[0]?.proporcao).toBeCloseTo(1)
    expect(doBruno.eixos[0]?.proporcao).toBeCloseTo(0)

    // O eixo de grupo dá a MESMA nota aos dois: o incremento é um por domínio,
    // absorvido em conjunto.
    expect(daAna.eixos[1]?.proporcao).toBeCloseTo(1)
    expect(doBruno.eixos[1]?.proporcao).toBeCloseTo(1)
    expect(daAna.eixos[1]?.unidade).toBe('grupo')
    expect(daAna.eixos[0]?.unidade).toBe('aluno')

    // E as finais diferem, porque só o eixo de aluno difere.
    expect(daAna.proporcao).toBeGreaterThan(doBruno.proporcao!)
  })

  it('obstaculo_com_peso_dois_conta_em_dobro', async () => {
    const c = await cenario()
    const [primeiro, central, terceiro] = c.obstaculos

    // Máximo só no obstáculo que pesa dois; zero nos outros dois.
    await lancaAvaliacaoDoAluno(banco.db, c.ana.aluno.id, {
      diaId: c.dias[0]!.id,
      obstaculoId: central!.id,
      valor: TETO,
      instrutorId: c.instrutora.id,
    })
    await lancaAvaliacaoDoAluno(banco.db, c.ana.aluno.id, {
      diaId: c.dias[1]!.id,
      obstaculoId: primeiro!.id,
      valor: 0,
      instrutorId: c.instrutora.id,
    })
    await lancaAvaliacaoDoAluno(banco.db, c.ana.aluno.id, {
      diaId: c.dias[2]!.id,
      obstaculoId: terceiro!.id,
      valor: 0,
      instrutorId: c.instrutora.id,
    })

    // Peso total 4, obtido 3×2 = 6, teto 3: 6 / (4 × 3) = 0,5. O mesmo aluno com
    // o máximo num obstáculo de peso 1 teria 3 / (4 × 3) = 0,25 — metade.
    const nota = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(nota.eixos[0]?.proporcao).toBeCloseTo(0.5)

    // Espelho: máximo num obstáculo de peso 1, zero nos outros.
    await lancaTodos(c, c.bruno.aluno.id, 0)
    await lancaAvaliacaoDoAluno(banco.db, c.bruno.aluno.id, {
      diaId: c.dias[0]!.id,
      obstaculoId: primeiro!.id,
      valor: TETO,
      instrutorId: c.instrutora.id,
    })
    const doBruno = await notaDoAluno(banco.db, c.bruno.aluno.id)
    expect(doBruno.eixos[0]?.proporcao).toBeCloseTo(0.25)

    // O peso é DADO: mudar o do obstáculo muda a nota, e é por isso que o
    // Doc 7 §2.4 diz "campo `peso`, não flag de central".
    await banco.db.update(obstaculos).set({ peso: 1 }).where(eq(obstaculos.id, central!.id))
    const semDobro = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(semDobro.eixos[0]?.proporcao).toBeCloseTo(1 / 3)
  })

  it('copiloto_avaliado_pela_defesa_oral', async () => {
    const c = await cenario()

    // Ana vira copiloto e tem notas de obstáculo baixas no histórico.
    await lancaTodos(c, c.ana.aluno.id, 0)
    await banco.db.update(alunos).set({ copiloto: true }).where(eq(alunos.id, c.ana.aluno.id))

    await registraDefesa(
      banco.db,
      c.grupo.id,
      {
        perguntasUsadas: [c.perguntas[0]!.id, c.perguntas[1]!.id],
        notas: [
          { eixoId: c.eixoDoModelo.id, alunoId: c.ana.aluno.id, nivelId: nivel(c, 2).id },
          { eixoId: c.eixoDoModelo.id, alunoId: c.bruno.aluno.id, nivelId: nivel(c, 1).id },
        ],
      },
      c.instrutora.id,
    )

    // O eixo do modelo vem da DEFESA, não do repositório (Doc 6 §9.1). As notas
    // de obstáculo que existirem são ignoradas — não porque valham zero, mas
    // porque a origem da nota dele é outra.
    const daAna = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(daAna.eixos[0]?.proporcao).toBeCloseTo(2 / TETO)
    expect(daAna.eixos[0]?.itens).toBe(0)

    // Bruno não é copiloto: o eixo dele continua vindo dos obstáculos, e a nota
    // da defesa vem ao LADO, sem ser aplicada — o Doc 6 §6 diz que as respostas
    // ajustam sem dizer quanto, e inventar o tamanho seria inventar fato.
    await lancaTodos(c, c.bruno.aluno.id, TETO)
    const doBruno = await notaDoAluno(banco.db, c.bruno.aluno.id)
    expect(doBruno.eixos[0]?.proporcao).toBeCloseTo(1)
    expect(doBruno.eixos[0]?.proporcaoDaDefesa).toBeCloseTo(1 / TETO)
    expect(doBruno.eixos[0]?.itens).toBe(c.obstaculos.length)
  })

  it('copiloto_nao_tem_teto_de_nota', async () => {
    const c = await cenario()

    await banco.db.update(alunos).set({ copiloto: true }).where(eq(alunos.id, c.ana.aluno.id))
    await lancaTodos(c, c.bruno.aluno.id, TETO)
    await incrementoAvaliado(c, TETO)

    await registraDefesa(
      banco.db,
      c.grupo.id,
      {
        perguntasUsadas: [c.perguntas[0]!.id],
        notas: [{ eixoId: c.eixoDoModelo.id, alunoId: c.ana.aluno.id, nivelId: nivel(c, TETO).id }],
      },
      c.instrutora.id,
    )

    const daAna = await notaDoAluno(banco.db, c.ana.aluno.id)
    const doBruno = await notaDoAluno(banco.db, c.bruno.aluno.id)

    // "Sem teto de nota. Um copiloto que responde bem às perguntas entendeu o
    // conteúdo" (Doc 6 §9.1). A copiloto com defesa máxima chega ao mesmo lugar
    // que quem tem repositório e superou tudo.
    expect(daAna.eixos[0]?.proporcao).toBeCloseTo(1)
    expect(daAna.proporcao).toBeCloseTo(doBruno.proporcao!)
    expect(daAna.proporcao).toBeCloseTo(1)
  })

  it('defesa_registra_perguntas_usadas', async () => {
    const c = await cenario()

    await registraDefesa(
      banco.db,
      c.grupo.id,
      { perguntasUsadas: [c.perguntas[2]!.id, c.perguntas[0]!.id], notas: [] },
      c.instrutora.id,
    )

    // Na ordem em que foram feitas. Sem o registro ninguém consegue depois
    // explicar por que a nota de um grupo subiu e a de outro não.
    expect(await perguntasDaDefesaDoGrupo(banco.db, c.grupo.id)).toEqual([
      c.perguntas[2]!.enunciado,
      c.perguntas[0]!.enunciado,
    ])

    // Defesa sem pergunta nenhuma é recusada.
    const [outroGrupo] = await banco.db.insert(grupos).values({ turmaId: c.turma.id }).returning()
    await expect(
      registraDefesa(banco.db, outroGrupo!.id, { perguntasUsadas: [], notas: [] }, c.instrutora.id),
    ).rejects.toThrow(AgregacaoInvalida)

    // Pergunta de outro curso não entra: o banco é do curso da turma.
    const outroCurso = await criaCurso(banco, { nome: 'Outro curso' })
    const [alheia] = await banco.db
      .insert(perguntasDaDefesa)
      .values({ cursoId: outroCurso.id, ordem: 1, enunciado: 'Pergunta de fora?' })
      .returning()

    const cruzada = await registraDefesa(
      banco.db,
      outroGrupo!.id,
      { perguntasUsadas: [alheia!.id], notas: [] },
      c.instrutora.id,
    ).then(
      () => null,
      (e: unknown) => e,
    )
    expect(cruzada).toBeInstanceOf(Error)
    expect(causaDe(cruzada)).toMatch(/e do banco do curso/)
  })

  it('banco_de_perguntas_e_configuravel', async () => {
    const c = await cenario()

    const banco1 = await bancoDePerguntas(banco.db, c.curso.id)
    expect(banco1.map((p) => p.enunciado)).toEqual(c.perguntas.map((p) => p.enunciado))

    // Outro curso, outro banco, outra quantidade — sem tocar em código. As
    // perguntas são conteúdo do curso, e escrevê-las na plataforma seria pôr o
    // roteiro da avaliação dentro do software.
    const outro = await criaCurso(banco, { nome: 'Curso enxuto' })
    await banco.db
      .insert(perguntasDaDefesa)
      .values({ cursoId: outro.id, ordem: 1, enunciado: 'Única pergunta?' })

    const banco2 = await bancoDePerguntas(banco.db, outro.id)
    expect(banco2).toHaveLength(1)
    expect(banco1.length).not.toBe(banco2.length)

    // Pergunta em branco não entra, e a ordem é única no curso.
    await expect(
      banco.db
        .insert(perguntasDaDefesa)
        .values({ cursoId: outro.id, ordem: 2, enunciado: '   ' }),
    ).rejects.toThrow()
    await expect(
      banco.db
        .insert(perguntasDaDefesa)
        .values({ cursoId: outro.id, ordem: 1, enunciado: 'repetida' }),
    ).rejects.toThrow()
  })

  it('nota_invisivel_antes_da_agregacao', async () => {
    const c = await cenario()
    await lancaTodos(c, c.ana.aluno.id, TETO)
    await incrementoAvaliado(c, TETO)

    const comoAna: Ator = { papel: 'aluno', usuarioId: c.ana.usuario.id, grupoId: c.grupo.id }
    const comoInstrutora: Ator = { papel: 'instrutor', usuarioId: c.instrutora.id }

    // Antes do fechamento a aluna não vê. Nota parcial vazando no meio do curso
    // viraria o aluno estudando para o número em vez de para o obstáculo.
    await expect(notaVisivel(banco.db, c.ana.aluno.id, comoAna)).rejects.toThrow(AcessoNegado)

    // O instrutor vê: é ele quem confere antes de fechar.
    const doInstrutor = await notaVisivel(banco.db, c.ana.aluno.id, comoInstrutora)
    expect(doInstrutor?.proporcao).toBeCloseTo(1)

    await finalizaAgregacao(banco.db, c.turma.id, c.instrutora.id)

    const depois = await notaVisivel(banco.db, c.ana.aluno.id, comoAna)
    expect(depois?.proporcao).toBeCloseTo(1)

    // Fechar duas vezes é recusado: a segunda data apagaria a primeira, e o
    // instante do fechamento é o que separa o antes do depois.
    await expect(
      finalizaAgregacao(banco.db, c.turma.id, c.instrutora.id),
    ).rejects.toThrow(AgregacaoInvalida)

    // E fechar é ato do instrutor.
    const [outraTurma] = await banco.db
      .insert(turmas)
      .values({ cursoId: c.curso.id, nome: 'Outra' })
      .returning()
    await expect(
      finalizaAgregacao(banco.db, outraTurma!.id, c.ana.usuario.id),
    ).rejects.toThrow()
  })

  it('eixo_sem_nota_nao_vira_zero', async () => {
    // A diferença que o Doc 6 §0.3 sustenta: a nota é agregação do que foi
    // capturado. Eixo vazio significa que falta capturar, não que o aluno
    // tirou zero — e as duas leituras pedem ações opostas do instrutor.
    const c = await cenario()
    await lancaTodos(c, c.ana.aluno.id, TETO)

    const parcial = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(parcial.completa).toBe(false)
    expect(parcial.eixos[1]?.proporcao).toBeNull()

    // A final sai do que existe, e não é puxada para baixo pelo eixo vazio.
    expect(parcial.proporcao).toBeCloseTo(1)

    await incrementoAvaliado(c, 0)
    const completa = await notaDoAluno(banco.db, c.ana.aluno.id)
    expect(completa.completa).toBe(true)
    expect(completa.proporcao).toBeLessThan(1)

    // E nota de aluno num eixo de grupo é recusada pelo banco: a agregação não
    // saberia onde somá-la, e ela apareceria como diferença inexplicável entre
    // dois integrantes do mesmo par.
    const [defesa] = await banco.db
      .insert(registrosDeDefesa)
      .values({ grupoId: c.grupo.id, registradoPorId: c.instrutora.id })
      .returning()
    const invalida = await banco.db
      .insert(avaliacoesDaDefesa)
      .values({
        registroDeDefesaId: defesa!.id,
        eixoId: c.eixoDaAbsorcao.id,
        alunoId: c.ana.aluno.id,
        nivelId: nivel(c, 2).id,
      })
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(invalida).toBeInstanceOf(Error)
    expect(causaDe(invalida)).toMatch(/apura por grupo e a nota veio com aluno/)
  })
})
