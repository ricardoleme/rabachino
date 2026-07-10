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
`index.html` diretamente. A opção recomendada no projeto é:

```bash
npm run serve
```

Depois, acesse `http://127.0.0.1:5174`.

Também é possível usar a extensão Live Server do VS Code ou qualquer servidor
estático.

## Testes

Os scripts de teste não adicionam etapa de build ao app. Para checar a sintaxe
dos módulos:

```bash
npm run check
```

Para executar um smoke test real no Chrome, com perfil temporário isolado:

```bash
npm run test:smoke
```

O smoke test serve o app localmente, abre o Chrome por DevTools Protocol, cria
uma ficha espumante, confirma a persistência no IndexedDB após recarregar e
remove o perfil temporário ao finalizar. Se o Chrome não estiver no caminho
padrão, defina `CHROME_PATH` antes de executar.

Neste ambiente Windows, o modo visível é o padrão porque o Chrome headless pode
encerrar por falha no processo de GPU. Para tentar headless, execute com
`HEADLESS=1`.

## Dados locais

Os dados pertencem ao perfil e ao navegador utilizados. Limpar os dados do site
remove permanentemente as fichas e fotos armazenadas.

Use **Exportar dados** no rodapé para baixar um backup JSON com todas as fichas
e fotos. Use **Importar dados** para restaurar esse arquivo. A importação
adiciona ou atualiza fichas com o mesmo identificador e preserva as demais
fichas existentes no dispositivo.
