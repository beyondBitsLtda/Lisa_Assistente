// O quadro principal: o Kanban que abre em "/", o escopo padrão do Assistente e o quadro do painel.
// É o NOME do quadro no Abacato (ou no Trello), exatamente como aparece lá. NEXT_PUBLIC_ porque as
// telas também precisam dele (entra no build; não é segredo).
//   NEXT_PUBLIC_QUADRO_PRINCIPAL="Quarto de Guerra"
//
// Módulo sem dependências de propósito: pode ser importado tanto pelas telas quanto pelo servidor.
export const QUADRO_PRINCIPAL = String(process.env.NEXT_PUBLIC_QUADRO_PRINCIPAL || "Quarto de Guerra").trim();
