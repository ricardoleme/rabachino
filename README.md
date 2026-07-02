# Rabachino — Ficha de Degustação

Aplicação web mobile-first para registrar fichas de degustação no próprio
dispositivo. Não há backend: fichas e fotos são armazenadas no IndexedDB do
navegador.

## Sobre o método Rabachino

A degustação conduzida por Roberto Rabachino baseia-se nos princípios da FISAR
(Federação Italiana de Sommeliers, Hoteleiros e Restaurateurs) e concentra-se
na análise sensorial organoléptica do vinho: visão, olfato e paladar. A
abordagem considera que uma boa refeição resulta da harmonia entre lugar,
comida e vinho.

Seus pilares incluem:

- **Técnica organoléptica:** avaliação detalhada do aspecto visual, dos aromas e
  dos sabores.
- **Viticultura heroica:** exploração de castas e terroirs específicos,
  incluindo vinhos produzidos em regiões de montanha.
- **Harmonização:** busca do equilíbrio entre alimento e bebida, conceito
  abordado por Roberto Rabachino no livro *Harmonização: O Equilíbrio Entre
  Vinho e Alimento*.

Esta aplicação usa esses conceitos como referência para organizar os registros
de degustação; não se apresenta como implementação oficial ou endossada por
Roberto Rabachino.

## Executar

Como a aplicação usa módulos ES, sirva a pasta por HTTP em vez de abrir o
`index.html` diretamente. Uma opção é:

```bash
python -m http.server 8000
```

Depois, acesse `http://localhost:8000`.

Também é possível usar a extensão Live Server do VS Code ou qualquer servidor
estático.

## Dados locais

Os dados pertencem ao perfil e ao navegador utilizados. Limpar os dados do site
remove permanentemente as fichas e fotos armazenadas.
