# Rabachino — Ficha de Degustação

Aplicação web mobile-first para registrar fichas de degustação no próprio
dispositivo. Não há backend: fichas e fotos são armazenadas no IndexedDB do
navegador.

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
