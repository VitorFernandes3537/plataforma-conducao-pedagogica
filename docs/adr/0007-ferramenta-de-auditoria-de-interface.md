# ADR 0007 — Ferramenta de auditoria de interface, e por que só metade dela

| | |
|---|---|
| **Estado** | Aceita |
| **Data** | 2026-07-30 |
| **Contexto** | As telas começaram a se multiplicar e nada conferia acessibilidade nem deriva do sistema visual |
| **Autorizada por** | `docs/doc-7-spec-plataforma.md` §0.2 (design e ferramental delegados ao desenvolvedor) |
| **Relacionada** | ADR 0003 (rumo visual), ADR 0006 (inventário de telas) |

---

## 1. O problema

Quatro telas construídas, oito na fila. Nada no repositório verifica razão de
contraste, estado de foco visível, alvo de toque, ordem de tabulação ou deriva
de escala tipográfica. A suíte tem 148 testes e nenhum deles olha para a
interface — por decisão: teste de JSX quebra a cada ajuste de layout e não pega
o que importa (CLAUDE.md §7).

Isso deixa um buraco real. Deriva visual entre telas não aparece em teste, não
aparece em typecheck, e quando aparece na sala já custou.

## 2. As três candidatas

O dono pediu avaliação de `impeccable`, `ui-ux-pro-max` e `taste-skill`. Todas
com licença permissiva, todas ativas, todas com adoção grande.

O critério de decisão não foi qualidade delas. Foi **o que este projeto já tem**:

> A ADR 0003 saiu de cinco rodadas com o dono do curso, com direções rejeitadas
> pelo nome. O rumo visual não é uma lacuna a preencher — é uma decisão cara,
> já tomada.

Contra esse critério as três se separam sozinhas:

| Ferramenta | O que oferece | Veredito |
|---|---|---|
| `taste-skill` | **Impõe** direção estética; espera GSAP para movimento | **Não.** A ADR 0003 decide o oposto nos dois pontos |
| `ui-ux-pro-max` | 192 paletas, 74 pares de fonte, 98 diretrizes de UX | **Não.** O catálogo é a maior parte, e paleta e tipografia já estão escolhidas |
| `impeccable` | 23 comandos, dos quais 2 auditam e 21 produzem | **Metade.** Entram os dois |

## 3. A decisão

Instalar `impeccable`, alvo projeto, e usar **apenas `audit`, `critique`, o
detector determinístico e o hook de detecção**. Os outros 21 comandos exigem que
o dono peça pelo nome.

Fora do versionamento: são 3 MB de código de terceiro que reinstala num
comando e só envelheceria no histórico.

A regra está cravada em CLAUDE.md §6.1, porque ADR não é lida antes de cada
ação e CLAUDE.md é.

**A cópia para o GitHub Copilot foi removida.** O instalador escreve em toda
harness que detecta; este projeto não usa Copilot, e 3 MB para ninguém é lixo.

## 4. O argumento contrário

Ele existe e é honesto: **algumas telas da fila não têm precedente no sistema.**
O modo apresentação do D1 (ADR 0006 §8) pede comparador de quatro lentes e
revelação por camadas — a ADR 0003 não decidiu nada sobre isso, porque quando
ela foi escrita essa tela não existia. Ali `shape` teria o que dizer, e a
proibição me faz trabalhar sem uma ajuda disponível.

Aceito o custo por dois motivos. O primeiro é que o buraco é estreito: uma tela
das oito. O segundo é que a assimetria é feia — a skill abre com *"go all out,
dream big and bold"*, e um comando gerador rodando sobre um sistema contido
produz algo que parece decisão e é ruído, e ninguém revisando o diff depois
consegue dizer qual das duas coisas foi.

Se o modo apresentação travar por falta de direção, a saída é o dono pedir
`shape` para aquela tela — não afrouxar a regra.

## 5. O que a primeira execução mostrou

O detector varreu `src/app` e `src/components` e achou **uma** ocorrência:
filete lateral de 3px em `Aviso` (`src/components/ui/estado.tsx`), pela regra
`side-tab` — "borda colorida grossa de um lado, o tique mais reconhecível de
interface gerada".

Ficou, com a supressão documentada no arquivo. Três pés:

1. 3px é a espessura reservada do sistema — `Cartao` usa a mesma para marcar
   bloqueio. O resto da interface é 1px de `--color-linha`
2. `Aviso` é aviso em linha, não cartão com aba. A regra mira cartão
3. **O detector não pegou o filete idêntico em `cartao.tsx`**, porque lá está em
   propriedades separadas em vez do atalho `3px solid`

O terceiro ponto é o que mais importa registrar: a varredura é regex sobre
padrão de escrita, não sobre resultado renderizado. Achado dela é entrada de
conversa, nunca veredito — e ausência de achado não é atestado de qualidade.

Uma ocorrência em quatro telas também diz algo sobre a ADR 0003: ela foi
executada com consistência.

## 6. O que o detector não cobre, e onde estava o buraco de verdade

Acessibilidade não é regex. A varredura determinística passa limpa por um
sistema visual inteiro sem nunca calcular uma razão de contraste — e era ali que
estava o problema.

Sobre os pares que a interface realmente desenha, **sete dos quinze reprovavam**.
Três eram texto:

| Par | Antes | Mínimo |
|---|---|---|
| `tinta-fraca` sobre `recuo` | 3.97:1 | 4.5:1 |
| `tinta-tenue` em número de 10 px na régua | 2.31:1 | 4.5:1 |
| `tinta-tenue` em *placeholder* de campo | 2.31:1 | 4.5:1 |

Os dois usos de `tinta-tenue` eram o pior caso do sistema: texto minúsculo na
cor mais apagada da paleta. Nenhum deles precisava dela — trocaram para
`tinta-fraca`, e a hierarquia entre o dia corrente e os outros continua de pé.
`tinta-fraca` foi de `#7c776d` para `#736e65`, mudança que ninguém enxerga e que
devolve o nível ao mínimo.

**A paleta não foi tocada além disso**, e por regra: acento é decisão do dono do
curso, que rejeitou direções pelo nome antes de chegar nesta.

### O que ficou pendente, e é escolha dele

`--color-portao` (`#dc4b1e`) dá **4.00:1** sobre papel e **3.56:1** dentro da
própria pílula. Reprova, e é o pior lugar possível para reprovar: é a cor do
estado que bloqueia. `#bf411a` passa em 4.53:1 no pior caso, mantendo matiz e
saturação, mas escurece um acento escolhido a dedo.

Fica registrado como `it.todo` no guarda, e não como teste vermelho: suíte
vermelha não é lugar de guardar pergunta.

### O que foi recusado

`--color-linha` sobre papel dá 1.25:1. Não entra no guarda. A WCAG 1.4.11 fala
de componente e estado, e filete de cartão não é nem um nem outro; levá-lo a 3:1
pediria `#a09164`, uma linha verde-oliva grossa no lugar de um fio. Guarda que
reclama do que não é problema é guarda que alguém desliga.

### A conferência virou teste

`tests/contraste-do-sistema-visual.test.ts` lê os tokens do próprio
`globals.css` em vez de repetir os valores, então acompanha a paleta quando ela
mudar. É a exceção justificada à regra de não testar interface (CLAUDE.md §7):
contraste é aritmética sobre dois hex, não quebra quando o layout muda, e falha
em silêncio até alguém não conseguir ler a tela.
