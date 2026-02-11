const tabuleiroEl = document.getElementById("tabuleiro");
const params = new URLSearchParams(window.location.search);
const modo = params.get("modo") || "ia";

let mapaTabuleiro = [
    [0, 2, 0, 2, 0, 2, 0, 2], [2, 0, 2, 0, 2, 0, 2, 0],
    [0, 2, 0, 2, 0, 2, 0, 2], [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1], [1, 0, 1, 0, 1, 0, 1, 0]
];

let vezAtual = "preta";
let casaSelecionada = null;
let comboPendente = false;
let jogoAtivo = true;

// Se for online, espera o servidor. Se for IA, você é sempre as pretas.
let minhaCorNoJogo = (modo === "online") ? null : "preta";

function desenharTabuleiro() {
    if (!tabuleiroEl) return;
    tabuleiroEl.innerHTML = "";
    for (let l = 0; l < 8; l++) {
        for (let c = 0; c < 8; c++) {
            const casa = document.createElement("div");
            casa.className = `casa ${(l + c) % 2 === 0 ? "casa-clara" : "casa-escura"}`;
            const id = mapaTabuleiro[l][c];
            if (id !== 0) {
                const peca = document.createElement("div");
                peca.className = `peca ${id % 2 !== 0 ? "peca-preta" : "peca-branca"} ${id > 2 ? "dama" : ""}`;
                casa.appendChild(peca);
            }
            if (casaSelecionada?.l === l && casaSelecionada?.c === c) casa.classList.add("selecionada");
            casa.onclick = () => cliqueCasa(l, c);
            tabuleiroEl.appendChild(casa);
        }
    }
    
    // Atualiza o texto de status
    let info = (modo === "online") ? ` | Você: ${minhaCorNoJogo ? minhaCorNoJogo.toUpperCase() : "Conectando..."}` : "";
    const txtVez = comboPendente ? `COMBO! JOGUE NOVAMENTE` : `Vez: ${vezAtual.toUpperCase()}${info}`;
    document.getElementById("status-turno").innerText = txtVez;
}

function cliqueCasa(l, c) {
    if (!jogoAtivo) return;

    // Bloqueio de turno Online
    if (modo === "online") {
        if (!minhaCorNoJogo) return console.log("Aguardando atribuição de cor...");
        if (vezAtual !== minhaCorNoJogo) return console.log("Não é sua vez!");
    } else if (modo === "ia" && vezAtual === "branca") {
        return;
    }

    const id = mapaTabuleiro[l][c];
    if (id !== 0) {
        if (comboPendente) return; 
        const corPeca = (id % 2 !== 0) ? "preta" : "branca";
        
        // No online, só pode selecionar sua própria cor
        if (modo === "online" && corPeca !== minhaCorNoJogo) return;

        if (corPeca === vezAtual) {
            casaSelecionada = { l, c };
            desenharTabuleiro();
        }
    } else if (casaSelecionada) {
        if (validarMovimento(casaSelecionada, { l, c })) {
            executarJogada(casaSelecionada, { l, c });
        }
    }
}

function validarMovimento(o, d) {
    const id = mapaTabuleiro[o.l][o.c];
    const distL = d.l - o.l;
    const distC = Math.abs(d.c - o.c);
    if (mapaTabuleiro[d.l][d.c] !== 0 || Math.abs(distL) !== distC) return false;

    const ehDama = id > 2;
    const inimigo = (vezAtual === "preta") ? [2, 4] : [1, 3];

    if (ehDama) {
        let pecasNoCaminho = [];
        const pL = distL > 0 ? 1 : -1;
        const pC = (d.c - o.c) > 0 ? 1 : -1;
        let l = o.l + pL, c = o.c + pC;
        while (l !== d.l) {
            if (mapaTabuleiro[l][c] !== 0) pecasNoCaminho.push({id: mapaTabuleiro[l][c], l, c});
            l += pL; c += pC;
        }
        if (pecasNoCaminho.length > 1) return false;
        if (pecasNoCaminho.length === 1) return inimigo.includes(pecasNoCaminho[0].id);
        return !comboPendente;
    } else {
        if (Math.abs(distL) === 1 && !comboPendente) {
            return (id === 1) ? distL < 0 : distL > 0;
        }
        if (Math.abs(distL) === 2) {
            const pM = mapaTabuleiro[(o.l + d.l)/2][(o.c + d.c)/2];
            return pM !== 0 && inimigo.includes(pM);
        }
    }
    return false;
}

function executarJogada(o, d) {
    const id = mapaTabuleiro[o.l][o.c];
    let comeu = false;
    const pL = (d.l - o.l) > 0 ? 1 : -1;
    const pC = (d.c - o.c) > 0 ? 1 : -1;
    let l = o.l + pL, c = o.c + pC;

    while (l !== d.l) {
        if (mapaTabuleiro[l][c] !== 0) {
            mapaTabuleiro[l][c] = 0;
            comeu = true;
            break;
        }
        l += pL; c += pC;
    }

    mapaTabuleiro[d.l][d.c] = id;
    mapaTabuleiro[o.l][o.c] = 0;

    if (id === 1 && d.l === 0) mapaTabuleiro[d.l][d.c] = 3;
    if (id === 2 && d.l === 7) mapaTabuleiro[d.l][d.c] = 4;

    if (comeu && podeComerMais(d.l, d.c)) {
        comboPendente = true;
        casaSelecionada = { l: d.l, c: d.c };
    } else {
        comboPendente = false;
        casaSelecionada = null;
        vezAtual = (vezAtual === "preta") ? "branca" : "preta";
    }

    desenharTabuleiro();
    verificarFim();

    // Sincroniza com o servidor se estiver online
    if (modo === "online" && typeof enviarDadosOnline === "function") {
        enviarDadosOnline();
    }

    if (modo === "ia" && vezAtual === "branca" && jogoAtivo) {
        setTimeout(jogadaIA, 800);
    }
}

function podeComerMais(l, c) {
    const id = mapaTabuleiro[l][c];
    const direcoes = [[1,1], [1,-1], [-1,1], [-1,-1]];
    const inimigo = (vezAtual === "preta") ? [2, 4] : [1, 3];

    for (let d of direcoes) {
        if (id > 2) { 
            let encontrouInimigo = false;
            for (let i = 1; i < 8; i++) {
                let nL = l + (d[0] * i), nC = c + (d[1] * i);
                if (nL < 0 || nL > 7 || nC < 0 || nC > 7) break;
                let p = mapaTabuleiro[nL][nC];
                if (!encontrouInimigo) {
                    if (p !== 0) {
                        if (inimigo.includes(p)) encontrouInimigo = true;
                        else break;
                    }
                } else {
                    if (p === 0) return true;
                    else break;
                }
            }
        } else {
            let nL = l + (d[0] * 2), nC = c + (d[1] * 2);
            let mL = l + d[0], mC = c + d[1];
            if (nL >= 0 && nL <= 7 && nC >= 0 && nC <= 7) {
                if (mapaTabuleiro[nL][nC] === 0 && inimigo.includes(mapaTabuleiro[mL][mC])) return true;
            }
        }
    }
    return false;
}

function verificarFim() {
    let pretas = 0;
    let brancas = 0;
    let podeMoverPreta = false;
    let podeMoverBranca = false;

    for (let l = 0; l < 8; l++) {
        for (let c = 0; c < 8; c++) {
            const peca = mapaTabuleiro[l][c];
            if (peca === 1 || peca === 3) {
                pretas++;
                if (temMovimentosValidos(l, c)) podeMoverPreta = true;
            }
            if (peca === 2 || peca === 4) {
                brancas++;
                if (temMovimentosValidos(l, c)) podeMoverBranca = true;
            }
        }
    }

    let vencedor = null;

    // Condição 1: Alguém ficou sem peças
    if (pretas === 0) vencedor = "branca";
    else if (brancas === 0) vencedor = "preta";
    
    // Condição 2: É a vez de alguém e ele não pode se mexer (Bloqueio)
    else if (vezAtual === "preta" && !podeMoverPreta) vencedor = "branca";
    else if (vezAtual === "branca" && !podeMoverBranca) vencedor = "preta";

    if (vencedor) {
        jogoAtivo = false;
        exibirResultadoFinal(vencedor);
    }
}

// Função auxiliar para ver se uma peça específica tem saída
function temMovimentosValidos(l, c) {
    for (let dl = 0; dl < 8; dl++) {
        for (let dc = 0; dc < 8; dc++) {
            if (validarMovimento({l, c}, {l: dl, c: dc})) {
                return true;
            }
        }
    }
    return false;
}

function exibirResultadoFinal(vencedor) {
    const modal = document.getElementById("modal-vitoria");
    const titulo = document.getElementById("titulo-vencedor");
    const subtitulo = document.getElementById("subtitulo-vencedor");

    if (!modal) return;

    modal.classList.remove("hidden");

    // Lógica para definir se você ganhou ou perdeu
    if (modo === "online" || modo === "ia") {
        if (vencedor === minhaCorNoJogo) {
            titulo.innerText = "YOU WIN! 🏆";
            titulo.style.color = "#2ecc71"; // Verde
            subtitulo.innerText = "Parabéns, você venceu a partida!";
        } else {
            titulo.innerText = "YOU LOSE! 💀";
            titulo.style.color = "#e74c3c"; // Vermelho
            subtitulo.innerText = "Não foi dessa vez. Tente novamente!";
        }
    } else {
        // Modo local (dois jogadores no mesmo PC)
        titulo.innerText = `VITÓRIA DAS ${vencedor.toUpperCase()}S!`;
        subtitulo.innerText = "Fim da partida local.";
    }
}

function jogadaIA() {
    if (vezAtual !== "branca" || !jogoAtivo) return;
    let jogadas = [];
    for (let l = 0; l < 8; l++) {
        for (let c = 0; c < 8; c++) {
            if (mapaTabuleiro[l][c] === 2 || mapaTabuleiro[l][c] === 4) {
                for (let dl = 0; dl < 8; dl++) {
                    for (let dc = 0; dc < 8; dc++) {
                        if (validarMovimento({l,c}, {l:dl, c:dc})) {
                            const cap = Math.abs(dl - l) >= 2;
                            jogadas.push({o:{l,c}, d:{l:dl, c:dc}, cap});
                        }
                    }
                }
            }
        }
    }
    const caps = jogadas.filter(j => j.cap);
    const esc = caps.length > 0 ? caps[Math.floor(Math.random()*caps.length)] : jogadas[Math.floor(Math.random()*jogadas.length)];
    if (esc) executarJogada(esc.o, esc.d);
}

window.onload = desenharTabuleiro;