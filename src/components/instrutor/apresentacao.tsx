'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'

import { Bloco, type TipoDeBloco } from '@/components/material/blocos'
import { Prosa } from '@/components/material/prosa'
import { Botao, Etiqueta } from '@/components/ui'
import { analisa } from '@/lib/markdown'

import { liberaAgregadoAction } from '@/app/instrutor/apresentacao/[diaId]/acoes'

export type BlocoDaLamina = {
  id: string
  tipo: TipoDeBloco
  conteudo: string
  conteudoRevelado: string | null
  agregadoLiberado: boolean
  /** Só o instrutor recebe isto, e ele recebe antes de liberar. */
  agregado: { distribuicao: readonly { resposta: string; quantidade: number }[]; respondentes: number } | null
}

export type LaminaDaApresentacao = {
  id: string
  titulo: string
  conteudo: string
  blocos: readonly BlocoDaLamina[]
}

/**
 * Modo apresentação.
 *
 * **Nada avança sozinho** (Doc 11 §11). Não há autoplay, não há temporizador, e
 * a plataforma não guarda em que lâmina a sala parou — guardar isso seria o
 * mesmo "agora" inventado que a régua se recusa a mostrar.
 *
 * Um gesto para a frente, e ele faz duas coisas na ordem certa: revela a próxima
 * camada da lâmina atual e, quando não há mais camada, passa para a próxima
 * lâmina. É a revelação por camadas do §6.3 e a navegação de slide no mesmo
 * botão, porque na mão de quem apresenta elas são o mesmo movimento — avançar.
 *
 * Voltar devolve a lâmina anterior **inteira**, com todas as camadas abertas.
 * Quem volta quer rever o que já mostrou, não repetir a revelação.
 *
 * O teclado responde porque quem apresenta está de pé: seta, espaço e página
 * fazem o mesmo que os botões. Espaço só é capturado quando o foco não está num
 * controle — senão a barra de espaço deixaria de apertar o botão focado.
 */
export function Apresentacao({
  laminas,
  diaId,
}: {
  laminas: readonly LaminaDaApresentacao[]
  diaId: string
}) {
  const [indice, setIndice] = useState(0)
  const [camadas, setCamadas] = useState(0)

  const lamina = laminas[indice]
  const totalDeCamadas = lamina?.blocos.length ?? 0

  const avanca = useCallback(() => {
    if (camadas < totalDeCamadas) {
      setCamadas((c) => c + 1)
      return
    }
    if (indice < laminas.length - 1) {
      setIndice((i) => i + 1)
      setCamadas(0)
    }
  }, [camadas, totalDeCamadas, indice, laminas.length])

  const volta = useCallback(() => {
    if (camadas > 0) {
      setCamadas((c) => c - 1)
      return
    }
    if (indice > 0) {
      const anterior = indice - 1
      setIndice(anterior)
      setCamadas(laminas[anterior]?.blocos.length ?? 0)
    }
  }, [camadas, indice, laminas])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target
      const emControle =
        alvo instanceof HTMLElement &&
        (alvo.tagName === 'BUTTON' || alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA')

      if (evento.key === 'ArrowRight' || evento.key === 'PageDown') {
        evento.preventDefault()
        avanca()
      } else if (evento.key === ' ' && !emControle) {
        evento.preventDefault()
        avanca()
      } else if (evento.key === 'ArrowLeft' || evento.key === 'PageUp') {
        evento.preventDefault()
        volta()
      }
    }

    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [avanca, volta])

  if (!lamina) {
    return <p className="text-tinta-media">Este dia não tem material cadastrado.</p>
  }

  const noFim = indice === laminas.length - 1 && camadas === totalDeCamadas
  const noComeco = indice === 0 && camadas === 0
  const visiveis = lamina.blocos.slice(0, camadas)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h2 className="max-w-[34ch] font-prosa text-2xl leading-tight tracking-tight text-tinta">
          {lamina.titulo}
        </h2>
        <p className="legenda">
          lâmina <span className="dado text-tinta">{indice + 1}</span> de{' '}
          <span className="dado text-tinta">{laminas.length}</span>
          {totalDeCamadas > 0 && (
            <>
              {' · camada '}
              <span className="dado text-tinta">{camadas}</span>
              {' de '}
              <span className="dado text-tinta">{totalDeCamadas}</span>
            </>
          )}
        </p>
      </header>

      {lamina.conteudo.trim().length > 0 && <Prosa nos={analisa(lamina.conteudo)} />}

      {visiveis.map((bloco) => (
        <article key={bloco.id} className="cartao px-6 py-7">
          <Bloco
            tipo={bloco.tipo}
            conteudo={bloco.conteudo}
            conteudoRevelado={bloco.conteudoRevelado}
          />
          {bloco.agregado && (
            <Agregado bloco={bloco} diaId={diaId} />
          )}
        </article>
      ))}

      {/* A barra fica colada no rodapé porque quem apresenta está de pé e a
          lâmina rola: controle que sai de vista obriga a procurar o mouse no
          meio da fala. É o único elemento fixo do sistema, e ele carrega filete
          e papel como qualquer outra superfície. */}
      <div className="sangra sticky bottom-0 border-t border-linha bg-papel/95 px-[var(--margem)] py-3 backdrop-blur-[2px]">
        <div className="flex flex-wrap items-center gap-3">
          <Botao variante="acao" disabled={noFim} onClick={avanca}>
            {camadas < totalDeCamadas ? 'Revelar o próximo' : 'Próxima lâmina'}
          </Botao>
          <Botao disabled={noComeco} onClick={volta}>
            Voltar
          </Botao>
          <p className="legenda">seta, espaço ou página — nada avança sozinho</p>
        </div>
      </div>
    </div>
  )
}

/**
 * O agregado da turma, e o botão que o libera.
 *
 * O instrutor vê antes de liberar: é ele quem decide o momento de mostrar, e
 * para decidir precisa saber o que vai aparecer. O aluno só vê depois — mostrar
 * antes faria a turma responder olhando a maioria, e a predição deixaria de
 * medir predição, que é a única coisa que ela mede.
 */
function Agregado({ bloco, diaId }: { bloco: BlocoDaLamina; diaId: string }) {
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  if (!bloco.agregado) return null

  const total = bloco.agregado.respondentes

  return (
    <div className="mt-6 border-t border-linha pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="legenda">
          o que a turma respondeu · <span className="dado text-tinta">{total}</span>
          {total === 1 ? ' resposta' : ' respostas'}
        </p>
        {bloco.agregadoLiberado ? (
          <Etiqueta tom="destaque">liberado para a turma</Etiqueta>
        ) : (
          <Botao
            compacto
            disabled={pendente}
            onClick={() => {
              setErro(null)
              iniciaTransicao(async () => {
                try {
                  await liberaAgregadoAction({ blocoId: bloco.id, diaId })
                } catch (e) {
                  setErro(e instanceof Error ? e.message : 'não foi possível liberar')
                }
              })
            }}
          >
            {pendente ? 'liberando…' : 'mostrar para a turma'}
          </Botao>
        )}
      </div>

      {erro && <p className="legenda mt-2 text-portao">{erro}</p>}

      {total === 0 ? (
        <p className="legenda mt-3">ninguém respondeu ainda</p>
      ) : (
        <ul className="mt-3 flex max-w-[52ch] flex-col gap-2">
          {bloco.agregado.distribuicao.map((fatia) => (
            <li key={fatia.resposta} className="flex items-center gap-3">
              <span className="w-[14ch] shrink-0 truncate text-[0.9375rem] text-tinta">
                {fatia.resposta}
              </span>
              {/* Barra de proporção, não de contagem: o que a sala compara é o
                  peso relativo das apostas, e a contagem fica ao lado em
                  tabular para quem precisa do número exato. */}
              <span aria-hidden="true" className="h-2 flex-1 rounded-full bg-recuo">
                <span
                  className="block h-full rounded-full bg-destaque"
                  style={{ width: `${Math.round((fatia.quantidade / total) * 100)}%` }}
                />
              </span>
              <span className="dado w-[3ch] shrink-0 text-right text-[0.8125rem] text-tinta-media">
                {fatia.quantidade}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
