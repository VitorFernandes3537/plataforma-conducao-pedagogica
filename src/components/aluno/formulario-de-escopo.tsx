'use client'

import { useState, useTransition } from 'react'

import { Aviso, Botao, Campo, CampoDeProsa, Cartao, ErroDaAcao, Etiqueta } from '@/components/ui'
import type { AvisoDeErro } from '@/lib/erros'

import {
  entregaEscopoAction,
  gravaRespostaAction,
  gravaTraducaoAction,
} from '@/app/(aluno)/escopo/acoes'

export type PerguntaDoEscopo = {
  id: string
  ordem: number
  enunciado: string
  criterioDeAceite: string
  texto: string
}

export type PapelDaTraducao = {
  papelId: string
  ordem: number
  nome: string
  obrigatorio: boolean
  nomeNoNegocio: string
  nomeNoCodigo: string
}

type Reprovacao = { perguntaId: string | null; mensagem: string }

type Gravacao = 'limpo' | 'gravando' | 'gravado' | 'falhou'

/**
 * Selo de gravação de um campo.
 *
 * Existe porque a gravação é automática. Campo que salva sozinho e não diz nada
 * obriga a pessoa a confiar — e este formulário é preenchido a quatro mãos ao
 * longo de dois dias, então "será que salvou?" viraria uma releitura por campo.
 */
function Selo({ estado }: { estado: Gravacao }) {
  if (estado === 'limpo') return null
  if (estado === 'falhou') return <span className="legenda text-portao">não gravou</span>
  return <span className="legenda">{estado === 'gravando' ? 'gravando…' : 'gravado'}</span>
}

/**
 * O formulário de escopo do grupo.
 *
 * **Grava sozinho, ao sair do campo.** É decisão de projeto e não conveniência:
 * o formulário é preenchido em dupla ao longo do D2 e do D3, em máquinas
 * diferentes, e a perda que importa aqui não é um clique a mais — é o texto de
 * quarenta minutos que some porque ninguém apertou salvar. A única ação
 * explícita da tela é entregar, e ela é a de tinta cheia.
 *
 * Entregar chama o pré-filtro, e as reprovações voltam **para o lado da
 * pergunta que as causou**. É o que o Doc 2 §4.6 quer do pré-filtro: o grupo
 * corrige sozinho o que uma máquina consegue apontar, e os minutos do instrutor
 * ficam para os julgamentos que exigem leitura humana.
 *
 * Entregue, o formulário vira leitura. A janela de edição não é decisão desta
 * tela — vem do mapa de transições, pelo `editavel` que a página calcula.
 */
export function FormularioDeEscopo({
  perguntas,
  traducao,
  editavel,
  entregue,
}: {
  perguntas: readonly PerguntaDoEscopo[]
  traducao: readonly PapelDaTraducao[]
  editavel: boolean
  entregue: boolean
}) {
  const [reprovacoes, setReprovacoes] = useState<readonly Reprovacao[] | null>(null)
  const [erroDaEntrega, setErroDaEntrega] = useState<AvisoDeErro | null>(null)
  const [entregando, iniciaEntrega] = useTransition()

  const daPergunta = (perguntaId: string) =>
    reprovacoes?.filter((r) => r.perguntaId === perguntaId).map((r) => r.mensagem) ?? []
  const semDono = reprovacoes?.filter((r) => r.perguntaId === null) ?? []

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        {perguntas.map((pergunta) => (
          <PerguntaCartao
            key={pergunta.id}
            pergunta={pergunta}
            editavel={editavel}
            reprovacoes={daPergunta(pergunta.id)}
          />
        ))}
      </section>

      <Cartao legenda="Tabela de tradução">
        <p className="max-w-[62ch] text-[0.9375rem] leading-relaxed text-tinta-media">
          De cada papel da estrutura para o nome que ele tem no seu domínio, e
          para o nome que ele terá no código. É o índice de navegação do
          repositório do grupo.
        </p>

        <div className="mt-5 flex flex-col gap-5">
          {traducao.map((papel) => (
            <LinhaDaTraducao key={papel.papelId} papel={papel} editavel={editavel} />
          ))}
        </div>
      </Cartao>

      {semDono.length > 0 && (
        <Aviso tom="portao" className="max-w-[62ch]">
          {semDono.map((r) => r.mensagem).join(' ')}
        </Aviso>
      )}

      <ErroDaAcao erro={erroDaEntrega} />

      {reprovacoes !== null && reprovacoes.length === 0 && !entregue && (
        <Aviso className="max-w-[62ch]">Entregue. O formulário entrou na fila do instrutor.</Aviso>
      )}

      {editavel && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Botao
            variante="acao"
            disabled={entregando}
            onClick={() => {
              setErroDaEntrega(null)
              iniciaEntrega(async () => {
                // Dois resultados encaixados, e a diferença importa. O de fora é
                // "a ação rodou?" — falha de plataforma. O de dentro é o
                // pré-filtro, e reprovação dele NÃO é erro: é o retorno esperado
                // da tentativa, e cada uma volta para o lado da sua pergunta.
                const resultado = await entregaEscopoAction()
                if (!resultado.ok) {
                  setReprovacoes(null)
                  setErroDaEntrega(resultado.erro)
                  return
                }
                setReprovacoes(resultado.valor.reprovacoes)
              })
            }}
          >
            {entregando ? 'entregando…' : 'Entregar para aprovação'}
          </Botao>
          <p className="legenda">
            a conferência automática roda antes — o que ela apontar volta para o
            campo
          </p>
        </div>
      )}
    </div>
  )
}

function PerguntaCartao({
  pergunta,
  editavel,
  reprovacoes,
}: {
  pergunta: PerguntaDoEscopo
  editavel: boolean
  reprovacoes: readonly string[]
}) {
  const [texto, setTexto] = useState(pergunta.texto)
  const [estado, setEstado] = useState<Gravacao>('limpo')
  const [, iniciaTransicao] = useTransition()

  function grava() {
    // Igual ao que já está gravado: nada a fazer. A comparação é contra a prop,
    // que a revalidação atualiza — e se a gravação falhou, ela ainda difere, e o
    // próximo blur tenta de novo sozinho.
    if (texto === pergunta.texto) return
    setEstado('gravando')
    iniciaTransicao(async () => {
      try {
        await gravaRespostaAction({ perguntaId: pergunta.id, texto })
        setEstado('gravado')
      } catch {
        setEstado('falhou')
      }
    })
  }

  return (
    <Cartao>
      <div className="flex items-baseline gap-3">
        {/* O ordinal é endereço: é como o instrutor diz qual pergunta corrigir.
            O enunciado é que é o título, e ele é prosa. */}
        <span className="dado text-[0.6875rem] text-tinta-fraca">{pergunta.ordem}</span>
        <h3 className="max-w-[52ch] font-prosa text-lg leading-snug text-tinta">
          {pergunta.enunciado}
        </h3>
      </div>

      {editavel ? (
        <div className="mt-4">
          <CampoDeProsa
            id={`pergunta-${pergunta.id}`}
            rotulo="A resposta do grupo"
            ajuda={pergunta.criterioDeAceite}
            erro={reprovacoes[0]}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onBlur={grava}
          />
          <div className="mt-1.5">
            <Selo estado={estado} />
          </div>
          {reprovacoes.slice(1).map((mensagem) => (
            <p key={mensagem} className="mt-1 text-[0.8125rem] leading-snug text-portao">
              {mensagem}
            </p>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <p className="legenda">a resposta do grupo</p>
          <p className="mt-1.5 max-w-[62ch] whitespace-pre-line font-prosa leading-relaxed text-tinta">
            {pergunta.texto || '—'}
          </p>
        </div>
      )}
    </Cartao>
  )
}

function LinhaDaTraducao({ papel, editavel }: { papel: PapelDaTraducao; editavel: boolean }) {
  const [negocio, setNegocio] = useState(papel.nomeNoNegocio)
  const [codigo, setCodigo] = useState(papel.nomeNoCodigo)
  const [estado, setEstado] = useState<Gravacao>('limpo')
  const [, iniciaTransicao] = useTransition()

  function grava() {
    // As duas colunas são obrigatórias no banco: meia linha não existe. Enquanto
    // só uma estiver preenchida, a tela espera em vez de tentar e falhar.
    if (negocio.trim().length === 0 || codigo.trim().length === 0) return
    if (negocio === papel.nomeNoNegocio && codigo === papel.nomeNoCodigo) return

    setEstado('gravando')
    iniciaTransicao(async () => {
      try {
        await gravaTraducaoAction({
          papelId: papel.papelId,
          nomeNoNegocio: negocio.trim(),
          nomeNoCodigo: codigo.trim(),
        })
        setEstado('gravado')
      } catch {
        setEstado('falhou')
      }
    })
  }

  if (!editavel) {
    return (
      <div className="border-b border-linha pb-4 last:border-b-0 last:pb-0">
        <p className="legenda">{papel.nome}</p>
        <p className="mt-1 text-tinta">
          {papel.nomeNoNegocio || '—'}
          {papel.nomeNoCodigo && (
            <span className="dado ml-3 text-tinta-media">{papel.nomeNoCodigo}</span>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="border-b border-linha pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-baseline gap-3">
        <p className="legenda">{papel.nome}</p>
        {!papel.obrigatorio && <Etiqueta tracejada>opcional</Etiqueta>}
        <Selo estado={estado} />
      </div>

      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Campo
          id={`negocio-${papel.papelId}`}
          rotulo="no seu domínio"
          value={negocio}
          onChange={(e) => setNegocio(e.target.value)}
          onBlur={grava}
        />
        <Campo
          id={`codigo-${papel.papelId}`}
          rotulo="no código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onBlur={grava}
        />
      </div>
    </div>
  )
}
