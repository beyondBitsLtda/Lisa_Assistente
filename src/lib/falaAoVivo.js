// A FALA AO VIVO (07/11/2026): a Lisa começa a falar na primeira frase, enquanto o resto da resposta
// ainda está chegando. Antes, a voz só começava quando a resposta INTEIRA terminava de chegar — o tempo
// de escrever a resposta toda vinha antes da primeira palavra.
//
// A cada pedaço de texto que chega (o streaming de /api/ask), `novos` devolve os pedaços de fala que já
// estão prontos — só frases completas, nos tamanhos de src/lib/cleanForSpeech.js (o mesmo corte de
// quando a resposta chega de uma vez). Fica de fora da fala, como antes:
//   - o código: um bloco aberto segura a fala até fechar, e o bloco fechado some (está no editor);
//   - o rascunho do card (src/lib/acoesNoAbacato.js): a fala para na marca dele.
// Os pedaços vão para a mesma fila de sempre (enfileirarPedaco no Assistente): mesmas chamadas, mesma
// cota, mesma regra de nunca trocar de voz no meio da resposta.
//
// Puro: sem React, sem rede.

import { pedacosDaResposta } from "./codigoNaResposta.js";
import { MARCA_DO_RASCUNHO } from "./acoesNoAbacato.js";
import { frasesDaFala, juntarEmPedacos } from "./cleanForSpeech.js";

/**
 * O texto que pode virar fala, da resposta até agora: sem os blocos de código (o bloco que ainda
 * está aberto, e tudo depois dele, espera ele fechar) e sem o rascunho do card. Cresce só no fim
 * conforme a resposta chega — o que já saiu dele não muda. `parou`: achou a marca do rascunho (a
 * fala acabou ali, mesmo com a resposta ainda chegando).
 */
export function textoFalavel(bruto, { fim = false } = {}) {
  let t = String(bruto || "");
  let parou = false;
  const marca = t.indexOf(MARCA_DO_RASCUNHO);
  if (marca >= 0) {
    t = t.slice(0, marca);
    parou = true;
  } else if (!fim) {
    // o começo da marca pode estar chegando agora: segura o finalzinho que pode ser ela
    for (let k = Math.min(MARCA_DO_RASCUNHO.length - 1, t.length); k > 0; k--) {
      if (t.endsWith(MARCA_DO_RASCUNHO.slice(0, k))) { t = t.slice(0, -k); break; }
    }
  }
  const partes = [];
  for (const p of pedacosDaResposta(t)) {
    if (p.tipo === "texto") partes.push(p.texto);
    else if (p.completo || fim || parou) partes.push(" "); // bloco fechado: some da fala (como em cleanForSpeech)
    else { partes.push(""); break; } // bloco aberto: a linha de antes terminou; o resto espera o bloco fechar
  }
  return { texto: partes.join("\n"), parou };
}

/**
 * O corte da fala de UMA resposta. `novos(bruto, { fim })`: recebe a resposta até agora e devolve os
 * pedaços novos, prontos para a voz (nunca repete um que já saiu). Com `fim` (a resposta acabou de
 * chegar), devolve tudo o que falta.
 */
export function criarFalaAoVivo() {
  let consumido = 0; // quanto do texto falável já virou pedaço
  let indice = 0;    // quantos pedaços já saíram
  let acabou = false;
  return {
    novos(bruto, { fim = false } = {}) {
      if (acabou) return [];
      const { texto, parou } = textoFalavel(bruto, { fim });
      const final = fim || parou;
      if (texto.length < consumido) return [];
      const { frases, resto } = frasesDaFala(texto.slice(consumido));
      const lista = final && resto ? [...frases, resto] : frases;
      const r = juntarEmPedacos(lista, { indice, fim: final });
      consumido += lista.slice(0, r.usadas).join("").length;
      indice = r.indice;
      if (final) acabou = true;
      return r.pedacos;
    },
    /** Quantos pedaços já saíram (0 = a voz ainda não começou). */
    get pedacosFalados() { return indice; },
  };
}
