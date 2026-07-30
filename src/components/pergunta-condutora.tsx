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
 * Serifada e em medida curta porque é prosa e é tese — não é rótulo de
 * interface.
 */
export function PerguntaCondutora({ texto }: Props) {
  return (
    <aside
      aria-label="Pergunta condutora do curso"
      className="border-b border-filete bg-painel px-6 py-3"
    >
      <p className="legenda">a pergunta do curso</p>
      <p className="mt-1 max-w-[62ch] font-prosa text-[0.9375rem] leading-snug text-tinta-media">
        {texto}
      </p>
    </aside>
  )
}
