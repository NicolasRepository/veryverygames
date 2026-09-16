# 🎮 Hub de Jogos

Um hub de jogos para navegador, publicado automaticamente no GitHub Pages via GitHub Actions. Cada jogo mora em sua própria pasta dentro de `games/` e tem sua própria página.

## 🌐 Como publicar (uma vez só)

1. Suba este repositório para o GitHub (veja o passo a passo abaixo).
2. No GitHub, vá em **Settings → Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.
4. Faça um push para a branch `main` (ou rode o workflow manualmente em **Actions → Deploy Hub de Jogos → Run workflow**).
5. Depois de alguns minutos, o site estará disponível em:
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`

Não é necessário configurar nada de `base path` manualmente — o build já foi ajustado para funcionar em qualquer subpasta/domínio.

## 📦 Subindo pela primeira vez

```bash
cd hub-de-jogos          # pasta descompactada do zip
git init
git add .
git commit -m "Hub de jogos inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPOSITORIO.git
git push -u origin main
```

Depois disso, ative o GitHub Pages conforme o passo 2-3 acima. Os próximos `git push` já disparam o deploy automaticamente.

## 🗂️ Estrutura do repositório

```
.
├── index.html                  # página inicial (hub)
├── .github/workflows/deploy.yml  # pipeline de build + deploy
└── games/
    ├── robot-kitchen/          # jogo em React + Vite + TypeScript (precisa de build)
    │   ├── package.json
    │   ├── vite.config.ts
    │   └── src/...
    └── cruzado/                 # jogo estático (HTML + JS puro, sem build)
        ├── index.html
        ├── script.js
        └── br-utf8.txt
```

Durante o deploy, o workflow:

1. Instala dependências e builda o **Robot Kitchen** com Vite (`npm ci && npm run build`).
2. Copia o **Cruzado** como está (é HTML/JS puro, não precisa de build).
3. Junta tudo numa pasta `site/`: `index.html` (hub) + `games/robot-kitchen/` (buildado) + `games/cruzado/` (estático).
4. Publica a pasta `site/` no GitHub Pages.

## ➕ Como adicionar um novo jogo no futuro

### Jogo estático (HTML/CSS/JS puro, sem build)

1. Crie a pasta `games/nome-do-jogo/` com o `index.html` e os demais arquivos do jogo.
2. No `index.html` do jogo, use apenas caminhos **relativos** para arquivos (ex.: `script.js`, não `/script.js`).
3. Adicione a etapa de cópia no `deploy.yml`, dentro de "Montar site final":

   ```yaml
   mkdir -p site/games/nome-do-jogo
   cp -r games/nome-do-jogo/. site/games/nome-do-jogo/
   ```

   (exclua arquivos que não devem ir pro site, como `README.md`, se necessário)

4. Adicione um novo card em `index.html` (o hub), copiando um `<a class="card">` existente e trocando `href`, emoji, título, descrição e cor (`--accent`).

### Jogo com build (Vite, React, etc.)

1. Coloque o projeto completo em `games/nome-do-jogo/`.
2. No arquivo de configuração do bundler (ex.: `vite.config.ts`), defina o `base` como `'./'` (caminho relativo) — igual foi feito no Robot Kitchen. Isso evita que o jogo quebre dependendo do domínio/subpasta onde o hub está publicado.
3. No `deploy.yml`, adicione uma etapa de install + build para esse jogo (parecido com a do Robot Kitchen) e copie o resultado (`dist/`) para `site/games/nome-do-jogo/`.
4. Adicione o card correspondente no `index.html` do hub.

## 🖥️ Rodando localmente

**Robot Kitchen:**
```bash
cd games/robot-kitchen
npm install
npm run dev
```

**Cruzado:**
Basta abrir `games/cruzado/index.html` no navegador, ou servir a pasta com qualquer servidor estático:
```bash
cd games/cruzado
npx serve .
```

**Hub (página inicial):**
Abra `index.html` diretamente no navegador — é só HTML/CSS puro, sem dependências.
