'use client'

import { useState } from 'react'

import { textoDe, type No } from '@/lib/markdown'

import { Linha } from './prosa'

/**
 * Matriz comparativa, com destaque sincronizado de linha.
 *
 * É o "comparador de quatro lentes" do Doc 11 §11: os trechos lado a lado, com
 * **destaque sincronizado da linha equivalente**. Aqui as lentes são as colunas
 * da matriz do §7 e a linha equivalente é a linha da tabela — encostar em
 * qualquer célula acende a linha inteira nas quatro colunas.
 *
 * O destaque acende no ponteiro E no foco de teclado. Não é acessibilidade de
 * checklist: o instrutor está conduzindo de pé, e quem apresenta navega por
 * teclado justamente porque não tem a mão no mouse.
 *
 * A linha acesa muda o **fundo**, não a cor do texto. Trocar tinta reduziria
 * contraste de leitura no momento em que a sala mais está lendo, e o sistema tem
 * um único tom de apoio para isso.
 */
export function MatrizComparativa({ tabela }: { tabela: Extract<No, { tipo: 'tabela' }> }) {
  const [acesa, setAcesa] = useState<number | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {tabela.cabecalho.map((celula, indice) => (
              <th
                key={indice}
                scope="col"
                className="legenda border-b border-linha-forte px-3 py-2 align-bottom"
              >
                <Linha conteudo={celula} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabela.linhas.map((linha, indiceDaLinha) => (
            <tr
              key={indiceDaLinha}
              tabIndex={0}
              aria-label={`comparação: ${textoDe(linha[0] ?? [])}`}
              onMouseEnter={() => setAcesa(indiceDaLinha)}
              onMouseLeave={() => setAcesa(null)}
              onFocus={() => setAcesa(indiceDaLinha)}
              onBlur={() => setAcesa(null)}
              className={`border-b border-linha transition-colors last:border-b-0 ${
                acesa === indiceDaLinha ? 'bg-recuo' : ''
              }`}
            >
              {linha.map((celula, indiceDaCelula) => (
                <td
                  key={indiceDaCelula}
                  className={`px-3 py-2.5 align-top text-[0.9375rem] leading-snug ${
                    indiceDaCelula === 0
                      ? 'legenda whitespace-nowrap'
                      : acesa === indiceDaLinha
                        ? 'text-tinta'
                        : 'text-tinta-media'
                  }`}
                >
                  <Linha conteudo={celula} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
