// Limpa o texto para o TTS (voz) não ler símbolos literalmente.
// A tela continua mostrando o texto original; isto afeta SÓ a fala.

import { semBlocosDeCodigo } from "./codigoNaResposta.js";

export function cleanForSpeech(input) {
  if (!input) return "";
  let t = String(input);

  // remove blocos de código inteiros (não faz sentido falar código) — com o mesmo leitor do
  // editor da Lisa, que entende blocos de quatro crases e blocos dentro de um README
  t = semBlocosDeCodigo(t, () => " ");
  t = t.replace(/```[\s\S]*?```/g, " "); // sobra de cerca solta, se houver
  t = t.replace(/`([^`]+)`/g, "$1");

  // markdown de ênfase: **negrito**, *itálico*, __x__, _x_
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/__([^_]+)__/g, "$1");
  t = t.replace(/(?<!\w)_([^_]+)_(?!\w)/g, "$1");

  // cabeçalhos markdown (# Título) → só o texto
  t = t.replace(/^#{1,6}\s+/gm, "");

  // links [texto](url) → texto
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // link solto (a Lisa citando uma fonte da internet) → só o site: "https://www.gov.br/receita/x" → "gov.br"
  t = t.replace(/\bhttps?:\/\/(?:www\.)?([^\s/?#)]+)[^\s)]*/gi, "$1");

  // bullets no início da linha (-, *, •, +) → vira frase
  t = t.replace(/^\s*[-*•+]\s+/gm, "");

  // listas numeradas "1. " "2) " → mantém como "primeiro/segundo" fica difícil;
  // então só tira o marcador e deixa a pausa da vírgula
  t = t.replace(/^\s*\d+[.)]\s+/gm, "");

  // parênteses: mantém o conteúdo, tira os símbolos (ele lia "abre parênteses")
  t = t.replace(/[()]/g, " ");

  // colchetes e chaves
  t = t.replace(/[\[\]{}]/g, " ");

  // travessão / hífen isolado entre espaços → pausa (vírgula)
  t = t.replace(/\s[-–—]\s/g, ", ");

  // símbolos que o TTS soletra
  t = t.replace(/[#>*_`|]/g, " ");
  t = t.replace(/&/g, " e ");
  t = t.replace(/\//g, " ");           // "segunda/sexta" → "segunda sexta"
  t = t.replace(/\.\.\./g, ". ");      // reticências → pausa

  // emojis / pictogramas
  t = t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, " ");

  // múltiplos espaços / quebras → normaliza
  t = t.replace(/\n{2,}/g, ". ");      // parágrafos viram pausa
  t = t.replace(/\n/g, ", ");
  t = t.replace(/\s{2,}/g, " ");
  t = t.replace(/\s+([,.!?;:])/g, "$1"); // sem espaço antes de pontuação
  t = t.replace(/([,.!?;:]){2,}/g, "$1"); // pontuação repetida

  return t.trim();
}

// ---- corte em pedaços faláveis ---------------------------------------------------------

/**
 * Quebra o texto em pedaços faláveis, respeitando fim de frase. Serve a dois propósitos:
 *
 *   - a voz de reserva do navegador: o `speechSynthesis` do Chrome interrompe sozinho uma fala
 *     longa, por volta de 15 segundos, e não avisa;
 *   - a voz do Gemini, via pedacosParaVoz (no fim deste arquivo).
 *
 * HISTÓRICO, porque a decisão já virou duas vezes. Em 16/09/2026 dez chamadas pareceram mostrar
 * que o tamanho não importava (76 caracteres em 55s, 449 em 16s) e o corte para o Gemini foi
 * proibido: "cada pedaço é um sorteio novo contra uma API que pendura". Em 07/10/2026 (issue
 * BEYOND-0001) uma medição maior, em três modelos, mostrou que aquilo era o modelo antigo
 * pendurando ao acaso — por baixo, o tempo CRESCE com o texto (tabela em gemini.js). Com o
 * modelo novo, que quase não pendura, o sorteio deixou de ser o problema e o tamanho passou a
 * ser: a resposta inteira numa chamada só estourava o teto e caía para o navegador.
 */
export function dividirParaFala(texto, alvo = 180) {
  const limpo = String(texto || "").trim();
  if (!limpo) return [];
  if (limpo.length <= alvo) return [limpo];

  // Mantém a pontuação junto da frase que a terminou.
  const frases = limpo.match(/[^.!?…]+[.!?…]+[\s]*|[^.!?…]+$/g) || [limpo];

  const pedacos = [];
  let atual = "";
  for (const frase of frases) {
    const f = frase.trim();
    if (!f) continue;

    // Frase sozinha já maior que o alvo: parte em vírgulas, e só então em espaços. Uma frase
    // de 500 caracteres sem pontuação existe (listas ditadas, por exemplo) e não pode virar
    // uma chamada de TTS de meio minuto só porque ninguém pôs um ponto final.
    if (f.length > alvo * 1.6) {
      if (atual) { pedacos.push(atual.trim()); atual = ""; }
      let resto = f;
      while (resto.length > alvo * 1.6) {
        let corte = resto.lastIndexOf(", ", alvo);
        if (corte < alvo * 0.4) corte = resto.lastIndexOf(" ", alvo);
        if (corte < alvo * 0.4) corte = alvo;
        pedacos.push(resto.slice(0, corte + 1).trim());
        resto = resto.slice(corte + 1);
      }
      if (resto.trim()) atual = resto.trim() + " ";
      continue;
    }

    if (atual && (atual + f).length > alvo) { pedacos.push(atual.trim()); atual = ""; }
    atual += f + " ";
  }
  if (atual.trim()) pedacos.push(atual.trim());
  return pedacos.filter(Boolean);
}

/**
 * O PRIMEIRO PEDAÇO (07/11/2026): a primeira frase inteira — juntando a seguinte só se ela for curta
 * demais (menos de MINIMO_DO_PRIMEIRO_PEDACO) —, até ALVO_DO_PRIMEIRO_PEDACO. Antes era um corte em ~150
 * caracteres; agora uma primeira frase curta sai sozinha e a Lisa começa a falar mais cedo, sem cortar
 * frase no meio. O mínimo existe porque todos os pedaços são gerados em paralelo: o primeiro precisa
 * durar o bastante para o segundo ficar pronto enquanto ele toca (a conta está no `npm run fala-check`).
 */
export const MINIMO_DO_PRIMEIRO_PEDACO = 60;
export const ALVO_DO_PRIMEIRO_PEDACO = 150;
/** O segundo é médio (um degrau): fica pronto enquanto o primeiro toca, mesmo quando o primeiro é curto. */
export const ALVO_DO_SEGUNDO_PEDACO = 150;
/**
 * Os seguintes são maiores: cada um é gerado enquanto o anterior toca, e o 3.8 gera mais
 * rápido do que fala (~15s de síntese para ~38s de áudio), então a fila não esvazia. O pior
 * pedaço possível (uma frase sozinha de até 1,6 × o alvo, ~450 caracteres) ainda cabe no
 * orçamento de tempo — `npm run fala-check` confere a conta.
 */
export const ALVO_DOS_PEDACOS = 280;

const FIM_DE_FRASE = new Set([".", "!", "?", "…"]);
// o que pode fechar uma frase depois do ponto: aspas, parênteses e o fim de um **negrito** ou `código`
const FECHO_DE_FRASE = new Set(['"', "'", "”", "’", "»", ")", "]", "*", "_", "`"]);

/**
 * As frases (e as linhas) de um texto, na ordem, cada uma com o espaço que vem depois dela: é a
 * unidade do corte. Uma frase só está completa quando o ponto (ou ! ? …) vem seguido de espaço, ou
 * quando a linha termina — "3.5" e um ponto no fim do texto que ainda está chegando não fecham nada.
 * `resto`: o pedaço final que ainda não fechou.
 */
export function frasesDaFala(texto) {
  const t = String(texto || "");
  const frases = [];
  let inicio = 0;
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    let fim = -1;
    if (c === "\n") fim = i + 1;
    else if (FIM_DE_FRASE.has(c)) {
      let j = i + 1;
      while (j < t.length && (FIM_DE_FRASE.has(t[j]) || FECHO_DE_FRASE.has(t[j]))) j++;
      if (j < t.length && /\s/.test(t[j])) fim = j;
      else { i = j; continue; }
    }
    if (fim < 0) { i++; continue; }
    while (fim < t.length && /\s/.test(t[fim])) fim++;
    frases.push(t.slice(inicio, fim));
    inicio = fim;
    i = fim;
  }
  return { frases, resto: t.slice(inicio) };
}

const alvoDoPedaco = (n) => (n === 0 ? ALVO_DO_PRIMEIRO_PEDACO : n === 1 ? ALVO_DO_SEGUNDO_PEDACO : ALVO_DOS_PEDACOS);

/**
 * Junta as frases em pedaços de fala, já limpos para o TTS. `indice`: quantos pedaços desta fala já
 * saíram (o primeiro e o segundo têm regras próprias). Sem `fim`, só sai o pedaço que já não muda
 * com o texto que ainda vai chegar — o primeiro sai assim que tem o mínimo; os outros, quando a
 * próxima frase já não cabe neles. O resultado é o MESMO recebendo o texto aos poucos ou de uma vez.
 * Devolve { pedacos, usadas (frases consumidas), indice (o próximo) }.
 */
export function juntarEmPedacos(frases, { indice = 0, fim = false } = {}) {
  const pedacos = [];
  const limpar = (a, b) => cleanForSpeech(frases.slice(a, b).join(""));
  let i = 0;
  let n = indice;
  while (i < frases.length) {
    let j;
    let texto;
    if (n === 0) {
      j = i;
      texto = "";
      while (j < frases.length && texto.length < MINIMO_DO_PRIMEIRO_PEDACO) { j++; texto = limpar(i, j); }
      if (texto.length < MINIMO_DO_PRIMEIRO_PEDACO && !fim) break; // espera mais frases
    } else {
      const alvo = alvoDoPedaco(n);
      j = i + 1;
      texto = limpar(i, j);
      while (j < frases.length) {
        const maior = limpar(i, j + 1);
        if (maior.length > alvo) break;
        j++;
        texto = maior;
      }
      if (j === frases.length && !fim) break; // ainda cabe mais: espera a próxima frase chegar
    }
    i = j;
    if (!texto) continue; // só markdown ou espaço: não vira fala
    // uma frase sozinha grande demais: divide nas vírgulas (e só então nos espaços)
    const teto = n === 0 ? ALVO_DO_PRIMEIRO_PEDACO * 1.3 : alvoDoPedaco(n) * 1.6;
    const partes = texto.length > teto ? dividirParaFala(texto, alvoDoPedaco(n)) : [texto];
    pedacos.push(...partes);
    n += partes.length;
  }
  return { pedacos, usadas: i, indice: n };
}

/**
 * Os pedaços em que uma fala vai para o Gemini (BEYOND-0001): a primeira frase (ver o mínimo), um
 * segundo pedaço médio e os seguintes maiores. Texto curto vai inteiro, numa chamada só.
 */
export function pedacosParaVoz(texto) {
  const { frases, resto } = frasesDaFala(String(texto || "").trim());
  return juntarEmPedacos(resto ? [...frases, resto] : frases, { fim: true }).pedacos;
}
