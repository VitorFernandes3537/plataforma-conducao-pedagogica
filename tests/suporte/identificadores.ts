/**
 * Um identificador válido que o banco nunca gera.
 *
 * Existe por causa de um defeito real: três testes construíam o "id que não
 * existe" trocando o último caractere de um id real por `0`. Quando o id
 * sorteado já terminava em `0`, a troca devolvia o PRÓPRIO id, a chamada
 * encontrava a linha e o teste falhava — uma vez em dezesseis, por teste.
 *
 * Era isso que a suíte fazia parecer instável: falha que não se reproduz porque
 * depende do sorteio de `gen_random_uuid()`, e some na rodada seguinte.
 *
 * O formato é de UUID versão 4 para o Postgres aceitar sem reclamar do tipo, e
 * todos os dígitos livres são zero — combinação que o gerador não produz na
 * prática.
 */
export const ID_INEXISTENTE = '00000000-0000-4000-8000-000000000000'
