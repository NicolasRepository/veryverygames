let listaDePalavrasOriginal = [];
let listaDePalavrasNormalizada = [];

// Estado da Partida
let modoAtual = 2; // 2: Cruzado, 3: Tríades, 4: Quadras, 5: Cegueta, 6: Corrida, 7: Memória, 8: Inferno, 9: Permuta, 10: Mutante, 11: Cúbicos
let numPalavrasAlvo = 2;
let palavrasAtivas = [];
let cruzamentos = [];
let maxTentativas = 8;
let linhaAtual = 0;
let direcaoAtual = 'H';
let focoRow = 0;
let focoCol = 0;
const gridsDOM = [];

let tempoCorrida = 180; // Padrão 3 min (em segundos)
let timerInterval = null;
let tempoRestante = 0;

let statusTecladoPorPalavra = {};
let regraMutanteAtual = null;

let moedas = parseInt(localStorage.getItem("moedas")) || 0;

const modificadoresModo = {
    2: 100,
    9: 120,
    10: 140,
    3: 150,
    6: 150,
    7: 180,
    5: 200,
    4: 250,
    8: 350,
    11: 500
};

function salvarMoedas(qtd) {
    moedas += qtd;
    localStorage.setItem("moedas", moedas);
    atualizarDisplayMoedas();
}

function atualizarDisplayMoedas() {
    const el = document.getElementById("moedas-display");
    if (el) el.innerText = `🪙 ${moedas}`;
}

function contaVogais(str) {
    return (str.match(/[aeiou]/g) || []).length;
}

function ehVogal(c) {
    return /[aeiou]/.test(c);
}

function ehConsoante(c) {
    return /[bcdfghjklmnpqrstvwxyz]/.test(c);
}

function semRepetidas(str) {
    return new Set(str).size === str.length;
}

function temRepetidas(str) {
    return new Set(str).size < str.length;
}

const regrasMutante = [
    { desc: "Proibido usar a letra A", validar: (p1, p2) => !p1.includes("a") && !p2.includes("a") },
    { desc: "Proibido usar a letra E", validar: (p1, p2) => !p1.includes("e") && !p2.includes("e") },
    { desc: "Proibido usar a letra I", validar: (p1, p2) => !p1.includes("i") && !p2.includes("i") },
    { desc: "Proibido usar a letra O", validar: (p1, p2) => !p1.includes("o") && !p2.includes("o") },
    { desc: "Proibido usar a letra U", validar: (p1, p2) => !p1.includes("u") && !p2.includes("u") },
    { desc: "Cada palavra deve ter exatamente 3 vogais", validar: (p1, p2) => contaVogais(p1) === 3 && contaVogais(p2) === 3 },
    { desc: "Proibido usar a letra R", validar: (p1, p2) => !p1.includes("r") && !p2.includes("r") },
    { desc: "Proibido usar a letra S", validar: (p1, p2) => !p1.includes("s") && !p2.includes("s") },
    { desc: "Ambas as palavras devem começar com consoante", validar: (p1, p2) => ehConsoante(p1[0]) && ehConsoante(p2[0]) },
    { desc: "Ambas as palavras devem terminar com vogal", validar: (p1, p2) => ehVogal(p1[6]) && ehVogal(p2[6]) },
    { desc: "Proibido usar a letra L", validar: (p1, p2) => !p1.includes("l") && !p2.includes("l") },
    { desc: "Ambas as palavras devem ter pelo menos 3 vogais", validar: (p1, p2) => contaVogais(p1) >= 3 && contaVogais(p2) >= 3 },
    { desc: "Proibido usar as letras M e N", validar: (p1, p2) => !p1.includes("m") && !p2.includes("m") && !p1.includes("n") && !p2.includes("n") },
    { desc: "Ambas as palavras não podem repetir letras internamente", validar: (p1, p2) => semRepetidas(p1) && semRepetidas(p2) },
    { desc: "Ambas as palavras devem ter pelo menos 1 letra repetida", validar: (p1, p2) => temRepetidas(p1) && temRepetidas(p2) }
];

function sortearRegraMutante() {
    const idx = Math.floor(Math.random() * regrasMutante.length);
    regraMutanteAtual = regrasMutante[idx];
    const el = document.getElementById("display-regra-mutante");
    if (el) {
        el.innerText = `🧬 Regra: ${regraMutanteAtual.desc}`;
    }
}

function obterInfoLetrasPermuta() {
    if (!palavrasAtivas || palavrasAtivas.length < 2) return "";
    const pH = palavrasAtivas.find(p => p.orien === 'H');
    const pV = palavrasAtivas.find(p => p.orien === 'V');
    if (!pH || !pV) return "";

    const letrasH = pH.orig.split("");
    const letrasV = pV.orig.split("");
    letrasV.splice(pH.fixedPos, 1);

    const todasLetras = letrasH.concat(letrasV);
    const contagem = {};
    todasLetras.forEach(l => {
        contagem[l] = (contagem[l] || 0) + 1;
    });
    return Object.keys(contagem).sort().map(l => `${l}: ${contagem[l]}`).join(" | ");
}

function normalizarTexto(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/g, "c");
}

async function carregarDicionario() {
    try {
        const url = 'br-utf8.txt';
        const resposta = await fetch(url);
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }

        const texto = await resposta.text();
        const palavrasFiltradas = texto
            .split(/\r?\n/)
            .map(p => p.trim())
            .filter(p => p.length === 7);

        listaDePalavrasOriginal = palavrasFiltradas.map(p => p.toUpperCase());
        listaDePalavrasNormalizada = palavrasFiltradas.map(p => normalizarTexto(p));

        iniciarJogo(2);
    } 
    catch (erro) {
        console.error("Erro ao carregar o dicionário:", erro);
        alert("Erro ao carregar o dicionário. Se estiver executando localmente, abra o HTML utilizando um servidor local (ex: Live Server).");
    }
}

function gerarCruzamentoValido(qtd) {
    palavrasAtivas = [];
    cruzamentos = [];

    if (qtd === 2) {
        while (true) {
            const idx1 = Math.floor(Math.random() * listaDePalavrasOriginal.length);
            const r1 = Math.floor(Math.random() * 5) + 1;
            const h1Norm = listaDePalavrasNormalizada[idx1];

            const colunasValidas = [];
            for (let c = 0; c < 7; c++) {
                const char = h1Norm[c];
                const candV = [];
                for (let i = 0; i < listaDePalavrasNormalizada.length; i++) {
                    if (i !== idx1 && listaDePalavrasNormalizada[i][r1] === char) {
                        candV.push(i);
                    }
                }
                if (candV.length > 0) {
                    colunasValidas.push({ col: c, candidatos: candV });
                }
            }

            if (colunasValidas.length > 0) {
                const escolhaCol = colunasValidas[Math.floor(Math.random() * colunasValidas.length)];
                const idx2 = escolhaCol.candidatos[Math.floor(Math.random() * escolhaCol.candidatos.length)];
                const c1 = escolhaCol.col;

                palavrasAtivas.push({ id: 0, orien: 'H', fixedPos: r1, orig: listaDePalavrasOriginal[idx1], norm: h1Norm });
                palavrasAtivas.push({ id: 1, orien: 'V', fixedPos: c1, orig: listaDePalavrasOriginal[idx2], norm: listaDePalavrasNormalizada[idx2] });
                cruzamentos.push({ row: r1, col: c1, palHIdx: 0, posH: c1, palVIdx: 1, posV: r1 });
                return true;
            }
        }
    }

    if (qtd === 3) {
        for (let t = 0; t < 500; t++) {
            const r1 = Math.floor(Math.random() * 3) + 1;
            const r2 = Math.floor(Math.random() * 3) + 4;
            const c1 = Math.floor(Math.random() * 5) + 1;

            const idxH1 = Math.floor(Math.random() * listaDePalavrasOriginal.length);
            const h1Norm = listaDePalavrasNormalizada[idxH1];

            const candV1 = [];
            for (let i = 0; i < listaDePalavrasNormalizada.length; i++) {
                if (i !== idxH1 && listaDePalavrasNormalizada[i][r1] === h1Norm[c1]) {
                    candV1.push(i);
                }
            }
            if (candV1.length === 0) continue;
            const idxV1 = candV1[Math.floor(Math.random() * candV1.length)];
            const v1Norm = listaDePalavrasNormalizada[idxV1];

            const candH2 = [];
            for (let i = 0; i < listaDePalavrasNormalizada.length; i++) {
                if (i !== idxH1 && i !== idxV1 && listaDePalavrasNormalizada[i][c1] === v1Norm[r2]) {
                    candH2.push(i);
                }
            }
            if (candH2.length === 0) continue;
            const idxH2 = candH2[Math.floor(Math.random() * candH2.length)];
            const h2Norm = listaDePalavrasNormalizada[idxH2];

            palavrasAtivas.push({ id: 0, orien: 'H', fixedPos: r1, orig: listaDePalavrasOriginal[idxH1], norm: h1Norm });
            palavrasAtivas.push({ id: 1, orien: 'V', fixedPos: c1, orig: listaDePalavrasOriginal[idxV1], norm: v1Norm });
            palavrasAtivas.push({ id: 2, orien: 'H', fixedPos: r2, orig: listaDePalavrasOriginal[idxH2], norm: h2Norm });

            cruzamentos.push({ row: r1, col: c1, palHIdx: 0, posH: c1, palVIdx: 1, posV: r1 });
            cruzamentos.push({ row: r2, col: c1, palHIdx: 2, posH: c1, palVIdx: 1, posV: r2 });
            return true;
        }
    }

    if (qtd === 4) {
        for (let t = 0; t < 1000; t++) {
            const r1 = Math.floor(Math.random() * 3) + 1;
            const r2 = Math.floor(Math.random() * 2) + 4;
            const c1 = Math.floor(Math.random() * 3) + 1;
            const c2 = Math.floor(Math.random() * 2) + 4;

            const idxH1 = Math.floor(Math.random() * listaDePalavrasOriginal.length);
            const h1Norm = listaDePalavrasNormalizada[idxH1];

            const idxH2 = Math.floor(Math.random() * listaDePalavrasOriginal.length);
            if (idxH2 === idxH1) continue;
            const h2Norm = listaDePalavrasNormalizada[idxH2];

            const charV1_r1 = h1Norm[c1];
            const charV1_r2 = h2Norm[c1];

            const candV1 = [];
            for (let i = 0; i < listaDePalavrasNormalizada.length; i++) {
                if (i !== idxH1 && i !== idxH2) {
                    const w = listaDePalavrasNormalizada[i];
                    if (w[r1] === charV1_r1 && w[r2] === charV1_r2) {
                        candV1.push(i);
                    }
                }
            }
            if (candV1.length === 0) continue;

            const charV2_r1 = h1Norm[c2];
            const charV2_r2 = h2Norm[c2];

            const candV2 = [];
            for (let i = 0; i < listaDePalavrasNormalizada.length; i++) {
                if (i !== idxH1 && i !== idxH2) {
                    const w = listaDePalavrasNormalizada[i];
                    if (w[r1] === charV2_r1 && w[r2] === charV2_r2) {
                        candV2.push(i);
                    }
                }
            }

            const candV2Validos = candV1.length === 1 ? candV2.filter(idx => idx !== candV1[0]) : candV2;
            if (candV2Validos.length === 0) continue;

            const idxV1 = candV1[Math.floor(Math.random() * candV1.length)];
            let idxV2 = candV2Validos[Math.floor(Math.random() * candV2Validos.length)];
            if (idxV1 === idxV2) {
                const altV2 = candV2Validos.filter(idx => idx !== idxV1);
                if (altV2.length === 0) continue;
                idxV2 = altV2[Math.floor(Math.random() * altV2.length)];
            }

            const v1Norm = listaDePalavrasNormalizada[idxV1];
            const v2Norm = listaDePalavrasNormalizada[idxV2];

            palavrasAtivas.push({ id: 0, orien: 'H', fixedPos: r1, orig: listaDePalavrasOriginal[idxH1], norm: h1Norm });
            palavrasAtivas.push({ id: 1, orien: 'V', fixedPos: c1, orig: listaDePalavrasOriginal[idxV1], norm: v1Norm });
            palavrasAtivas.push({ id: 2, orien: 'H', fixedPos: r2, orig: listaDePalavrasOriginal[idxH2], norm: h2Norm });
            palavrasAtivas.push({ id: 3, orien: 'V', fixedPos: c2, orig: listaDePalavrasOriginal[idxV2], norm: v2Norm });

            cruzamentos.push({ row: r1, col: c1, palHIdx: 0, posH: c1, palVIdx: 1, posV: r1 });
            cruzamentos.push({ row: r2, col: c1, palHIdx: 2, posH: c1, palVIdx: 1, posV: r2 });
            cruzamentos.push({ row: r1, col: c2, palHIdx: 0, posH: c2, palVIdx: 3, posV: r1 });
            cruzamentos.push({ row: r2, col: c2, palHIdx: 2, posH: c2, palVIdx: 3, posV: r2 });

            return true;
        }
    }

    if (qtd === 8) {
        const patternMap = new Map();
        for (let i = 0; i < listaDePalavrasNormalizada.length; i++) {
            const w = listaDePalavrasNormalizada[i];
            const pattern = w[0] + w[2] + w[4] + w[6];
            if (!patternMap.has(pattern)) {
                patternMap.set(pattern, []);
            }
            patternMap.get(pattern).push(i);
        }

        const rows = [0, 2, 4, 6];
        const cols = [0, 2, 4, 6];
        const maxTentativasSorteio = 2000;

        for (let t = 0; t < maxTentativasSorteio; t++) {
            const idxV = [];
            const usedIndices = new Set();
            let falhouV = false;

            for (let j = 0; j < 4; j++) {
                const randIdx = Math.floor(Math.random() * listaDePalavrasOriginal.length);
                if (usedIndices.has(randIdx)) {
                    falhouV = true;
                    break;
                }
                usedIndices.add(randIdx);
                idxV.push(randIdx);
            }
            if (falhouV) continue;

            const vNorms = idxV.map(idx => listaDePalavrasNormalizada[idx]);
            const idxH = [];
            let possivel = true;

            for (let i = 0; i < 4; i++) {
                const reqPattern = vNorms[0][rows[i]] + vNorms[1][rows[i]] + vNorms[2][rows[i]] + vNorms[3][rows[i]];
                const candidatos = patternMap.get(reqPattern);
                if (!candidatos) {
                    possivel = false;
                    break;
                }

                const validos = candidatos.filter(idx => !usedIndices.has(idx));
                if (validos.length === 0) {
                    possivel = false;
                    break;
                }

                const escolhido = validos[Math.floor(Math.random() * validos.length)];
                usedIndices.add(escolhido);
                idxH.push(escolhido);
            }

            if (possivel) {
                for (let i = 0; i < 4; i++) {
                    const idx = idxH[i];
                    palavrasAtivas.push({
                        id: i,
                        orien: 'H',
                        fixedPos: rows[i],
                        orig: listaDePalavrasOriginal[idx],
                        norm: listaDePalavrasNormalizada[idx]
                    });
                }
                for (let j = 0; j < 4; j++) {
                    const idx = idxV[j];
                    palavrasAtivas.push({
                        id: 4 + j,
                        orien: 'V',
                        fixedPos: cols[j],
                        orig: listaDePalavrasOriginal[idx],
                        norm: listaDePalavrasNormalizada[idx]
                    });
                }

                cruzamentos = [];
                for (let i = 0; i < 4; i++) {
                    for (let j = 0; j < 4; j++) {
                        cruzamentos.push({
                            row: rows[i],
                            col: cols[j],
                            palHIdx: i,
                            posH: cols[j],
                            palVIdx: 4 + j,
                            posV: rows[i]
                        });
                    }
                }
                return true;
            }
        }

        alert("Não foi possível sortear um tabuleiro válido para o modo Cúbicos. Tente novamente!");
        return false;
    }
}

function iniciarTimer(segundos) {
    if (timerInterval) clearInterval(timerInterval);
    tempoRestante = segundos;
    atualizarDisplayTimer();

    timerInterval = setInterval(() => {
        tempoRestante--;
        atualizarDisplayTimer();

        if (tempoRestante <= 0) {
            clearInterval(timerInterval);
            tempoEsgotado();
        }
    }, 1000);
}

function atualizarDisplayTimer() {
    const timerEl = document.getElementById("timer-display");
    if (!timerEl) return;
    const min = Math.floor(tempoRestante / 60);
    const seg = tempoRestante % 60;
    timerEl.innerText = `⏱️ ${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

function tempoEsgotado() {
    linhaAtual = maxTentativas;
    let resumoPalavras = palavrasAtivas.map(p => `<p><strong>${p.orien === 'H' ? 'Horizontal' : 'Vertical'}:</strong> ${p.orig}</p>`).join("");
    exibirModal("Tempo Esgotado! ⏱️", `
        <p>O tempo acabou! As palavras eram:</p>
        ${resumoPalavras}
    `, "Tentar Novamente", () => iniciarJogo(modoAtual));
}

function iniciarJogo(modo) {
    if (timerInterval) clearInterval(timerInterval);

    modoAtual = modo;
    if (modo === 3) numPalavrasAlvo = 3;
    else if (modo === 4) numPalavrasAlvo = 4;
    else if (modo === 11) numPalavrasAlvo = 8;
    else numPalavrasAlvo = 2;
    
    if (modo === 2 || modo === 9 || modo === 10) maxTentativas = 8;
    else if (modo === 3) maxTentativas = 10;
    else if (modo === 4) maxTentativas = 12;
    else if (modo === 5 || modo === 11) maxTentativas = Infinity;
    else if (modo === 6 || modo === 7 || modo === 8) maxTentativas = 10;

    const coresFundo = {
        2: "#555555",
        3: "#555555",
        4: "#555555",
        5: "#181818",
        6: "#1e3a5f",
        7: "#3b1e4c",
        8: "#451212",
        9: "#1b4332",
        10: "#5c0029",
        11: "#2b1d38"
    };

    document.body.style.backgroundColor = coresFundo[modo] || "#555555";

    linhaAtual = 0;
    direcaoAtual = 'H';
    statusTecladoPorPalavra = {};

    const gerado = gerarCruzamentoValido(numPalavrasAlvo);
    if (gerado === false) return;

    if (modo === 10) {
        sortearRegraMutante();
    }

    const p1 = palavrasAtivas.find(p => p.orien === 'H') || palavrasAtivas[0];
    if (p1.orien === 'H') {
        focoRow = p1.fixedPos;
        focoCol = 0;
    } else {
        focoRow = 0;
        focoCol = p1.fixedPos;
    }

    const tabuleiro = document.getElementById("tabuleiro");
    tabuleiro.innerHTML = "";

    const antigoEstilo = document.getElementById("estilo-jogo");
    if (antigoEstilo) antigoEstilo.remove();

    const estiloGrid = document.createElement('style');
    estiloGrid.id = "estilo-jogo";
    
    estiloGrid.innerHTML = `
        body, html {
            margin: 0;
            padding: 0;
            overflow: hidden;
            width: 100%;
            height: 100%;
            height: 100dvh; /* Garante que respeite a barra do navegador mobile */
            transition: background-color 0.3s ease;
        }

        #tabuleiro {
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            width: 100%;
            height: 100dvh;
            max-width: 1600px;
            margin: 0 auto;
            box-sizing: border-box;
            overflow: hidden;
        }

        .bar-menu {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 800px;
            margin-bottom: 5px;
            flex-shrink: 0;
        }

        .modos-container {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .btn-modo {
            background: rgba(0,0,0,0.3);
            color: #aaa;
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 6px;
            padding: 6px 14px;
            font-weight: bold;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-modo.ativo {
            background: #3aa394;
            color: #fff;
            border-color: #3aa394;
        }

        .btn-ajuda {
            background: rgba(255,255,255,0.2);
            color: #fff;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            font-weight: bold;
            font-size: 20px;
            cursor: pointer;
        }

        .painel-subsecao {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-top: 4px;
        }

        .titulo-modo {
            color: #fff;
            font-size: 28px;
            font-weight: bold;
            text-align: center;
            font-family: sans-serif;
            flex-shrink: 0;
        }

        .timer-display {
            color: #ffeb3b;
            font-size: 24px;
            font-weight: bold;
            font-family: monospace;
            background: rgba(0,0,0,0.4);
            padding: 4px 12px;
            border-radius: 6px;
            border: 1px solid rgba(255,235,59,0.3);
        }

        .tempo-selector {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .btn-tempo {
            background: rgba(0, 0, 0, 0.4);
            color: #ccc;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
        }

        .btn-tempo.ativo {
            background: #3aa394;
            color: #fff;
            border-color: #3aa394;
        }

        .historico-tentativas {
            position: absolute;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 85vh;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            width: fit-content;
        }

        .historico-tentativas::-webkit-scrollbar {
            width: 8px;
        }

        .historico-tentativas::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.3);
            border-radius: 4px;
        }

        .card-tentativa-cegueta {
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(0, 0, 0, 0.4);
            padding: 6px 12px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .resumo-cegueta {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 14px;
            font-weight: bold;
            font-family: sans-serif;
        }

        .tag-cor {
            padding: 3px 8px;
            border-radius: 4px;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .tag-verde { background-color: #3aa394; }
        .tag-amarelo { background-color: #d3ad69; }
        .tag-roxo { background-color: #9c27b0; }

        #area-entrada {
            display: flex;
            justify-content: center;
            align-items: center;
            flex-grow: 1;
            min-height: 0;
            padding: 5px 0;
            width: 100%;
        }

        .tabuleiro-tentativa {
            display: grid;
            grid-template-columns: repeat(7, min(6.5vh, 58px));
            grid-template-rows: repeat(7, min(6.5vh, 58px));
            gap: 4px;
        }

        .tabuleiro-tentativa.mini {
            grid-template-columns: repeat(7, 18px);
            grid-template-rows: repeat(7, 18px);
            gap: 3px;
            width: fit-content;
        }

        .letra {
            width: 100%;
            height: 100%;
            color: #ccc;
            border: 2px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: min(4vh, 26px);
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            background: rgba(255, 255, 255, 0.1);
            user-select: none;
            box-sizing: border-box;
            border-radius: 6px;
        }

        .mini .letra {
            font-size: 10px;
            border-width: 1px;
            border-radius: 2px;
        }

        .letra.escondida {
            border: none !important;
            background: transparent !important;
            cursor: default;
        }

        .letra.focada {
            border-color: #fff !important;
            border-bottom: 5px solid #3aa394 !important;
            background: rgba(255, 255, 255, 0.25);
        }

        .correta { background-color: #3aa394 !important; color: white; border-color: #3aa394; }
        .lugar-errado { background-color: #d3ad69 !important; color: white; border-color: #d3ad69; }
        .errada { background-color: rgba(0,0,0,0.6) !important; color: white; border-color: rgba(0,0,0,0.6); }
        .cruzamento-duplo { background-color: #9c27b0 !important; color: white; border-color: #9c27b0; }

        #teclado {
            display: flex;
            flex-direction: column;
            gap: 4px;
            align-items: center;
            margin-bottom: max(5px, env(safe-area-inset-bottom));
            user-select: none;
            width: 100%;
            max-width: 680px;
            flex-shrink: 0;
        }

        .linha-teclado {
            display: flex;
            gap: 4px;
            width: 100%;
            justify-content: center;
        }

        .tecla {
            height: min(6vh, 48px);
            min-width: 0;
            flex: 1;
            padding: 0 2px;
            background-color: rgba(0, 0, 0, 0.35);
            color: #fff;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
        }

        .tecla:hover { opacity: 0.9; }
        .tecla:active { transform: scale(0.96); }

        .tecla.especial {
            flex: 1.4;
            font-size: 13px;
            background-color: rgba(0, 0, 0, 0.5);
        }

        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .modal-conteudo {
            background: #222;
            color: #fff;
            padding: 25px;
            border-radius: 8px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
            font-family: sans-serif;
            text-align: center;
        }

        .modal-conteudo h2 {
            margin-top: 0;
            color: #3aa394;
        }

        .modal-conteudo p, .modal-conteudo ul {
            text-align: left;
            font-size: 15px;
            line-height: 1.5;
            color: #ddd;
        }

        .modal-conteudo ul {
            padding-left: 20px;
        }

        .modal-btn {
            margin-top: 15px;
            padding: 10px 20px;
            background-color: #3aa394;
            color: white;
            border: none;
            border-radius: 4px;
            font-weight: bold;
            cursor: pointer;
            font-size: 16px;
        }

        @media (max-width: 600px), (max-height: 700px) {
            #tabuleiro {
                padding: 4px;
            }

            .bar-menu {
                margin-bottom: 2px;
            }

            .btn-modo {
                padding: 3px 6px;
                font-size: 11px;
                border-radius: 4px;
            }

            .btn-ajuda {
                width: 26px;
                height: 26px;
                font-size: 14px;
            }

            .painel-subsecao {
                gap: 6px;
                margin-top: 2px;
            }

            .titulo-modo {
                font-size: 16px;
            }

            .timer-display {
                font-size: 13px !important;
                padding: 2px 6px;
            }

            .btn-tempo {
                padding: 2px 4px;
                font-size: 10px;
            }

            .tabuleiro-tentativa {
                grid-template-columns: repeat(7, min(4.4vh, 38px));
                grid-template-rows: repeat(7, min(4.4vh, 38px));
                gap: 2px;
            }

            .letra {
                font-size: min(2.6vh, 18px);
                border-radius: 4px;
                border-width: 1px;
            }

            .letra.focada {
                border-bottom-width: 3px !important;
            }

            .historico-tentativas {
                position: static;
                transform: none;
                flex-direction: row;
                max-height: none;
                max-width: 100%;
                overflow-x: auto;
                overflow-y: hidden;
                padding-right: 0;
                padding-bottom: 2px;
                margin-bottom: 2px;
            }

            .tabuleiro-tentativa.mini {
                grid-template-columns: repeat(7, 10px);
                grid-template-rows: repeat(7, 10px);
                gap: 1px;
            }

            .mini .letra {
                font-size: 6px;
            }

            .card-tentativa-cegueta {
                padding: 2px 4px;
                gap: 4px;
            }

            .resumo-cegueta {
                font-size: 9px;
                gap: 1px;
            }

            .tag-cor {
                padding: 1px 3px;
            }

            #teclado {
                gap: 3px;
                margin-bottom: max(3px, env(safe-area-inset-bottom));
            }

            .linha-teclado {
                gap: 2px;
            }

            .tecla {
                height: min(5vh, 40px);
                font-size: 12px;
                border-radius: 4px;
            }

            .tecla.especial {
                font-size: 10px;
            }
        }
    `;
    document.head.appendChild(estiloGrid);

    criarTabuleiro();

    if (modo === 6) {
        iniciarTimer(tempoCorrida);
    } else if (modo === 8) {
        iniciarTimer(180);
    }
}

function obterNomeModo(modo) {
    if (modo === 2) return "Cruzado";
    if (modo === 3) return "Tríades";
    if (modo === 4) return "Quadras";
    if (modo === 5) return "Cegueta";
    if (modo === 6) return "Corrida";
    if (modo === 7) return "Memória";
    if (modo === 8) return "Inferno";
    if (modo === 9) return "Permuta";
    if (modo === 10) return "Mutante";
    if (modo === 11) return "Cúbicos";
    return "";
}

function exibirModal(titulo, htmlConteudo, textoBotao = "Fechar", callback = null) {
    const modalExistente = document.getElementById("modal-customizado");
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "modal-customizado";

    const conteudo = document.createElement("div");
    conteudo.className = "modal-conteudo";

    conteudo.innerHTML = `
        <h2>${titulo}</h2>
        <div>${htmlConteudo}</div>
        <button class="modal-btn" id="btn-fechar-modal">${textoBotao}</button>
    `;

    overlay.appendChild(conteudo);
    document.body.appendChild(overlay);

    document.getElementById("btn-fechar-modal").addEventListener("click", () => {
        overlay.remove();
        if (callback) callback();
    });
}

function exibirModalComoJogar() {
    let regrasModo = "";
    
    if (modoAtual === 2) {
        regrasModo = "<p><strong>Modo Cruzado:</strong> Adivinhe as <strong>2 palavras cruzadas</strong> em até <strong>8 tentativas</strong>.</p>";
    } else if (modoAtual === 3) {
        regrasModo = "<p><strong>Modo Tríades:</strong> Adivinhe as <strong>3 palavras cruzadas</strong> em até <strong>10 tentativas</strong>.</p>";
    } else if (modoAtual === 4) {
        regrasModo = "<p><strong>Modo Quadras:</strong> Adivinhe as <strong>4 palavras cruzadas</strong> em até <strong>12 tentativas</strong>.</p>";
    } else if (modoAtual === 5) {
        regrasModo = "<p><strong>Modo Cegueta:</strong> Tentativas ilimitadas para 2 palavras. Apenas contadores de acertos são exibidos.</p>";
    } else if (modoAtual === 6) {
        regrasModo = "<p><strong>Modo Corrida:</strong> 10 tentativas para 2 palavras contra o relógio (1, 3 ou 5 minutos)!</p>";
    } else if (modoAtual === 7) {
        regrasModo = "<p><strong>Modo Memória:</strong> 10 tentativas para 2 palavras. Apenas a sua última tentativa permanece visível!</p>";
    } else if (modoAtual === 8) {
        regrasModo = "<p><strong>Modo Inferno:</strong> O desafio supremo! Apenas a última tentativa é exibida, limite de 3 minutos e apenas o contador de acertos da Cegueta!</p>";
    } else if (modoAtual === 9) {
        regrasModo = "<p><strong>Modo Permuta:</strong> Como o cruzado normal, mas as letras de ambas as palavras juntas e suas quantidades são exibidas embaralhadas. Descubra a ordem correta!</p>";
    } else if (modoAtual === 10) {
        regrasModo = "<p><strong>Modo Mutante:</strong> Adivinhe as 2 palavras cruzadas em até 8 tentativas, mas respeite a regra especial exigida antes de cada tentativa!</p>";
    } else if (modoAtual === 11) {
        regrasModo = "<p><strong>Modo Cúbicos:</strong> Tentativas ilimitadas para 8 palavras cruzadas (4 horizontais e 4 verticais).</p>";
    }

    const regras = `
        <p>Digite palavras válidas de 7 letras e pressione <strong>ENTER</strong> para enviar sua tentativa.</p>
        <hr style="border-color: #444; margin: 10px 0;">
        ${regrasModo}
        <hr style="border-color: #444; margin: 10px 0;">
        <p><strong>Significado das Cores:</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
            <li><strong style="color: #3aa394;">Verde:</strong> A letra está na posição correta.</li>
            <li><strong style="color: #d3ad69;">Amarelo:</strong> A letra pertence à palavra, mas está na posição errada.</li>
            <li><strong style="color: #9c27b0;">Roxo:</strong> Presente nos cruzamentos! A letra pertence às duas palavras, mas está fora do lugar.</li>
            <li><strong style="color: #888;">Cinza:</strong> A letra não pertence à palavra.</li>
        </ul>
    `;
    exibirModal("Como Jogar", regras, "Entendi");
}

function celulaExiste(r, c) {
    if (r < 0 || r >= 7 || c < 0 || c >= 7) return false;
    const ehH = palavrasAtivas.some(p => p.orien === 'H' && p.fixedPos === r);
    const ehV = palavrasAtivas.some(p => p.orien === 'V' && p.fixedPos === c);
    return ehH || ehV;
}

function avancarNaDirecao() {
    if (direcaoAtual === 'H') {
        if (celulaExiste(focoRow, focoCol + 1)) focoCol++;
    } else {
        if (celulaExiste(focoRow + 1, focoCol)) focoRow++;
    }
}

function recuarNaDirecao() {
    if (direcaoAtual === 'H') {
        if (celulaExiste(focoRow, focoCol - 1)) focoCol--;
    } else {
        if (celulaExiste(focoRow - 1, focoCol)) focoRow--;
    }
}

function processarEntrada(tecla) {
    if (linhaAtual >= maxTentativas || listaDePalavrasOriginal.length === 0) return;

    if (tecla === "ENTER") {
        verificarPalavras();
        return;
    }

    if (tecla === "BACKSPACE") {
        const celula = obterCelulaAtual();
        if (celula && celula.innerText !== "") {
            celula.innerText = "";
        } else {
            recuarNaDirecao();
            const celulaAnterior = obterCelulaAtual();
            if (celulaAnterior) celulaAnterior.innerText = "";
        }
        atualizarFoco();
        return;
    }

    if (tecla === "ARROWRIGHT") {
        if (celulaExiste(focoRow, focoCol + 1)) { focoCol++; direcaoAtual = 'H'; atualizarFoco(); }
        return;
    }
    if (tecla === "ARROWLEFT") {
        if (celulaExiste(focoRow, focoCol - 1)) { focoCol--; direcaoAtual = 'H'; atualizarFoco(); }
        return;
    }
    if (tecla === "ARROWDOWN") {
        if (celulaExiste(focoRow + 1, focoCol)) { focoRow++; direcaoAtual = 'V'; atualizarFoco(); }
        return;
    }
    if (tecla === "ARROWUP") {
        if (celulaExiste(focoRow - 1, focoCol)) { focoRow--; direcaoAtual = 'V'; atualizarFoco(); }
        return;
    }

    if (/^[A-Z]$/.test(tecla)) {
        const celula = obterCelulaAtual();
        if (celula) {
            celula.innerText = tecla;
            avancarNaDirecao();
            atualizarFoco();
        }
    }
}

document.addEventListener("keydown", (evento) => {
    processarEntrada(evento.key.toUpperCase());
});

function criarGridBase(tentativa, ehMini) {
    const container = document.createElement("div");
    container.className = `tabuleiro-tentativa ${ehMini ? 'mini' : 'principal'}`;
    container.id = ehMini ? `tentativa-${tentativa}` : 'grid-principal';

    const celulas = [];

    for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
            const caixa = document.createElement("div");
            
            const palsH = palavrasAtivas.filter(p => p.orien === 'H' && p.fixedPos === r);
            const palsV = palavrasAtivas.filter(p => p.orien === 'V' && p.fixedPos === c);

            const ehH = palsH.length > 0;
            const ehV = palsV.length > 0;

            if (ehH || ehV) {
                caixa.className = "letra";
                caixa.dataset.row = r;
                caixa.dataset.col = c;

                if (ehH && ehV) caixa.dataset.tipo = "intersecao";
                else if (ehH) caixa.dataset.tipo = "horizontal";
                else caixa.dataset.tipo = "vertical";

                if (!ehMini) {
                    caixa.addEventListener("click", () => focarCelulaPorPos(r, c));
                }
            } else {
                caixa.className = "letra escondida";
            }
            
            container.appendChild(caixa);
            if (ehH || ehV) celulas.push(caixa);
        }
    }

    return { container, celulas };
}

function criarTecladoVirtual() {
    const tecladoContainer = document.createElement("div");
    tecladoContainer.id = "teclado";

    const layout = [
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"]
    ];

    layout.forEach(linha => {
        const linhaDiv = document.createElement("div");
        linhaDiv.className = "linha-teclado";

        linha.forEach(tecla => {
            const botao = document.createElement("button");
            botao.className = "tecla";
            
            if (tecla === "ENTER") {
                botao.innerText = "ENTER";
                botao.classList.add("especial");
            } else if (tecla === "BACKSPACE") {
                botao.innerText = "⌫";
                botao.classList.add("especial");
            } else {
                botao.innerText = tecla;
            }

            botao.dataset.key = tecla;
            botao.addEventListener("mousedown", (e) => e.preventDefault());
            botao.addEventListener("click", () => processarEntrada(tecla));

            linhaDiv.appendChild(botao);
        });

        tecladoContainer.appendChild(linhaDiv);
    });

    return tecladoContainer;
}

function atualizarStatusTecladoGradiente(letra, idxPalavra, novoStatus) {
    if (modoAtual === 5 || modoAtual === 8) return;

    const letraNorm = normalizarTexto(letra).toUpperCase();
    const botao = document.querySelector(`.tecla[data-key="${letraNorm}"]`);
    if (!botao) return;

    if (!statusTecladoPorPalavra[letraNorm]) {
        statusTecladoPorPalavra[letraNorm] = Array(numPalavrasAlvo).fill("pendente");
    }

    const prioridades = { "correta": 4, "lugar-errado": 3, "errada": 2, "pendente": 1 };
    const statusAtual = statusTecladoPorPalavra[letraNorm][idxPalavra];

    if (prioridades[novoStatus] > prioridades[statusAtual]) {
        statusTecladoPorPalavra[letraNorm][idxPalavra] = novoStatus;
    }

    const paletaCores = {
        "correta": "#3aa394",
        "lugar-errado": "#d3ad69",
        "errada": "rgba(0,0,0,0.6)",
        "pendente": "rgba(0,0,0,0.35)"
    };

    const statusArray = statusTecladoPorPalavra[letraNorm];
    const pctStep = 100 / numPalavrasAlvo;
    const gradientStops = [];

    for (let i = 0; i < numPalavrasAlvo; i++) {
        const cor = paletaCores[statusArray[i]] || "rgba(0,0,0,0.35)";
        const start = i * pctStep;
        const end = (i + 1) * pctStep;
        gradientStops.push(`${cor} ${start}% ${end}%`);
    }

    botao.style.background = `linear-gradient(to right, ${gradientStops.join(", ")})`;
}

function criarTabuleiro() {
    const tabuleiro = document.getElementById("tabuleiro");
    
    const topContainer = document.createElement("div");
    topContainer.style.display = "flex";
    topContainer.style.flexDirection = "column";
    topContainer.style.alignItems = "center";
    topContainer.style.width = "100%";

    const barMenu = document.createElement("div");
    barMenu.className = "bar-menu";

    const modosContainer = document.createElement("div");
    modosContainer.className = "modos-container";

    const modosInfo = [
        { key: 2, label: "Cruzado" },
        { key: 3, label: "Tríades" },
        { key: 4, label: "Quadras" },
        { key: 5, label: "Cegueta" },
        { key: 6, label: "Corrida" },
        { key: 7, label: "Memória" },
        { key: 8, label: "Inferno" },
        { key: 9, label: "Permuta" },
        { key: 10, label: "Mutante" },
        { key: 11, label: "Cúbicos" }
    ];

    modosInfo.forEach(m => {
        const btn = document.createElement("button");
        btn.className = `btn-modo ${modoAtual === m.key ? 'ativo' : ''}`;
        btn.innerText = m.label;
        btn.onclick = () => iniciarJogo(m.key);
        modosContainer.appendChild(btn);
    });

    const btnAjuda = document.createElement("button");
    btnAjuda.className = "btn-ajuda";
    btnAjuda.innerText = "?";
    btnAjuda.onclick = exibirModalComoJogar;

    barMenu.appendChild(modosContainer);
    barMenu.appendChild(btnAjuda);

    const painelSubsecao = document.createElement("div");
    painelSubsecao.className = "painel-subsecao";

    const tituloModo = document.createElement("div");
    tituloModo.className = "titulo-modo";
    tituloModo.innerText = obterNomeModo(modoAtual);
    painelSubsecao.appendChild(tituloModo);

    const moedasDisplay = document.createElement("div");
    moedasDisplay.className = "timer-display";
    moedasDisplay.id = "moedas-display";
    moedasDisplay.style.fontSize = "16px";
    moedasDisplay.style.color = "#ffd700";
    moedasDisplay.style.borderColor = "rgba(255, 215, 0, 0.3)";
    moedasDisplay.innerText = `🪙 ${moedas}`;
    painelSubsecao.appendChild(moedasDisplay);

    if (modoAtual === 6 || modoAtual === 8) {
        const timerDisplay = document.createElement("div");
        timerDisplay.className = "timer-display";
        timerDisplay.id = "timer-display";
        timerDisplay.innerText = "⏱️ 00:00";
        painelSubsecao.appendChild(timerDisplay);
    }

    if (modoAtual === 9) {
        const permutaDisplay = document.createElement("div");
        permutaDisplay.className = "timer-display";
        permutaDisplay.style.fontSize = "16px";
        permutaDisplay.innerText = `🔀 Letras: ${obterInfoLetrasPermuta()}`;
        painelSubsecao.appendChild(permutaDisplay);
    }

    if (modoAtual === 10) {
        const mutanteDisplay = document.createElement("div");
        mutanteDisplay.className = "timer-display";
        mutanteDisplay.id = "display-regra-mutante";
        mutanteDisplay.style.fontSize = "16px";
        mutanteDisplay.innerText = `🧬 Regra: ${regraMutanteAtual ? regraMutanteAtual.desc : ''}`;
        painelSubsecao.appendChild(mutanteDisplay);
    }

    if (modoAtual === 6) {
        const tempoSelector = document.createElement("div");
        tempoSelector.className = "tempo-selector";

        const tempos = [
            { min: 1, sec: 60, label: "1 Min" },
            { min: 3, sec: 180, label: "3 Min" },
            { min: 5, sec: 300, label: "5 Min" }
        ];

        tempos.forEach(t => {
            const btnT = document.createElement("button");
            btnT.className = `btn-tempo ${tempoCorrida === t.sec ? 'ativo' : ''}`;
            btnT.innerText = t.label;
            btnT.onclick = () => {
                tempoCorrida = t.sec;
                iniciarJogo(6);
            };
            tempoSelector.appendChild(btnT);
        });

        painelSubsecao.appendChild(tempoSelector);
    }

    topContainer.appendChild(barMenu);
    topContainer.appendChild(painelSubsecao);
    tabuleiro.appendChild(topContainer);

    const areaEntrada = document.createElement("div");
    areaEntrada.id = "area-entrada";
    
    const historico = document.createElement("div");
    historico.className = "historico-tentativas";
    historico.id = "historico";

    const gridPrincipal = criarGridBase(0, false);
    areaEntrada.appendChild(gridPrincipal.container);
    gridsDOM.length = 0;
    gridsDOM.push(gridPrincipal.celulas);

    if (modoAtual !== 5 && modoAtual !== 7 && modoAtual !== 8 && modoAtual !== 11) {
        for (let t = 0; t < maxTentativas; t++) {
            const gridMini = criarGridBase(t, true);
            gridMini.container.style.opacity = t === 0 ? "1" : "0.3";
            historico.appendChild(gridMini.container);
        }
    }

    tabuleiro.appendChild(historico);
    tabuleiro.appendChild(areaEntrada);
    
    const teclado = criarTecladoVirtual();
    tabuleiro.appendChild(teclado);

    atualizarFoco();
}

function focarCelulaPorPos(r, c) {
    if (linhaAtual >= maxTentativas) return;

    if (focoRow === r && focoCol === c) {
        const temH = palavrasAtivas.some(p => p.orien === 'H' && p.fixedPos === r);
        const temV = palavrasAtivas.some(p => p.orien === 'V' && p.fixedPos === c);
        if (temH && temV) {
            direcaoAtual = direcaoAtual === 'H' ? 'V' : 'H';
        }
    } else {
        focoRow = r;
        focoCol = c;
        const temH = palavrasAtivas.some(p => p.orien === 'H' && p.fixedPos === r);
        const temV = palavrasAtivas.some(p => p.orien === 'V' && p.fixedPos === c);
        
        if (temH && !temV) direcaoAtual = 'H';
        else if (temV && !temH) direcaoAtual = 'V';
    }

    atualizarFoco();
}

function atualizarFoco() {
    if (linhaAtual >= maxTentativas) return;

    gridsDOM[0].forEach(c => c.classList.remove("focada"));
    const celulaAtual = obterCelulaAtual();
    if (celulaAtual) celulaAtual.classList.add("focada");
}

function obterCelulaAtual() {
    return gridsDOM[0].find(c => parseInt(c.dataset.row) === focoRow && parseInt(c.dataset.col) === focoCol);
}

function verificarPalavras() {
    const celulasAtuais = gridsDOM[0];
    const tentativasPorPalavra = [];

    for (let p of palavrasAtivas) {
        let tentNorm = "";
        for (let i = 0; i < 7; i++) {
            let c;
            if (p.orien === 'H') {
                c = celulasAtuais.find(cel => parseInt(cel.dataset.row) === p.fixedPos && parseInt(cel.dataset.col) === i);
            } else {
                c = celulasAtuais.find(cel => parseInt(cel.dataset.col) === p.fixedPos && parseInt(cel.dataset.row) === i);
            }

            if (!c || !c.innerText) {
                alert("Preencha todas as letras antes de confirmar!");
                return;
            }
            tentNorm += c.innerText;
        }

        tentNorm = normalizarTexto(tentNorm);
        const idxDict = listaDePalavrasNormalizada.indexOf(tentNorm);

        if (modoAtual !== 9 && idxDict === -1) {
            alert(`A palavra "${tentNorm.toUpperCase()}" não existe no dicionário!`);
            return;
        }

        tentativasPorPalavra.push({
            palavraObj: p,
            tentNorm: tentNorm,
            exibicao: idxDict !== -1 ? listaDePalavrasOriginal[idxDict] : tentNorm.toUpperCase()
        });
    }

    if (modoAtual === 10 && regraMutanteAtual) {
        const p1 = tentativasPorPalavra[0].tentNorm;
        const p2 = tentativasPorPalavra[1].tentNorm;
        if (!regraMutanteAtual.validar(p1, p2)) {
            alert(`A tentativa viola a regra atual:\n"${regraMutanteAtual.desc}"`);
            return;
        }
    }

    const resultados = tentativasPorPalavra.map(item => {
        const secretArr = item.palavraObj.norm.split("");
        const guessArr = item.tentNorm.split("");
        const status = Array(7).fill("errada");

        for (let i = 0; i < 7; i++) {
            if (guessArr[i] === secretArr[i]) {
                status[i] = "correta";
                secretArr[i] = null;
                guessArr[i] = null;
            }
        }

        for (let i = 0; i < 7; i++) {
            if (guessArr[i] !== null) {
                const idx = secretArr.indexOf(guessArr[i]);
                if (idx !== -1) {
                    status[i] = "lugar-errado";
                    secretArr[idx] = null;
                }
            }
        }

        return { ...item, status };
    });

    const historico = document.getElementById("historico");

    if (modoAtual === 5 || modoAtual === 8) {
        if (modoAtual === 8) {
            historico.innerHTML = ""; // Esconde tentativas anteriores no modo Inferno
        }

        const cardCegueta = document.createElement("div");
        cardCegueta.className = "card-tentativa-cegueta";

        const gridMini = criarGridBase(linhaAtual, true);

        let qtdVerde = 0;
        let qtdAmarelo = 0;
        let qtdRoxo = 0;

        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const miniCell = gridMini.container.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (!miniCell) continue;

                const resH = resultados.find(res => res.palavraObj.orien === 'H' && res.palavraObj.fixedPos === r);
                const resV = resultados.find(res => res.palavraObj.orien === 'V' && res.palavraObj.fixedPos === c);

                if (resH && resV) {
                    miniCell.innerText = resH.exibicao[c];
                    const stH = resH.status[c];
                    const stV = resV.status[r];

                    let statusFinal = "errada";
                    if (stH === "correta" || stV === "correta") statusFinal = "correta";
                    else if (stH === "lugar-errado" && stV === "lugar-errado") statusFinal = "cruzamento-duplo";
                    else if (stH === "lugar-errado" || stV === "lugar-errado") statusFinal = "lugar-errado";

                    if (statusFinal === "correta") qtdVerde++;
                    else if (statusFinal === "lugar-errado") qtdAmarelo++;
                    else if (statusFinal === "cruzamento-duplo") qtdRoxo++;
                } else if (resH) {
                    miniCell.innerText = resH.exibicao[c];
                    if (resH.status[c] === "correta") qtdVerde++;
                    else if (resH.status[c] === "lugar-errado") qtdAmarelo++;
                } else if (resV) {
                    miniCell.innerText = resV.exibicao[r];
                    if (resV.status[r] === "correta") qtdVerde++;
                    else if (resV.status[r] === "lugar-errado") qtdAmarelo++;
                }
            }
        }

        const resumo = document.createElement("div");
        resumo.className = "resumo-cegueta";
        resumo.innerHTML = `
            <span class="tag-cor tag-verde">🟢 ${qtdVerde}</span>
            <span class="tag-cor tag-amarelo">🟡 ${qtdAmarelo}</span>
            <span class="tag-cor tag-roxo">🟣 ${qtdRoxo}</span>
        `;

        cardCegueta.appendChild(gridMini.container);
        cardCegueta.appendChild(resumo);

        historico.appendChild(cardCegueta);
        historico.scrollTop = historico.scrollHeight;
    } 
    else if (modoAtual === 7) {
        historico.innerHTML = "";

        const gridMini = criarGridBase(linhaAtual, true);

        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const miniCell = gridMini.container.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (!miniCell) continue;

                const resH = resultados.find(res => res.palavraObj.orien === 'H' && res.palavraObj.fixedPos === r);
                const resV = resultados.find(res => res.palavraObj.orien === 'V' && res.palavraObj.fixedPos === c);

                if (resH && resV) {
                    miniCell.innerText = resH.exibicao[c];
                    const stH = resH.status[c];
                    const stV = resV.status[r];

                    let statusFinal = "errada";
                    if (stH === "correta" || stV === "correta") {
                        statusFinal = "correta";
                    } 
                    else if (stH === "lugar-errado" && stV === "lugar-errado") {
                        statusFinal = "cruzamento-duplo";
                    } 
                    else if (stH === "lugar-errado" || stV === "lugar-errado") {
                        statusFinal = "lugar-errado";
                    }

                    miniCell.classList.add(statusFinal);

                    atualizarStatusTecladoGradiente(resH.exibicao[c], resH.palavraObj.id, stH);
                    atualizarStatusTecladoGradiente(resV.exibicao[r], resV.palavraObj.id, stV);
                } 
                else if (resH) {
                    miniCell.innerText = resH.exibicao[c];
                    miniCell.classList.add(resH.status[c]);
                    atualizarStatusTecladoGradiente(resH.exibicao[c], resH.palavraObj.id, resH.status[c]);
                } 
                else if (resV) {
                    miniCell.innerText = resV.exibicao[r];
                    miniCell.classList.add(resV.status[r]);
                    atualizarStatusTecladoGradiente(resV.exibicao[r], resV.palavraObj.id, resV.status[r]);
                }
            }
        }

        historico.appendChild(gridMini.container);
    } 
    else if (modoAtual === 11) {
        const gridMini = criarGridBase(linhaAtual, true);

        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const miniCell = gridMini.container.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (!miniCell) continue;

                const resH = resultados.find(res => res.palavraObj.orien === 'H' && res.palavraObj.fixedPos === r);
                const resV = resultados.find(res => res.palavraObj.orien === 'V' && res.palavraObj.fixedPos === c);

                if (resH && resV) {
                    miniCell.innerText = resH.exibicao[c];
                    const stH = resH.status[c];
                    const stV = resV.status[r];

                    let statusFinal = "errada";
                    if (stH === "correta" || stV === "correta") {
                        statusFinal = "correta";
                    } 
                    else if (stH === "lugar-errado" && stV === "lugar-errado") {
                        statusFinal = "cruzamento-duplo";
                    } 
                    else if (stH === "lugar-errado" || stV === "lugar-errado") {
                        statusFinal = "lugar-errado";
                    }

                    miniCell.classList.add(statusFinal);

                    atualizarStatusTecladoGradiente(resH.exibicao[c], resH.palavraObj.id, stH);
                    atualizarStatusTecladoGradiente(resV.exibicao[r], resV.palavraObj.id, stV);
                } 
                else if (resH) {
                    miniCell.innerText = resH.exibicao[c];
                    miniCell.classList.add(resH.status[c]);
                    atualizarStatusTecladoGradiente(resH.exibicao[c], resH.palavraObj.id, resH.status[c]);
                } 
                else if (resV) {
                    miniCell.innerText = resV.exibicao[r];
                    miniCell.classList.add(resV.status[r]);
                    atualizarStatusTecladoGradiente(resV.exibicao[r], resV.palavraObj.id, resV.status[r]);
                }
            }
        }

        historico.appendChild(gridMini.container);
        historico.scrollTop = historico.scrollHeight;
    }
    else {
        const minicard = document.getElementById(`tentativa-${linhaAtual}`);

        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                const miniCell = minicard.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                if (!miniCell) continue;

                const resH = resultados.find(res => res.palavraObj.orien === 'H' && res.palavraObj.fixedPos === r);
                const resV = resultados.find(res => res.palavraObj.orien === 'V' && res.palavraObj.fixedPos === c);

                if (resH && resV) {
                    miniCell.innerText = resH.exibicao[c];
                    const stH = resH.status[c];
                    const stV = resV.status[r];

                    let statusFinal = "errada";
                    if (stH === "correta" || stV === "correta") {
                        statusFinal = "correta";
                    } 
                    else if (stH === "lugar-errado" && stV === "lugar-errado") {
                        statusFinal = "cruzamento-duplo";
                    } 
                    else if (stH === "lugar-errado" || stV === "lugar-errado") {
                        statusFinal = "lugar-errado";
                    }

                    miniCell.classList.add(statusFinal);

                    atualizarStatusTecladoGradiente(resH.exibicao[c], resH.palavraObj.id, stH);
                    atualizarStatusTecladoGradiente(resV.exibicao[r], resV.palavraObj.id, stV);
                } 
                else if (resH) {
                    miniCell.innerText = resH.exibicao[c];
                    miniCell.classList.add(resH.status[c]);
                    atualizarStatusTecladoGradiente(resH.exibicao[c], resH.palavraObj.id, resH.status[c]);
                } 
                else if (resV) {
                    miniCell.innerText = resV.exibicao[r];
                    miniCell.classList.add(resV.status[r]);
                    atualizarStatusTecladoGradiente(resV.exibicao[r], resV.palavraObj.id, resV.status[r]);
                }
            }
        }
    }

    const todasCorretas = resultados.every(r => r.tentNorm === r.palavraObj.norm);

    if (todasCorretas) {
        if (timerInterval) clearInterval(timerInterval);
        const tentativasUsadas = linhaAtual + 1;
        const mod = modificadoresModo[modoAtual] || 100;
        const moedasGanhas = Math.floor(mod / Math.max(tentativasUsadas, 3));
        salvarMoedas(moedasGanhas);

        linhaAtual = maxTentativas;
        setTimeout(() => {
            let resumoPalavras = palavrasAtivas.map(p => `<p><strong>${p.orien === 'H' ? 'Horizontal' : 'Vertical'}:</strong> ${p.orig}</p>`).join("");
            exibirModal("Você Venceu! 🎉", `
                <p>Parabéns! Você descobriu todas as palavras!</p>
                <p><strong>Moedas ganhas: 🪙 ${moedasGanhas}</strong></p>
                ${resumoPalavras}
            `, "Jogar Novamente", () => iniciarJogo(modoAtual));
        }, 150);
        return;
    }

    linhaAtual++;

    if (modoAtual === 10) {
        sortearRegraMutante();
    }
    
    if (linhaAtual < maxTentativas) {
        celulasAtuais.forEach(c => {
            c.innerText = "";
            c.classList.remove("focada");
        });
        
        if (modoAtual !== 5 && modoAtual !== 7 && modoAtual !== 8 && modoAtual !== 11) {
            document.getElementById(`tentativa-${linhaAtual}`).style.opacity = "1";
        }
        
        const p1 = palavrasAtivas.find(p => p.orien === 'H') || palavrasAtivas[0];
        if (p1.orien === 'H') {
            focoRow = p1.fixedPos;
            focoCol = 0;
            direcaoAtual = 'H';
        } else {
            focoRow = 0;
            focoCol = p1.fixedPos;
            direcaoAtual = 'V';
        }

        atualizarFoco();
    } else {
        if (timerInterval) clearInterval(timerInterval);
        setTimeout(() => {
            let resumoPalavras = palavrasAtivas.map(p => `<p><strong>${p.orien === 'H' ? 'Horizontal' : 'Vertical'}:</strong> ${p.orig}</p>`).join("");
            exibirModal("Fim de Jogo ❌", `
                <p>Suas tentativas acabaram! As palavras eram:</p>
                ${resumoPalavras}
            `, "Tentar Novamente", () => iniciarJogo(modoAtual));
        }, 200);
    }
}

carregarDicionario();
