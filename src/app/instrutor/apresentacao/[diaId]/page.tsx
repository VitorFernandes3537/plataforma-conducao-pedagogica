import { notFound, redirect } from 'next/navigation'

import {
  Apresentacao,
  type BlocoDaLamina,
  type LaminaDaApresentacao,
} from '@/components/instrutor/apresentacao'
import type { TipoDeBloco } from '@/components/material/blocos'
import { ReguaDoDia } from '@/components/regua-do-dia'
import { AusenciaDeclarada, Cabecalho, Casca, Etiqueta } from '@/components/ui'
import { db } from '@/db'
import { agregadoDoBloco, laminaComBlocos } from '@/db/bloco-de-material'
import { blocosDoDia, diaPorId } from '@/db/calendario'
import { laminasDoDia } from '@/db/material'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Apresentação — PCP' }

/**
 * O modo apresentação do material de um dia.
 *
 * Serve o momento do D1 que o Doc 4 §3 orça e a ADR 0006 §4 lista: o instrutor
 * conduz o material bloco a bloco, com a turma na sala. É a tela que a ADR 0006
 * §8 deixou explicitamente sem desenho de interação — o desenho está no
 * componente, e a decisão é uma só: **nada avança sozinho** (Doc 11 §11).
 *
 * É endereçada por DIA e não por turma. O material é do curso, e o mesmo dia
 * serve todas as turmas que o rodam — amarrar a apresentação a uma turma faria o
 * instrutor escolher turma para abrir um slide.
 *
 * O que a tela **não** decide: o que o aluno vê. O bloco oculto até um dia, o
 * conteúdo revelado e o agregado não liberado são filtrados pela consulta, com o
 * ator na mão. Aqui o ator é instrutor e ele vê tudo — inclusive o agregado
 * antes de liberar, porque para decidir a hora de mostrar ele precisa saber o
 * que vai aparecer.
 */
export default async function ApresentacaoDoDia({
  params,
}: {
  params: Promise<{ diaId: string }>
}) {
  const { diaId } = await params

  const sessao = await auth()
  if (!sessao?.usuarioId) redirect(`/entrar?callbackUrl=/instrutor/apresentacao/${diaId}`)

  const banco = db()
  const dia = await diaPorId(banco, diaId)
  if (!dia) notFound()

  const ator = { papel: 'instrutor' as const, usuarioId: sessao.usuarioId }
  const [lista, blocosDaRegua] = await Promise.all([
    laminasDoDia(banco, diaId),
    blocosDoDia(banco, diaId),
  ])

  const laminas: LaminaDaApresentacao[] = []
  for (const resumo of lista) {
    const completa = await laminaComBlocos(banco, resumo.id, ator, {
      ordemDoDiaCorrente: dia.ordem,
      alunoId: null,
    })
    if (!completa) continue

    const blocos: BlocoDaLamina[] = []
    for (const bloco of completa.blocos) {
      // O agregado só existe para bloco que registra resposta. Pedir para os
      // outros seria uma consulta por lâmina para receber lista vazia.
      const registraResposta = bloco.tipo === 'predicao' || bloco.tipo === 'classificador'
      blocos.push({
        id: bloco.id,
        tipo: bloco.tipo as TipoDeBloco,
        conteudo: bloco.conteudo,
        conteudoRevelado: bloco.conteudoRevelado,
        agregadoLiberado: bloco.agregadoLiberado,
        agregado: registraResposta ? await agregadoDoBloco(banco, bloco.id, ator) : null,
      })
    }

    laminas.push({
      id: resumo.id,
      titulo: completa.titulo,
      conteudo: completa.conteudo,
      blocos,
    })
  }

  return (
    <Casca
      medida="cheia"
      regua={
        blocosDaRegua.length > 0 ? (
          <ReguaDoDia
            blocos={blocosDaRegua}
            blocoCorrente={null}
            marco={dia.marco ?? undefined}
            dia={dia.ordem}
            contexto="apresentação"
          />
        ) : undefined
      }
    >
      <Cabecalho
        legenda={`Dia ${dia.ordem}`}
        titulo="Conduzir o material"
        acoes={
          dia.marco ? (
            <Etiqueta tom="portao" tracejada={dia.marco.tipo === 'triagem'}>
              {dia.marco.nome}
            </Etiqueta>
          ) : undefined
        }
      >
        Você conduz o ritmo. Nenhuma lâmina avança sozinha, e o agregado da turma
        só aparece para ela quando você liberar.
      </Cabecalho>

      {laminas.length === 0 ? (
        <AusenciaDeclarada legenda="Material do dia">
          Este dia não tem lâmina cadastrada. O material é configuração do curso,
          e a plataforma não gera conteúdo — ela conduz o que já existe.
        </AusenciaDeclarada>
      ) : (
        <Apresentacao laminas={laminas} diaId={diaId} />
      )}
    </Casca>
  )
}
