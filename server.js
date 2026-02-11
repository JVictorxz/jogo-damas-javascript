const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

;

// Estado inicial do jogo
let estadoGlobal = {
    tabuleiro: [
        [0, 2, 0, 2, 0, 2, 0, 2], [2, 0, 2, 0, 2, 0, 2, 0],
        [0, 2, 0, 2, 0, 2, 0, 2], [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0], [1, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1], [1, 0, 1, 0, 1, 0, 1, 0]
    ],
    vez: "preta"
};

let salas = {}; // Para gerenciar quem é preto/branco

io.on("connection", (socket) => {
    // Lógica simples: primeiro que entra é preto, segundo é branco
    const IDsConectados = Object.keys(io.sockets.sockets);
    let minhaCor = "preta";
    
    // Se já existe alguém como preto, o próximo é branco
    const coresEmUso = Object.values(salas);
    if (coresEmUso.includes("preta")) {
        minhaCor = "branca";
    }
    
    salas[socket.id] = minhaCor;
    console.log(`Jogador ${socket.id} entrou como: ${minhaCor}`);

    // Envia para o cliente a cor dele e o tabuleiro atual
    socket.emit("proclamarCor", {
        cor: minhaCor,
        estado: estadoGlobal
    });

    // Recebe a jogada e espalha para os outros
    socket.on("enviarJogada", (dados) => {
        estadoGlobal = dados;
        socket.broadcast.emit("atualizarTabuleiro", estadoGlobal);
    });

    socket.on("disconnect", () => {
        delete salas[socket.id];
        console.log(`Jogador ${socket.id} saiu.`);
    });

    // Dentro de io.on("connection", (socket) => { ...
socket.on("mensagemChat", (dados) => {
    // Envia para todos na sala, incluindo quem enviou
    io.emit("receberMensagem", {
        texto: dados.texto,
        cor: salas[socket.id] // Usa a cor que definimos no modo online
    });
});
});

http.listen(3000, () => {
    console.log("Servidor ON em http://localhost:3000");
});