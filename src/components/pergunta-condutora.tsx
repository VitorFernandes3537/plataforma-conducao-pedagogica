type Props = {
  texto: string
}

/**
 * A pergunta condutora (`D1-PERGUNTA`).
 *
 * Fica afixada na parede da sala do D1 ao D15 e precisa da mesma permanência
 * aqui. Por isso é renderizada pelo layout do grupo de rotas do aluno, não
 * por página: assim uma tela nova nasce com ela, e esquecer é impossível.
 *
 * Serifada porque é prosa e é tese — não é rótulo de interface.
 *
 * Alinha à margem da casca e usa uma medida larga: é uma faixa de uma frase, não
 * um parágrafo, e a 62ch a pergunta deste curso quebrava com a última palavra
 * sozinha na segunda linha. A 90ch ela cabe numa linha, e só a pergunta muito
 * longa quebra — num ponto ainda legível.
 */
export function PerguntaCondutora({ texto }: Props) {
  return (
    <aside
      aria-label="Pergunta condutora do curso"
      className="margem border-b border-linha bg-recuo py-3"
    >
      <p className="legenda">a pergunta do curso</p>
      <p className="mt-1 max-w-[90ch] font-prosa text-[0.9375rem] leading-snug text-tinta-media">
        {texto}
      </p>
    </aside>
  )
}
