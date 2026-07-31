import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { alunosDaTurma, dadosDoGrupo } from '@/db/grupo'
import {
  alunos,
  bancosDeTemas,
  grupos,
  repositorios,
  temas,
  turmas,
  usuarios,
} from '@/db/schema'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'
import { criaCurso } from './suporte/cenario'

/**
 * A ficha do grupo pede os dados do grupo reunidos, e nenhuma consulta os dava
 * — em especial o `cursoId`, que a ficha precisa para o banco de perguntas da
 * defesa. É consulta nova, então tem teste.
 */
describe('dados do grupo', () => {
  let banco: BancoEfemero

  beforeEach(async () => {
    banco = await criaBancoEfemero()
  })

  afterEach(async () => {
    await banco?.encerra()
  })

  it('reúne curso, tema e integrantes com repositório', async () => {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [bt] = await banco.db
      .insert(bancosDeTemas)
      .values({ cursoId: curso.id, nome: 'Banco' })
      .returning()
    const [tema] = await banco.db
      .insert(temas)
      .values({ bancoDeTemasId: bt!.id, nome: 'Barbearia', dificuldade: 'fácil', trilha: 'padrao' })
      .returning()
    const [grupo] = await banco.db
      .insert(grupos)
      .values({ turmaId: turma!.id, temaId: tema!.id })
      .returning()

    const pessoas = await banco.db
      .insert(usuarios)
      .values([
        { githubUserId: 1, githubLogin: 'ana', nome: 'Ana', papel: 'aluno' },
        { githubUserId: 2, githubLogin: 'bruno', nome: 'Bruno', papel: 'aluno' },
      ])
      .returning()
    const matriculas = await banco.db
      .insert(alunos)
      .values([
        { turmaId: turma!.id, usuarioId: pessoas[0]!.id, grupoId: grupo!.id, posicaoNoGrupo: 1 },
        { turmaId: turma!.id, usuarioId: pessoas[1]!.id, grupoId: grupo!.id, posicaoNoGrupo: 2 },
      ])
      .returning()
    // Só a Ana publicou repositório.
    await banco.db
      .insert(repositorios)
      .values({ alunoId: matriculas[0]!.id, url: 'https://github.com/ana/projeto' })

    const dados = await dadosDoGrupo(banco.db, grupo!.id)

    expect(dados).not.toBeNull()
    expect(dados!.cursoId).toBe(curso.id)
    expect(dados!.tema).toBe('Barbearia')
    // Em ordem de posição, e o repositório de quem tem.
    expect(dados!.integrantes.map((i) => i.nome)).toEqual(['Ana', 'Bruno'])
    expect(dados!.integrantes[0]?.repositorio).toBe('https://github.com/ana/projeto')
    expect(dados!.integrantes[1]?.repositorio).toBeNull()
  })

  it('grupo sem tema devolve tema nulo, não some', async () => {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [grupo] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    const dados = await dadosDoGrupo(banco.db, grupo!.id)
    expect(dados!.tema).toBeNull()
    expect(dados!.integrantes).toEqual([])
  })

  it('grupo inexistente devolve nulo', async () => {
    expect(await dadosDoGrupo(banco.db, crypto.randomUUID())).toBeNull()
  })

  it('alunosDaTurma traz a turma inteira, com nome e em ordem de grupo', async () => {
    const curso = await criaCurso(banco)
    const [turma] = await banco.db
      .insert(turmas)
      .values({ cursoId: curso.id, nome: 'Turma' })
      .returning()
    const [g1] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()
    const [g2] = await banco.db.insert(grupos).values({ turmaId: turma!.id }).returning()

    const pessoas = await banco.db
      .insert(usuarios)
      .values([
        { githubUserId: 10, githubLogin: 'ana', nome: 'Ana', papel: 'aluno' },
        { githubUserId: 11, githubLogin: 'bruno', nome: 'Bruno', papel: 'aluno' },
        { githubUserId: 12, githubLogin: 'carla', nome: 'Carla', papel: 'aluno' },
      ])
      .returning()
    await banco.db.insert(alunos).values([
      { turmaId: turma!.id, usuarioId: pessoas[0]!.id, grupoId: g1!.id, posicaoNoGrupo: 1 },
      { turmaId: turma!.id, usuarioId: pessoas[1]!.id, grupoId: g1!.id, posicaoNoGrupo: 2 },
      { turmaId: turma!.id, usuarioId: pessoas[2]!.id, grupoId: g2!.id, posicaoNoGrupo: 1, copiloto: true },
    ])

    const lista = await alunosDaTurma(banco.db, turma!.id)
    expect(lista).toHaveLength(3)
    // A turma inteira, com nome.
    expect(lista.map((a) => a.nome).sort()).toEqual(['Ana', 'Bruno', 'Carla'])
    // O copiloto vem marcado — a nota dele tem outra origem.
    expect(lista.find((a) => a.nome === 'Carla')?.copiloto).toBe(true)
  })
})
