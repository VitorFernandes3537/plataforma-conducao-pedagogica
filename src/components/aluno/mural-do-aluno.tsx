'use client'

import { useState, useTransition } from 'react'

import { MarcaBilhete } from '@/components/marcas'
import { Botao, Campo, Cartao, EstadoVazio } from '@/components/ui'

import { escreveNoMuralAction } from '@/app/(aluno)/acoes'

type GrupoDoMural = {
  obstaculoId: string
  pergunta: string
  itens: readonly { id: string; texto: string }[]
}

/**
 * O mural, do lado do aluno.
 *
 * Ele lê e escreve, e nunca risca — riscar é do instrutor, quando a
 * demonstração resolve (Doc 5 §8.1). Se o grupo pudesse riscar, o mural
 * deixaria de mostrar o que a turma ainda não sabe e passaria a mostrar o que
 * cada grupo acha que já sabe.
 *
 * A regra de escrita do §8.3 — a dúvida, não o pedido de solução — aparece como
 * ajuda do campo, não como validação. Distinguir uma da outra é leitura humana,
 * e a plataforma não corrige conteúdo (Doc 7 §6).
 *
 * É também o degrau 2 da escada de suporte: o aluno consulta aqui antes de
 * poder chamar outro grupo. Por isso a leitura vem antes do campo de escrita.
 */
export function MuralDoAluno({
  grupoId,
  obstaculoId,
  grupos,
}: {
  grupoId: string | null
  obstaculoId: string | null
  grupos: readonly GrupoDoMural[]
}) {
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciaTransicao] = useTransition()

  const total = grupos.reduce((soma, g) => soma + g.itens.length, 0)

  return (
    <div className="relative">
      <MarcaBilhete className="pointer-events-none absolute -left-16 top-1 hidden w-12 text-tinta-tenue lg:block" />

      <Cartao legenda="Precisamos saber" contagem={total}>
        {total === 0 ? (
          <EstadoVazio titulo="Ninguém escreveu ainda.">
            Quando travar, escreva aqui a dúvida. A sala inteira vê que não está
            sozinha.
          </EstadoVazio>
        ) : (
          <div className="flex flex-col gap-5">
            {grupos.map((grupo) => (
              <section key={grupo.obstaculoId}>
                <h3 className="max-w-[46ch] font-prosa text-base leading-snug text-tinta">
                  {grupo.pergunta}
                </h3>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {grupo.itens.map((item) => (
                    <li key={item.id} className="max-w-[66ch] text-tinta-media">
                      {item.texto}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {grupoId && obstaculoId && (
          <div className="mt-6 border-t border-linha pt-5">
            {erro && <p className="legenda mb-2 text-portao">{erro}</p>}
            <Campo
              id="duvida-do-mural"
              rotulo="Escreva a dúvida"
              ajuda="A pergunta, não o pedido de solução."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              disabled={pendente}
            />
            <Botao
              className="mt-3"
              variante="acao"
              disabled={pendente}
              onClick={() => {
                setErro(null)
                iniciaTransicao(async () => {
                  try {
                    await escreveNoMuralAction({ grupoId, obstaculoId, texto })
                    setTexto('')
                  } catch (e) {
                    setErro(e instanceof Error ? e.message : 'não foi possível escrever')
                  }
                })
              }}
            >
              pregar no mural
            </Botao>
          </div>
        )}
      </Cartao>
    </div>
  )
}
