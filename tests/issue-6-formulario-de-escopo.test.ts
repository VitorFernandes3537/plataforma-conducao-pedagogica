import { readFileSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { formularioDoCurso, perguntasDoFormularioEmOrdem } from '@/db/formulario'
import { abreRascunho, estadoDaTraducao, respostaDoGrupo } from '@/db/resposta-de-escopo'
import {
  alunos,
  estruturas,
  formularios,
  grupos,
  linhasDeTraducao,
  papeisDaEstrutura,
  perguntasDoFormulario,
  respostasDeEscopo,
  turmas,
  usuarios,
} from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

// Nomes vindos literalmente dos critérios de aceite da issue 6 em
// docs/BACKLOG.md. SSOT: `D2-CONTRATO` · Doc 2 §4.2 · Doc 7 §2.2.

function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
}

describe('Issue 6 — FormularioDeEscopo configurável', () => {
  let banco: BancoEfemero

  /** Curso com formulário de duas perguntas, uma turma e um grupo de dois. */
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
    const perguntas = await banco.db
      .insert(perguntasDoFormulario)
      .values([
        { formularioId: formulario!.id, ordem: 1, enunciado: 'Primeira', criterioDeAceite: 'a' },
        { formularioId: formulario!.id, ordem: 2, enunciado: 'Segunda', criterioDeAceite: 'b' },
      ])
      .returning()

    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    const pessoas = await banco.db
      .insert(usuarios)
      .values([
        { githubUserId: 1, githubLogin: 'ana', nome: 'Ana', papel: 'aluno' },
        { githubUserId: 2, githubLogin: 'bruno', nome: 'Bruno', papel: 'aluno' },
      ])
      .returning()
    await banco.db.insert(alunos).values(
      pessoas.map((p, indice) => ({
        turmaId: turma!.id,
        usuarioId: p.id,
        grupoId: grupo!.id,
        posicaoNoGrupo: indice + 1,
      })),
    )

    return { curso, turma: turma!, formulario: formulario!, perguntas, grupo: grupo! }
  }

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

  it('resposta_de_escopo_pertence_ao_grupo', async () => {
    const { formulario, grupo, turma } = await cenario()

    const rascunho = await abreRascunho(banco.db, grupo.id, formulario.id)

    // Doc 7 §2.2: `RespostaDeEscopo` pendura em Grupo. A prova ESTRUTURAL é que
    // a tabela não tem coluna de aluno — se um dia alguém acrescentar, este
    // teste cai antes de a unidade de avaliação derivar.
    const colunas = Object.keys(respostasDeEscopo)
    expect(colunas).toContain('grupoId')
    expect(colunas).not.toContain('alunoId')
    expect(colunas).not.toContain('usuarioId')

    // Um contrato por grupo, entregue uma vez (Doc 2 §4.2). Os dois integrantes
    // abrem o MESMO rascunho — chamar de novo não cria um segundo.
    const deNovo = await abreRascunho(banco.db, grupo.id, formulario.id)
    expect(deNovo.id).toBe(rascunho.id)
    expect(await banco.db.select().from(respostasDeEscopo)).toHaveLength(1)

    // E o banco recusa a segunda resposta mesmo por escrita direta.
    await expect(
      banco.db.insert(respostasDeEscopo).values({ grupoId: grupo.id, formularioId: formulario.id }),
    ).rejects.toThrow()

    const doGrupo = await respostaDoGrupo(banco.db, grupo.id)
    expect(doGrupo?.grupoId).toBe(grupo.id)
    expect(doGrupo?.submetidoEm).toBeNull()
    expect(doGrupo?.respostas).toHaveLength(0)

    // Grupo sem rascunho devolve null, não erro.
    const [outroGrupo] = await banco.db.insert(grupos).values({ turmaId: turma.id }).returning()
    expect(await respostaDoGrupo(banco.db, outroGrupo!.id)).toBeNull()
  })
  it('tabela_de_traducao_cobre_todos_os_papeis', async () => {
    const { curso, formulario, grupo } = await cenario()
    const rascunho = await abreRascunho(banco.db, grupo.id, formulario.id)

    // Quantos papéis a estrutura tem é CONFIGURAÇÃO. Três obrigatórios e um
    // opcional, e nenhum desses números aparece no código.
    const [estrutura] = await banco.db
      .insert(estruturas)
      .values({ cursoId: curso.id, nome: 'Estrutura do curso' })
      .returning()
    const papeis = await banco.db
      .insert(papeisDaEstrutura)
      .values([
        { estruturaId: estrutura!.id, ordem: 1, nome: 'Solicitante', obrigatorio: true },
        { estruturaId: estrutura!.id, ordem: 2, nome: 'Atendimento', obrigatorio: true },
        { estruturaId: estrutura!.id, ordem: 3, nome: 'Recurso escasso', obrigatorio: true },
        { estruturaId: estrutura!.id, ordem: 4, nome: 'Observação', obrigatorio: false },
      ])
      .returning()

    // Nada preenchido: os três obrigatórios faltam, e a ordem da estrutura é
    // respeitada para o aluno saber por onde começar.
    const vazia = await estadoDaTraducao(banco.db, rascunho.id, curso.id)
    expect(vazia.completa).toBe(false)
    expect(vazia.faltando.map((p) => p.nome)).toEqual([
      'Solicitante',
      'Atendimento',
      'Recurso escasso',
    ])

    // Preenche dois dos três: continua incompleta, e diz qual falta.
    await banco.db.insert(linhasDeTraducao).values([
      {
        respostaDeEscopoId: rascunho.id,
        papelId: papeis[0]!.id,
        nomeNoNegocio: 'Cliente',
        nomeNoCodigo: 'Cliente',
      },
      {
        respostaDeEscopoId: rascunho.id,
        papelId: papeis[1]!.id,
        nomeNoNegocio: 'Corte',
        nomeNoCodigo: 'Atendimento',
      },
    ])

    const parcial = await estadoDaTraducao(banco.db, rascunho.id, curso.id)
    expect(parcial.completa).toBe(false)
    expect(parcial.faltando.map((p) => p.nome)).toEqual(['Recurso escasso'])

    // Preenche o terceiro obrigatório: completa, SEM o opcional.
    await banco.db.insert(linhasDeTraducao).values({
      respostaDeEscopoId: rascunho.id,
      papelId: papeis[2]!.id,
      nomeNoNegocio: 'Cadeira',
      nomeNoCodigo: 'Recurso',
    })

    const completa = await estadoDaTraducao(banco.db, rascunho.id, curso.id)
    expect(completa.completa).toBe(true)
    expect(completa.faltando).toHaveLength(0)

    // Duas linhas para o mesmo papel não existem.
    await expect(
      banco.db.insert(linhasDeTraducao).values({
        respostaDeEscopoId: rascunho.id,
        papelId: papeis[0]!.id,
        nomeNoNegocio: 'Outro',
        nomeNoCodigo: 'Outro',
      }),
    ).rejects.toThrow()

    // Nenhuma contagem de papéis no código — quatro é a estrutura deste curso.
    const fonte = semComentarios(readFileSync('src/db/resposta-de-escopo.ts', 'utf8'))
    expect(fonte).not.toMatch(/4|quatro/i)
  })
})
