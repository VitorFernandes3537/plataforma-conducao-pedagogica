'use client'

import { useState, useTransition } from 'react'

import { MarcaBilhete } from '@/components/marcas'
import { Botao, Cartao, EstadoVazio, Linha } from '@/components/ui'

import { riscaItemDoMuralAction } from '@/app/instrutor/acoes'

type ItemAberto = {
  id: string
  grupoId: string
  texto: string
}

type GrupoDoMural = {
  obstaculoId: string
  pergunta: string
  itens: readonly ItemAberto[]
}

/**
 * O mural em aberto, agrupado por pergunta de obstáculo.
 *
 * É consultado na abertura de todo dia e riscado durante a demonstração — dois
 * momentos, a mesma tela. O instrutor risca com um clique enquanto ainda está
 * codificando ao vivo, porque o orçamento desse momento é praticamente zero.
 *
 * Agrupa por PERGUNTA, nunca por número (`D3-07`): agrupar por ordinal
 * transformaria o mural em índice de aula numerada, que é o oposto do que ele é.
 *
 * A marca de bilhete vive na margem, e só aqui: o mural é a única coisa da
 * plataforma que espelha um objeto físico da sala (ADR 0003 §4.1).
 */
export function MuralDoDia({
  turmaId,
  grupos,
}: {
  turmaId: string
  grupos: readonly GrupoDoMural[]
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [riscando, setRiscando] = useState<string | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  const total = grupos.reduce((soma, g) => soma + g.itens.length, 0)

  if (total === 0) {
    return (
      <Cartao legenda="Precisamos saber">
        <EstadoVazio titulo="Nada em aberto no mural.">
          A turma passou pelos obstáculos sem travar, ou o que estava aberto já
          foi riscado.
        </EstadoVazio>
      </Cartao>
    )
  }

  return (
    <div className="relative">
      <MarcaBilhete className="pointer-events-none absolute -left-10 top-1 hidden lg:block" />

      <Cartao legenda="Precisamos saber" contagem={total}>
        {erro && <p className="legenda mb-3 text-portao">{erro}</p>}

        <div className="flex flex-col gap-5">
          {grupos.map((grupo) => (
            <section key={grupo.obstaculoId}>
              <h3 className="max-w-[46ch] font-prosa text-base leading-snug text-tinta">
                {grupo.pergunta}
              </h3>

              <ul className="mt-1.5">
                {grupo.itens.map((item) => (
                  <Linha
                    key={item.id}
                    fim={
                      <Botao
                        variante="texto"
                        compacto
                        disabled={pendente && riscando === item.id}
                        onClick={() => {
                          setErro(null)
                          setRiscando(item.id)
                          iniciaTransicao(async () => {
                            try {
                              await riscaItemDoMuralAction({ itemId: item.id, turmaId })
                            } catch (e) {
                              setErro(e instanceof Error ? e.message : 'não foi possível riscar')
                            } finally {
                              setRiscando(null)
                            }
                          })
                        }}
                      >
                        riscar
                      </Botao>
                    }
                  >
                    <span className="text-tinta-media">{item.texto}</span>
                  </Linha>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Cartao>
    </div>
  )
}
