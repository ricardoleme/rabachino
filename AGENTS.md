# Ficha de Degustação Rabachino

## Objetivo

Construir uma aplicação web mobile-first para registrar e consultar fichas de
degustação de vinhos segundo o método de Roberto Rabachino.

A aplicação deve usar somente HTML semântico, CSS e JavaScript vanilla. Todos os
dados, inclusive a foto do vinho, devem permanecer no dispositivo do usuário por
meio de IndexedDB. O app não depende de backend, login ou conexão com a internet
para funcionar depois que seus arquivos forem carregados.

## Diretrizes técnicas

- Não adicionar frameworks ou bibliotecas sem necessidade comprovada.
- Manter HTML, CSS e JavaScript em arquivos separados.
- Organizar o JavaScript em módulos ES (`type="module"`), separando no mínimo:
  persistência, regras/validação, formulário e listagem/busca.
- Usar IndexedDB para as fichas. Não usar `localStorage` como banco de dados.
- Tratar abertura, leitura e gravação no IndexedDB com Promises e mensagens de
  erro compreensíveis para o usuário.
- Versionar o banco e implementar migrações sem apagar fichas existentes.
- Evitar estado global mutável. Funções devem ser pequenas e ter responsabilidade
  clara.
- Não exigir etapa de build para executar o app.
- O app deve abrir por `index.html`. Quando módulos ES exigirem servidor local,
  documentar um comando simples para servi-lo.
- Não carregar imagens decorativas, fontes ou scripts de terceiros em tempo de
  execução. Preferir SVGs locais e CSS.

## Idioma e conteúdo

- Toda a interface deve estar em português do Brasil.
- Usar grafia correta na UI: `Límpido`, `Álcool`, `Equilíbrio`, `Flores` etc.
- Não afirmar na interface que esta é uma implementação oficial ou endossada por
  Roberto Rabachino.

## Identidade visual

- Usar como base tons de vinho tinto/bordô, com neutros claros para preservar
  contraste e legibilidade.
- Sugestão de tokens CSS:
  - `--wine-900: #3b0d1e`
  - `--wine-700: #6f1734`
  - `--wine-500: #9b3153`
  - `--cream: #f7f1e8`
  - `--ink: #24191d`
  - `--success: #276749`
  - `--danger: #b42318`
- Incorporar folhas e/ou cachos de uva como elementos decorativos discretos,
  preferencialmente em SVG local. As imagens não podem prejudicar leitura,
  desempenho ou interação.
- Usar **Playfair Display** como fonte principal para títulos, subtítulos,
  legendas de seções e elementos de destaque da marca.
- Usar **Lora** como fonte secundária para textos corridos, campos, botões,
  rótulos, mensagens e demais conteúdos da interface.
- Servir as fontes a partir de arquivos locais em `assets/fonts`, usando
  `@font-face` com `font-display: swap` e fallbacks serifados adequados.
- Garantir contraste mínimo WCAG AA, foco visível e alvos de toque de pelo menos
  44 x 44 px.
- Respeitar `prefers-reduced-motion`.

## Estrutura da aplicação

A aplicação pode ser uma SPA simples, com estas visualizações:

1. **Início**
   - título do app;
   - área de busca e filtros;
   - botão de destaque `Nova ficha`;
   - últimas fichas cadastradas, ordenadas por `createdAt` decrescente;
   - estado vazio com chamada para criar a primeira ficha.
2. **Formulário**
   - criação e edição na mesma tela;
   - seções progressivas/colapsáveis em telas pequenas;
   - ações `Salvar` e `Cancelar`;
   - confirmação antes de abandonar alterações não salvas.
3. **Detalhes**
   - todos os dados da ficha em modo de leitura;
   - foto, quando disponível;
   - ações `Editar` e `Excluir`;
   - exclusão somente após confirmação explícita.

Em telas maiores, aproveitar a largura disponível sem esticar excessivamente o
conteúdo. O fluxo principal deve continuar plenamente funcional a partir de
320 px de largura.

## Regra dos controles “+ ou -”

Cada descritor indicado como “permitir definir com + ou -” é independente e
possui três estados:

- negativo (`-1`), exibido como `−`;
- não marcado (`0`), estado inicial;
- positivo (`1`), exibido como `+`.

O usuário pode marcar mais de um descritor no mesmo grupo. Exemplo:
`− Amarelo Pálido` e `+ Amarelo Ouro`. O controle deve permitir alternar entre
os três estados pelo teclado e por toque, sem depender apenas de cor. Persistir
somente `-1`, `0` ou `1`.

## Campos e regras de negócio

### Geral

- **Lugar**: texto obrigatório; valor inicial `Senac Salto` em uma nova ficha.
- **Data**: data obrigatória; valor inicial é a data local atual no formato
  aceito por `input[type="date"]`. Não usar UTC para calcular esse padrão.
- **Vinho**: texto obrigatório.
- **Tipologia**: seleção obrigatória entre `Branco`, `Rosé` e `Tinto`.
- **Espumante?**: controle deslizante opcional com valor inicial `Não`. Quando
  marcado como `Sim`, exibir o quadro de Perlage; quando `Não`, manter Perlage
  oculto. Registros já existentes com qualquer nota de Perlage devem ser
  tratados como `Espumante? = Sim`.
- **Álcool**: número opcional entre `0` e `22`, inclusive; aceitar casas
  decimais e exibir `%`.
- **Produtor**: texto obrigatório.
- **Safra**: seleção obrigatória com `Sem Safra` e anos de `1900` até o ano local
  atual. Gerar os anos por JavaScript, do mais recente para o mais antigo.
- **Foto**: opcional; aceitar imagens da câmera ou galeria. Mostrar prévia,
  permitir substituir/remover e armazenar o arquivo como `Blob` no IndexedDB.
  Validar tipo de imagem e limitar a 5 MB. Se possível, redimensionar imagens
  grandes no navegador antes de salvar, preservando proporção.

### Exame visual

Mostrar os descritores de cor conforme a tipologia:

- **Branco**: Amarelo Pálido, Amarelo Ouro, Amarelo Esverdeado.
- **Tinto**: Rubi, Granada, Violáceo, Marrom.
- **Rosé**: Vermelho Claro, Rosa.

Ao trocar a tipologia, limpar os descritores de cor que não pertencem à nova
tipologia, após confirmação caso exista alguma avaliação preenchida.

- **Limpidez**: Límpido, Turvo.
- **Perlage — espumantes**:
  - Contínuo: nota de 1 a 5;
  - Fino: nota de 1 a 5;
  - Longo: nota de 1 a 5.

O perlage é opcional. Cada item deve usar um grupo de radios de 1 a 5 e oferecer
uma ação para limpar a nota. Campos sem nota são persistidos como `null`.

### Exame olfativo

- **Qualidade**: Elegante, Normal, Defeituoso.
- **Intensidade**: Muito, Normal, Pouco.
- **Duração**: Muito, Normal, Pouco.

### Gosto

- **Sabores**: Doce, Salgado, Amargo, Ácido.

### Tato

- **Alcoolicidade**: Quente, Normal, Frio.
- **Tanino**: Equilibrado, Desarmônico.

### Retrogosto / Retrolfato / Evolução

- **Descritores**: Erva, Fruta, Flores, Especiarias, Madeira, Mineral.
- **Perfume de**: texto livre opcional.
- **Equilíbrio**: Harmônico, Equilibrado, Desarmônico.
- **Evolução**: Jovem, Pronto, Defeituoso.

Todos os itens desta especificação, exceto aqueles explicitamente marcados como
obrigatórios, são opcionais.

## Persistência

Usar um banco chamado `rabachino-degustacao`, inicialmente na versão `1`, com
uma object store `fichas` e `keyPath: "id"`.

Cada ficha deve seguir esta forma conceitual:

```js
{
  id: "uuid",
  lugar: "Senac Salto",
  data: "2026-06-30",
  vinho: "Nome do vinho",
  vinhoBusca: "nome do vinho",
  tipologia: "Tinto",
  espumante: false,
  alcool: 13.5,
  produtor: "Nome do produtor",
  produtorBusca: "nome do produtor",
  safra: 2022, // ou null para "Sem Safra"
  foto: Blob | null,
  fotoNome: "rotulo.jpg",
  fotoTipo: "image/jpeg",
  visual: {
    cor: { rubi: 1, granada: -1 },
    limpidez: { limpido: 1, turvo: 0 },
    perlage: { continuo: null, fino: null, longo: null }
  },
  olfativo: {
    qualidade: { elegante: 0, normal: 1, defeituoso: 0 },
    intensidade: { muito: 0, normal: 1, pouco: 0 },
    duracao: { muito: 0, normal: 1, pouco: 0 }
  },
  gosto: {
    sabores: { doce: 0, salgado: 0, amargo: -1, acido: 1 }
  },
  tato: {
    alcoolicidade: { quente: 1, normal: 0, frio: 0 },
    tanino: { equilibrado: 1, desarmonico: 0 }
  },
  final: {
    descritores: {
      erva: 0,
      fruta: 1,
      flores: 0,
      especiarias: 0,
      madeira: -1,
      mineral: 0
    },
    perfume: "frutas vermelhas",
    equilibrio: { harmonico: 1, equilibrado: 0, desarmonico: 0 },
    evolucao: { jovem: 0, pronto: 1, defeituoso: 0 }
  },
  createdAt: "2026-06-30T15:00:00.000Z",
  updatedAt: "2026-06-30T15:00:00.000Z"
}
```

Regras de persistência:

- Gerar `id` com `crypto.randomUUID()`, com fallback seguro para navegadores que
  não ofereçam a API.
- `createdAt` nunca muda depois da criação; `updatedAt` muda a cada edição.
- Normalizar os campos auxiliares de busca removendo acentos, aparando espaços e
  convertendo para minúsculas.
- Criar índices para `createdAt`, `updatedAt`, `vinhoBusca`, `produtorBusca`,
  `tipologia` e `safra`.
- Ao migrar fichas sem o campo `espumante`, definir `true` quando qualquer nota
  de Perlage estiver preenchida; caso contrário, definir `false`.
- Fechar transações corretamente e propagar falhas; nunca indicar sucesso antes
  da conclusão da transação.
- Criar URLs de objeto para fotos somente quando necessário e revogá-las ao
  desmontar/trocar a visualização.

## Busca, filtros e ordenação

A tela inicial deve permitir:

- busca textual parcial e sem distinção de maiúsculas ou acentos por nome do
  vinho ou produtor;
- filtro por tipologia;
- filtro por safra, incluindo `Sem Safra`;
- filtro por faixa de preço (`de` e `até`) e por classificação final;
- combinação entre texto e filtros;
- limpar todos os filtros;
- mensagem clara quando nenhum resultado for encontrado.

Por padrão, mostrar as fichas mais recentes primeiro. A busca deve reagir durante
a digitação com um pequeno debounce, sem exigir botão de envio. Para o volume
esperado de dados locais, é aceitável buscar os registros no IndexedDB e combinar
os filtros em memória, desde que a UI permaneça responsiva.
Manter a busca textual visível na tela inicial e deixar os filtros avançados
recolhidos por padrão, abrindo sob ação explícita do usuário.

Cada cartão da lista deve mostrar, no mínimo, vinho, produtor, tipologia, safra
ou `Sem Safra`, data da degustação e miniatura da foto quando existir.

## Validação e feedback

- Validar no envio e também orientar o usuário junto ao campo.
- Ao encontrar erro, levar o foco ao primeiro campo inválido.
- Não apagar o formulário quando uma gravação falhar.
- Desabilitar o botão de salvar durante a transação para impedir duplicidade.
- Exibir feedback visível para inclusão, alteração e exclusão.
- Mensagens de erro devem explicar a ação possível, não apenas exibir detalhes
  técnicos.
- Sanitizar a renderização usando `textContent`; não inserir dados do usuário com
  `innerHTML`.

## Acessibilidade

- Usar landmarks, títulos em ordem lógica, `label` associado a cada campo e
  elementos nativos sempre que possível.
- Todo controle deve funcionar por teclado.
- Os controles de três estados devem expor nome, descritor e estado atual para
  tecnologias assistivas.
- Usar uma região `aria-live` para resultados de gravação, exclusão e busca.
- Não usar cor como único indicador de estado, erro ou seleção.
- Associar mensagens de validação aos campos com `aria-describedby`.

## Responsividade e compatibilidade

- Começar os estilos pela menor largura e adicionar media queries com
  `min-width`.
- Evitar rolagem horizontal em 320 px.
- Testar nas versões atuais de Chrome/Edge e Firefox, incluindo emulação mobile.
- Tratar indisponibilidade ou bloqueio do IndexedDB com uma tela de erro útil.
- Não assumir que permissões de câmera estejam disponíveis; seleção de arquivo
  deve continuar funcionando.

## Estrutura inicial sugerida

```text
/
├── index.html
├── README.md
├── assets/
│   └── grape-leaves.svg
├── css/
│   └── styles.css
└── js/
    ├── app.js
    ├── db.js
    ├── form.js
    ├── list.js
    ├── tri-state.js
    └── utils.js
```

Esta estrutura pode evoluir, mas a separação entre interface, regras de negócio
e persistência deve ser mantida.

## Critérios de aceite

- É possível criar uma ficha válida, recarregar a página e encontrá-la intacta.
- Uma ficha pode ser aberta, editada e excluída.
- A exclusão exige confirmação e remove a ficha da listagem.
- O formulário inicia com `Senac Salto`, data local atual e anos até o ano local
  atual.
- A mudança de tipologia atualiza corretamente os descritores visuais.
- Todos os descritores aceitam e persistem os estados negativo, neutro e
  positivo.
- O perlage aceita valores de 1 a 5 e pode voltar ao estado não preenchido.
- O quadro de Perlage aparece somente quando `Espumante?` está marcado como
  `Sim`, e fichas espumantes mostram `assets/images/champagne.svg` no canto
  inferior direito do registro.
- A foto pode ser adicionada, visualizada, substituída e removida.
- A busca encontra fichas parcialmente por vinho e produtor, ignorando acentos e
  maiúsculas.
- Os filtros de tipologia e safra funcionam isolados e combinados com a busca.
- A tela inicial mostra primeiro as fichas cadastradas mais recentemente.
- O app funciona sem backend e sem perder dados após fechar/reabrir o navegador.
- O fluxo principal funciona por teclado e em viewport de 320 px.
- Não há erros não tratados no console durante os fluxos principais.

## Verificação antes de concluir mudanças

Sempre verificar manualmente:

1. primeira execução com banco vazio;
2. inclusão com os campos mínimos;
3. inclusão com todos os campos, foto e perlage;
4. troca entre Branco, Rosé e Tinto;
5. persistência dos estados `−`, neutro e `+`;
6. edição sem alterar `createdAt`;
7. busca com acentos e diferenças de maiúsculas;
8. filtros combinados e opção `Sem Safra`;
9. cancelamento e confirmação de exclusão;
10. recarga da página e leitura dos dados persistidos;
11. navegação completa por teclado;
12. layout em 320 px, 768 px e desktop.

Ao alterar o esquema do banco, acrescentar um teste manual de migração usando
dados criados na versão anterior.
