import { existsSync, readFileSync } from 'node:fs'

import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { alunos, cursos, turmas, usuarios } from '@/db/schema'
import { matriculaEmLote } from '@/db/matricula'
import {
  AcessoNegado,
  ehRotaDeInstrutor,
  exigeAcesso,
  podeVer,
  type Ator,
} from '@/domain/autorizacao'

import { criaBancoEfemero, type BancoEfemero } from './suporte/banco-efemero'

// Nomes vindos literalmente dos critérios de aceite da INFRA-2 em
// docs/BACKLOG.md. SSOT: Doc 7 §3 (papéis).

const instrutor: Ator = { papel: 'instrutor', usuarioId: 'u-instrutor' }
const aluno: Ator = { papel: 'aluno', usuarioId: 'u-aluno', grupoId: 'g-1' }
const alunoSemGrupo: Ator = { papel: 'aluno', usuarioId: 'u-solto', grupoId: null }

describe('INFRA-2 — autenticação e papéis', () => {
  it('instrutor_acessa_rotas_de_instrutor', () => {
    expect(podeVer(instrutor, { tipo: 'rota-de-instrutor' })).toBe(true)
    expect(() => exigeAcesso(instrutor, { tipo: 'rota-de-instrutor' })).not.toThrow()

    // Doc 7 §3: "Instrutor — Tudo." Inclusive o que é negado ao aluno.
    expect(podeVer(instrutor, { tipo: 'avaliacao', grupoId: 'g-outro' })).toBe(true)
    expect(podeVer(instrutor, { tipo: 'incremento', liberado: false })).toBe(true)
    expect(podeVer(instrutor, { tipo: 'nota', agregacaoFinalizada: false })).toBe(true)
  })

  it('aluno_nao_acessa_rotas_de_instrutor', () => {
    expect(podeVer(aluno, { tipo: 'rota-de-instrutor' })).toBe(false)

    let capturado: unknown
    try {
      exigeAcesso(aluno, { tipo: 'rota-de-instrutor' })
    } catch (e) {
      capturado = e
    }
    expect(capturado).toBeInstanceOf(AcessoNegado)
    expect((capturado as AcessoNegado).status).toBe(403)

    // O prefixo protege rota nova sem cadastro. Uma lista de rotas
    // protegidas falharia em silêncio ao esquecer de incluir uma.
    expect(ehRotaDeInstrutor('/instrutor')).toBe(true)
    expect(ehRotaDeInstrutor('/instrutor/turmas/1/aprovacoes')).toBe(true)
    expect(ehRotaDeInstrutor('/mural')).toBe(false)
    // Não se deixa enganar por prefixo parcial.
    expect(ehRotaDeInstrutor('/instrutores-publico')).toBe(false)
  })

  it('aluno_nao_ve_avaliacao_de_outro_grupo', () => {
    expect(podeVer(aluno, { tipo: 'avaliacao', grupoId: 'g-1' })).toBe(true)
    expect(podeVer(aluno, { tipo: 'avaliacao', grupoId: 'g-2' })).toBe(false)
    // Aluno ainda sem grupo não herda acesso a grupo nenhum.
    expect(podeVer(alunoSemGrupo, { tipo: 'avaliacao', grupoId: 'g-1' })).toBe(false)
  })

  it('aluno_nao_ve_incremento_antes_da_liberacao', () => {
    expect(podeVer(aluno, { tipo: 'incremento', liberado: false })).toBe(false)
    expect(podeVer(aluno, { tipo: 'incremento', liberado: true })).toBe(true)
  })

  it('protecao_de_rota_usa_proxy_e_nao_middleware', () => {
    // No Next 16 um `middleware.ts` remanescente não gera erro de build: ele
    // apenas não roda, e toda rota de instrutor vira pública em silêncio
    // (ADR 0002 §7). Nenhum outro teste pegaria isso.
    expect(existsSync('src/proxy.ts')).toBe(true)
    expect(existsSync('src/middleware.ts')).toBe(false)
    expect(existsSync('middleware.ts')).toBe(false)

    const proxy = readFileSync('src/proxy.ts', 'utf8')
    expect(proxy).toMatch(/export async function proxy\(/)
    // O runtime não é configurável no proxy do Next 16 — declará-lo quebra o build.
    expect(proxy).not.toMatch(/runtime:\s*['"]nodejs['"]/)
  })

  it('aluno_nao_ve_nota_antes_da_agregacao', () => {
    expect(podeVer(aluno, { tipo: 'nota', agregacaoFinalizada: false })).toBe(false)
    expect(podeVer(aluno, { tipo: 'nota', agregacaoFinalizada: true })).toBe(true)
  })

  describe('matrícula', () => {
    let banco: BancoEfemero

    beforeEach(async () => {
      banco = await criaBancoEfemero()
    })

    afterEach(async () => {
      await banco?.encerra()
    })

    it('instrutor_cria_alunos_em_lote', async () => {
      const [curso] = await banco.db
        .insert(cursos)
        .values({ nome: 'Curso', tamanhoMaximoDeGrupo: 2 })
        .returning()
      const [turma] = await banco.db
        .insert(turmas)
        .values({ cursoId: curso!.id, nome: 'Turma' })
        .returning()

      const lista = [
        { githubUserId: 101, githubLogin: 'ana', nome: 'Ana' },
        { githubUserId: 102, githubLogin: 'bruno', nome: 'Bruno' },
        { githubUserId: 103, githubLogin: 'carla', nome: 'Carla' },
      ]

      const { matriculados } = await matriculaEmLote(banco.db, turma!.id, lista)
      expect(matriculados).toBe(3)

      const naTurma = await banco.db.select().from(alunos).where(eq(alunos.turmaId, turma!.id))
      expect(naTurma).toHaveLength(3)

      // Nenhuma coluna de e-mail ou senha: não há o que confirmar.
      const pessoas = await banco.db.select().from(usuarios)
      expect(pessoas).toHaveLength(3)
      expect(pessoas.every((p) => p.papel === 'aluno')).toBe(true)
      expect(Object.keys(pessoas[0]!)).not.toContain('email')
      expect(Object.keys(pessoas[0]!)).not.toContain('senha')

      // Rodar de novo com login atualizado não duplica pessoa.
      const repetido = await matriculaEmLote(banco.db, turma!.id, [
        { githubUserId: 101, githubLogin: 'ana-nova', nome: 'Ana' },
        ...lista.slice(1),
      ])
      expect(repetido.matriculados).toBe(3)
      expect(await banco.db.select().from(usuarios)).toHaveLength(3)

      const [ana] = await banco.db
        .select()
        .from(usuarios)
        .where(eq(usuarios.githubUserId, 101))
      expect(ana!.githubLogin).toBe('ana-nova')
    })

    it('rematricula_nao_rebaixa_instrutor_a_aluno', async () => {
      const [curso] = await banco.db
        .insert(cursos)
        .values({ nome: 'Curso', tamanhoMaximoDeGrupo: 2 })
        .returning()
      const [turma] = await banco.db
        .insert(turmas)
        .values({ cursoId: curso!.id, nome: 'Turma' })
        .returning()

      await banco.db
        .insert(usuarios)
        .values({ githubUserId: 900, githubLogin: 'chefe', nome: 'Chefe', papel: 'instrutor' })

      await matriculaEmLote(banco.db, turma!.id, [
        { githubUserId: 900, githubLogin: 'chefe', nome: 'Chefe' },
      ])

      const [pessoa] = await banco.db
        .select()
        .from(usuarios)
        .where(eq(usuarios.githubUserId, 900))
      expect(pessoa!.papel).toBe('instrutor')
    })
  })
})
