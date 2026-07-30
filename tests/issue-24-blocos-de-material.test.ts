import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  agregadoDoBloco,
  blocosVisiveis,
  BlocoInvalido,
  laminaComBlocos,
  liberaAgregado,
  respondeBloco,
} from '@/db/bloco-de-material'
import { NaoAutorizado } from '@/db/fila-de-aprovacao'
import { laminasDoDia } from '@/db/material'
import {
  alunos,
  blocosDeMaterial,
  dias,
  materiaisInterativos,
  respostasDeBloco,
  tipoDeBlocoEnum,
  turmas,
  usuarios,
} from '@/db/schema'
import type { Ator } from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 24 em
// docs/BACKLOG.md. SSOT: Doc 11 §10 e §11 · Doc 7 §2.3.

/**
 * O vocabulário fechado do Doc 11 §10, na ordem em que o documento o lista.
 *
 * O teste o repete de propósito: se alguém acrescentar um tipo ao enum sem
 * passar pelo documento-dono, a comparação quebra e a mudança precisa ser
 * defendida.
 */
const TIPOS_DECLARADOS = [
  'tese',
  'mecanismo',
  'conceitos-2x2',
  'ancoragem',
  'codigo-anotado',
  'forcas-limites',
  'matriz-comparativa',
  'predicao',
  'classificador',
] as const

const DIA_DA_LAMINA = 1
const DIA_QUE_REVELA = 4

describe('Issue 24 — tipos de bloco em material interativo', () => {
  let banco: BancoEfemero

  async function cenario() {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()

    const diasCriados = await banco.db
      .insert(dias)
      .values([DIA_DA_LAMINA, 2, 3, DIA_QUE_REVELA].map((ordem) => ({ cursoId: curso.id, ordem })))
      .returning()

    const [lamina] = await banco.db
      .insert(materiaisInterativos)
      .values({
        diaId: diasCriados[0]!.id,
        ordem: 1,
        titulo: 'Abertura',
        conteudo: '# Abertura\n\nO que este módulo é.',
      })
      .returning()

    // Uma lâmina sem bloco nenhum: material de antes desta issue.
    const [laminaSemBlocos] = await banco.db
      .insert(materiaisInterativos)
      .values({
        diaId: diasCriados[0]!.id,
        ordem: 2,
        titulo: 'Como o dia funciona',
        conteudo: '# Ritmo do dia\n\nOs blocos, e por que a ordem importa.',
      })
      .returning()

    const [instrutora] = await banco.db
      .insert(usuarios)
      .values({ githubUserId: 2401, githubLogin: 'instrutora', nome: 'Instrutora', papel: 'instrutor' })
      .returning()

    // Sem grupo: o bloco interativo é respondido por ALUNO, e alocar os três num
    // grupo só faria o teto de tamanho do curso entrar numa história que não é
    // esta. Aluno sem grupo é estado válido (Doc 2 §2.4.1).
    const pessoas = []
    for (const [i, nome] of ['Ana', 'Bruno', 'Carla'].entries()) {
      const [usuario] = await banco.db
        .insert(usuarios)
        .values({ githubUserId: 2410 + i, githubLogin: nome.toLowerCase(), nome, papel: 'aluno' })
        .returning()
      const [aluno] = await banco.db
        .insert(alunos)
        .values({ turmaId: turma!.id, usuarioId: usuario!.id })
        .returning()
      pessoas.push({ aluno: aluno!, usuario: usuario! })
    }

    return {
      curso,
      turma: turma!,
      dias: diasCriados,
      lamina: lamina!,
      laminaSemBlocos: laminaSemBlocos!,
      instrutora: instrutora!,
      ana: pessoas[0]!,
      bruno: pessoas[1]!,
      carla: pessoas[2]!,
    }
  }

  function comoAluno(c: Awaited<ReturnType<typeof cenario>>, quem: 'ana' | 'bruno' | 'carla') {
    const ator: Ator = { papel: 'aluno', usuarioId: c[quem].usuario.id, grupoId: null }
    return { ator, alunoId: c[quem].aluno.id }
  }

  function comoInstrutora(c: Awaited<ReturnType<typeof cenario>>): Ator {
    return { papel: 'instrutor', usuarioId: c.instrutora.id }
  }

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('bloco_tem_tipo_de_vocabulario_fechado', async () => {
    const c = await cenario()

    // O enum é exatamente o vocabulário do Doc 11 §10, que é SSOT — a plataforma
    // renderiza o tipo, não o define.
    expect([...tipoDeBlocoEnum.enumValues]).toEqual([...TIPOS_DECLARADOS])

    // Todos são cadastráveis.
    await banco.db.insert(blocosDeMaterial).values(
      TIPOS_DECLARADOS.map((tipo, i) => ({
        materialInterativoId: c.lamina.id,
        ordem: i + 1,
        tipo,
        conteudo: `Conteúdo do bloco ${tipo}.`,
      })),
    )

    const blocos = await blocosVisiveis(banco.db, c.lamina.id, comoInstrutora(c), {
      ordemDoDiaCorrente: DIA_DA_LAMINA,
      alunoId: null,
    })
    expect(blocos.map((b) => b.tipo)).toEqual([...TIPOS_DECLARADOS])

    // Nenhum nome de tipo menciona conceito de curso: são formas de lâmina, e
    // servem a qualquer módulo.
    const proibidos = /\b(poo|c#|csharp|parede|dupla|python|biblioteca)\b/i
    for (const tipo of TIPOS_DECLARADOS) {
      expect(tipo).not.toMatch(proibidos)
    }

    // Conteúdo vazio não entra: bloco sem conteúdo é lâmina em branco no meio
    // da apresentação.
    await expect(
      banco.db.insert(blocosDeMaterial).values({
        materialInterativoId: c.lamina.id,
        ordem: 99,
        tipo: 'tese',
        conteudo: '   ',
      }),
    ).rejects.toThrow()
  })

  it('rejeita_tipo_de_bloco_desconhecido', async () => {
    const c = await cenario()

    // O vocabulário é fechado no BANCO, não só no TypeScript: um tipo inventado
    // por script, seed ou adaptador futuro é recusado do mesmo jeito.
    for (const inventado of ['quiz', 'video', 'TESE', 'predicao ']) {
      await expect(
        banco.db.insert(blocosDeMaterial).values({
          materialInterativoId: c.lamina.id,
          ordem: 1,
          tipo: inventado as never,
          conteudo: 'conteúdo',
        }),
      ).rejects.toThrow()
    }

    expect(await banco.db.select().from(blocosDeMaterial)).toHaveLength(0)
  })

  it('blocos_respeitam_ordem', async () => {
    const c = await cenario()

    // Inseridos fora de ordem de propósito.
    await banco.db.insert(blocosDeMaterial).values([
      { materialInterativoId: c.lamina.id, ordem: 3, tipo: 'forcas-limites', conteudo: 'Terceiro.' },
      { materialInterativoId: c.lamina.id, ordem: 1, tipo: 'tese', conteudo: 'Primeiro.' },
      { materialInterativoId: c.lamina.id, ordem: 2, tipo: 'mecanismo', conteudo: 'Segundo.' },
    ])

    const blocos = await blocosVisiveis(banco.db, c.lamina.id, comoInstrutora(c), {
      ordemDoDiaCorrente: DIA_DA_LAMINA,
      alunoId: null,
    })
    expect(blocos.map((b) => b.ordem)).toEqual([1, 2, 3])
    expect(blocos.map((b) => b.conteudo)).toEqual(['Primeiro.', 'Segundo.', 'Terceiro.'])

    // A ordem é única na lâmina: duas lâminas na mesma posição fariam a
    // apresentação mudar de sequência entre dois carregamentos, e "nenhum slide
    // avança sozinho" (Doc 11 §11) pressupõe uma sequência estável.
    await expect(
      banco.db.insert(blocosDeMaterial).values({
        materialInterativoId: c.lamina.id,
        ordem: 1,
        tipo: 'ancoragem',
        conteudo: 'Repetido.',
      }),
    ).rejects.toThrow()

    // Ordem zero também não: a contagem começa em um, como em todo o resto.
    await expect(
      banco.db.insert(blocosDeMaterial).values({
        materialInterativoId: c.lamina.id,
        ordem: 0,
        tipo: 'ancoragem',
        conteudo: 'Zero.',
      }),
    ).rejects.toThrow()
  })

  it('material_sem_blocos_permanece_valido', async () => {
    const c = await cenario()

    // A lâmina de antes desta issue continua existindo e continua sendo servida
    // pelo próprio conteúdo. O Doc 7 v1.4 registra a mudança como "adição, nada
    // removido nem renomeado".
    const antigas = await laminasDoDia(banco.db, c.dias[0]!.id)
    expect(antigas).toHaveLength(2)

    const semBlocos = await laminaComBlocos(banco.db, c.laminaSemBlocos.id, comoInstrutora(c), {
      ordemDoDiaCorrente: DIA_DA_LAMINA,
      alunoId: null,
    })
    expect(semBlocos?.titulo).toBe('Como o dia funciona')
    expect(semBlocos?.conteudo).toContain('Ritmo do dia')
    expect(semBlocos?.blocos).toEqual([])

    // E acrescentar bloco a uma lâmina não mexe na outra.
    await banco.db.insert(blocosDeMaterial).values({
      materialInterativoId: c.lamina.id,
      ordem: 1,
      tipo: 'tese',
      conteudo: 'Uma tese.',
    })

    expect(
      (
        await laminaComBlocos(banco.db, c.laminaSemBlocos.id, comoInstrutora(c), {
          ordemDoDiaCorrente: DIA_DA_LAMINA,
          alunoId: null,
        })
      )?.blocos,
    ).toEqual([])
    expect(
      (
        await laminaComBlocos(banco.db, c.lamina.id, comoInstrutora(c), {
          ordemDoDiaCorrente: DIA_DA_LAMINA,
          alunoId: null,
        })
      )?.blocos,
    ).toHaveLength(1)
  })

  it('predicao_registra_resposta_por_aluno', async () => {
    const c = await cenario()

    const [bloco] = await banco.db
      .insert(blocosDeMaterial)
      .values({
        materialInterativoId: c.lamina.id,
        ordem: 1,
        tipo: 'predicao',
        conteudo: 'Qual das quatro abordagens você acha que vai ficar mais curta?',
        conteudoRevelado: 'A terceira, e o motivo é a estrutura, não o tamanho.',
      })
      .returning()

    const ana = comoAluno(c, 'ana')
    const bruno = comoAluno(c, 'bruno')

    await respondeBloco(banco.db, bloco!.id, ana.alunoId, 'Primeira', c.ana.usuario.id)
    await respondeBloco(banco.db, bloco!.id, bruno.alunoId, 'Terceira', c.bruno.usuario.id)

    // Por ALUNO: as duas respostas coexistem, e é isso que faz delas insumo da
    // retrospectiva do último dia (Doc 11 §11).
    const gravadas = await banco.db.select().from(respostasDeBloco)
    expect(gravadas).toHaveLength(2)
    expect(new Set(gravadas.map((r) => r.alunoId)).size).toBe(2)

    // Reescrever é permitido: a aula é presencial, o aluno erra o clique, e
    // travar a primeira resposta transformaria um engano em dado.
    await respondeBloco(banco.db, bloco!.id, ana.alunoId, 'Segunda', c.ana.usuario.id)
    expect(await banco.db.select().from(respostasDeBloco)).toHaveLength(2)
    const daAna = gravadas.find((r) => r.alunoId === ana.alunoId)
    expect(daAna).toBeDefined()

    // Resposta é produção própria: ninguém responde pelo colega.
    await expect(
      respondeBloco(banco.db, bloco!.id, bruno.alunoId, 'Quarta', c.ana.usuario.id),
    ).rejects.toThrow()

    // Vazia não entra.
    await expect(
      respondeBloco(banco.db, bloco!.id, ana.alunoId, '   ', c.ana.usuario.id),
    ).rejects.toThrow(BlocoInvalido)
  })

  it('agregado_visivel_apenas_apos_liberacao', async () => {
    const c = await cenario()

    const [bloco] = await banco.db
      .insert(blocosDeMaterial)
      .values({
        materialInterativoId: c.lamina.id,
        ordem: 1,
        tipo: 'predicao',
        conteudo: 'Qual você acha que fica mais curta?',
      })
      .returning()

    const ana = comoAluno(c, 'ana')
    await respondeBloco(banco.db, bloco!.id, ana.alunoId, 'Terceira', c.ana.usuario.id)
    await respondeBloco(
      banco.db,
      bloco!.id,
      comoAluno(c, 'bruno').alunoId,
      'Terceira',
      c.bruno.usuario.id,
    )
    await respondeBloco(
      banco.db,
      bloco!.id,
      comoAluno(c, 'carla').alunoId,
      'Primeira',
      c.carla.usuario.id,
    )

    // Antes da liberação o aluno recebe NULO, não um agregado vazio — vazio ele
    // leria como "ninguém respondeu". Mostrar antes faria o aluno responder
    // olhando a maioria, e a predição deixaria de medir predição.
    expect(await agregadoDoBloco(banco.db, bloco!.id, ana.ator)).toBeNull()

    // O instrutor vê antes: é ele quem decide o momento, e para decidir precisa
    // saber o que vai aparecer.
    const doInstrutor = await agregadoDoBloco(banco.db, bloco!.id, comoInstrutora(c))
    expect(doInstrutor?.respondentes).toBe(3)
    expect(doInstrutor?.distribuicao[0]).toMatchObject({ resposta: 'Terceira', quantidade: 2 })

    await liberaAgregado(banco.db, bloco!.id, c.instrutora.id)

    const depois = await agregadoDoBloco(banco.db, bloco!.id, ana.ator)
    expect(depois?.respondentes).toBe(3)
    expect(depois?.distribuicao.map((d) => d.resposta)).toEqual(['Terceira', 'Primeira'])

    // Liberar é ato do instrutor, e liberar duas vezes é recusado: a segunda
    // data apagaria o instante em que a turma passou a ver.
    await expect(liberaAgregado(banco.db, bloco!.id, c.ana.usuario.id)).rejects.toThrow(
      NaoAutorizado,
    )
    await expect(liberaAgregado(banco.db, bloco!.id, c.instrutora.id)).rejects.toThrow(
      BlocoInvalido,
    )
  })

  it('classificador_revela_apos_submissao', async () => {
    const c = await cenario()

    const [bloco] = await banco.db
      .insert(blocosDeMaterial)
      .values({
        materialInterativoId: c.lamina.id,
        ordem: 1,
        tipo: 'classificador',
        conteudo: 'Distribua os oito trechos entre os quatro alvos.',
        conteudoRevelado: 'O terceiro trecho é do segundo alvo, e é o que mais engana.',
      })
      .returning()

    const ana = comoAluno(c, 'ana')
    const bruno = comoAluno(c, 'bruno')

    const contexto = { ordemDoDiaCorrente: DIA_DA_LAMINA, alunoId: ana.alunoId }

    // Antes de responder, o revelado não vem. A plataforma segura o texto sem
    // saber o que ele diz — validar semanticamente está fora de escopo.
    const antes = await blocosVisiveis(banco.db, c.lamina.id, ana.ator, contexto)
    expect(antes[0]?.conteudo).toContain('Distribua')
    expect(antes[0]?.conteudoRevelado).toBeNull()
    expect(antes[0]?.respondido).toBe(false)

    await respondeBloco(banco.db, bloco!.id, ana.alunoId, '1→A, 2→B, 3→B', c.ana.usuario.id)

    const depois = await blocosVisiveis(banco.db, c.lamina.id, ana.ator, contexto)
    expect(depois[0]?.respondido).toBe(true)
    expect(depois[0]?.conteudoRevelado).toContain('mais engana')

    // A revelação é de quem respondeu, e só dele: Bruno continua sem ver mesmo
    // com Ana tendo respondido.
    const doBruno = await blocosVisiveis(banco.db, c.lamina.id, bruno.ator, {
      ordemDoDiaCorrente: DIA_DA_LAMINA,
      alunoId: bruno.alunoId,
    })
    expect(doBruno[0]?.respondido).toBe(false)
    expect(doBruno[0]?.conteudoRevelado).toBeNull()

    // O instrutor vê sempre: é ele quem conduz a revelação.
    const daInstrutora = await blocosVisiveis(banco.db, c.lamina.id, comoInstrutora(c), {
      ordemDoDiaCorrente: DIA_DA_LAMINA,
      alunoId: null,
    })
    expect(daInstrutora[0]?.conteudoRevelado).toContain('mais engana')
  })

  it('bloco_oculto_ate_o_dia', async () => {
    const c = await cenario()

    await banco.db.insert(blocosDeMaterial).values([
      { materialInterativoId: c.lamina.id, ordem: 1, tipo: 'tese', conteudo: 'Visível sempre.' },
      {
        materialInterativoId: c.lamina.id,
        ordem: 2,
        tipo: 'conceitos-2x2',
        conteudo: 'Só depois.',
        ocultoAteDiaId: c.dias[3]!.id,
      },
    ])

    const ana = comoAluno(c, 'ana')

    // Antes do dia, o bloco não vem — e não vem da CONSULTA, não da tela.
    // Mostrado cedo, ele entrega a descoberta que um obstáculo posterior existe
    // para produzir (Doc 11 §12).
    const cedo = await blocosVisiveis(banco.db, c.lamina.id, ana.ator, {
      ordemDoDiaCorrente: DIA_DA_LAMINA,
      alunoId: ana.alunoId,
    })
    expect(cedo).toHaveLength(1)
    expect(JSON.stringify(cedo)).not.toContain('Só depois')

    // No dia, aparece.
    const noDia = await blocosVisiveis(banco.db, c.lamina.id, ana.ator, {
      ordemDoDiaCorrente: DIA_QUE_REVELA,
      alunoId: ana.alunoId,
    })
    expect(noDia).toHaveLength(2)
    expect(noDia[1]?.conteudo).toBe('Só depois.')

    // Depois também: o atraso protege o dia da descoberta, não os seguintes.
    expect(
      await blocosVisiveis(banco.db, c.lamina.id, ana.ator, {
        ordemDoDiaCorrente: DIA_QUE_REVELA + 5,
        alunoId: ana.alunoId,
      }),
    ).toHaveLength(2)

    // O instrutor vê antes: é ele quem prepara a aula.
    expect(
      await blocosVisiveis(banco.db, c.lamina.id, comoInstrutora(c), {
        ordemDoDiaCorrente: DIA_DA_LAMINA,
        alunoId: null,
      }),
    ).toHaveLength(2)

    // O filtro é de consulta: o módulo não decide visibilidade em memória depois
    // de trazer tudo.
    const fonte = readFileSync('src/db/bloco-de-material.ts', 'utf8')
    expect(fonte).toMatch(/lte\(dias\.ordem/)
  })
})
