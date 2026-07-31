import { AusenciaDeclarada, Cartao, Etiqueta, Linha } from '@/components/ui'

export type ReposicaoDoDia = {
  alunoId: string
  nome: string
  oQuePerdeu: string
  oQueRepos: string
}

export type AtribuicaoDoDia = {
  alunoId: string
  nome: string
  tipo: string
  extensao: string | null
}

/**
 * A lateral do dia: o que acontece na sala fora do obstáculo.
 *
 * Existe porque a ADR 0006 §3 lista dois momentos do instrutor que nenhuma tela
 * servia, e os dois são leitura de relance, não decisão:
 *
 * - **quem está devendo reposição**, na abertura (Doc 5 §3.3)
 * - **quem está em extensão ou monitoria**, durante a implementação (Doc 3 §5)
 *
 * Eles não competem com o obstáculo do dia, e é por isso que ficam ao lado e não
 * abaixo: o instrutor não navega até eles, ele os vê enquanto faz outra coisa.
 *
 * Nenhum dos dois tem ação aqui. Registrar reposição é do aluno, e atribuir
 * extensão é decisão que depende de quem travou em quê naquela tarde — que é
 * justamente o que o software não sabe (Doc 3 §5). A lateral **mostra**.
 */
export function LateralDoDia({
  reposicoes,
  atribuicoes,
}: {
  reposicoes: readonly ReposicaoDoDia[]
  atribuicoes: readonly AtribuicaoDoDia[]
}) {
  return (
    <aside aria-label="A sala, fora do obstáculo" className="flex flex-col gap-6">
      <Cartao legenda="Reposição de hoje" contagem={reposicoes.length}>
        {reposicoes.length === 0 ? (
          <AusenciaDeclarada legenda="Ninguém registrou">
            Quem faltou registra o que perdeu e como repôs, na abertura. Sem
            registro, não há reposição a acompanhar — e isso é resposta, não
            falta de dado.
          </AusenciaDeclarada>
        ) : (
          <ul className="flex flex-col gap-3">
            {reposicoes.map((reposicao, indice) => (
              <li
                key={`${reposicao.alunoId}-${indice}`}
                className="border-b border-linha pb-3 last:border-b-0 last:pb-0"
              >
                <p className="text-[0.9375rem] font-medium text-tinta">{reposicao.nome}</p>
                <p className="legenda mt-1">perdeu</p>
                <p className="text-[0.875rem] leading-snug text-tinta-media">
                  {reposicao.oQuePerdeu}
                </p>
                <p className="legenda mt-1.5">repôs</p>
                <p className="text-[0.875rem] leading-snug text-tinta-media">
                  {reposicao.oQueRepos}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao legenda="Quem terminou antes" contagem={atribuicoes.length}>
        {atribuicoes.length === 0 ? (
          <AusenciaDeclarada legenda="Ninguém atribuído">
            Quem vence o obstáculo antes do tempo recebe extensão ou monitoria —
            avançar sozinho quebraria a sincronia que torna possível conduzir a
            turma inteira.
          </AusenciaDeclarada>
        ) : (
          <ul>
            {atribuicoes.map((atribuicao) => (
              <Linha
                key={atribuicao.alunoId}
                fim={<Etiqueta>{atribuicao.tipo}</Etiqueta>}
              >
                <span className="text-tinta">{atribuicao.nome}</span>
                {atribuicao.extensao && (
                  <span className="legenda mt-1 block">{atribuicao.extensao}</span>
                )}
              </Linha>
            ))}
          </ul>
        )}
      </Cartao>
    </aside>
  )
}
