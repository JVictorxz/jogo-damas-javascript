const socket = io();

// Quando o servidor envia a cor, ele preenche a variável do main.js
socket.on("proclamarCor", (dados) => {
    if (modo === "online") {
        minhaCorNoJogo = dados.cor; // Aqui sai o "Conectando..."
        mapaTabuleiro = dados.estado.tabuleiro;
        vezAtual = dados.estado.vez;
        
        console.log("Conectado como: " + minhaCorNoJogo);
        desenharTabuleiro(); // Redesenha para atualizar o texto do status
    }
});

socket.on("atualizarTabuleiro", (novoEstado) => {
    if (modo === "online") {
        mapaTabuleiro = novoEstado.tabuleiro;
        vezAtual = novoEstado.vez;
        desenharTabuleiro();
        verificarFim();
    }
});

function enviarDadosOnline() {
    socket.emit("enviarJogada", {
        tabuleiro: mapaTabuleiro,
        vez: vezAtual
    });
}

// Enviar mensagem
const btnEnviar = document.getElementById("btn-enviar-chat");
const inputChat = document.getElementById("chat-input");
const areaMensagens = document.getElementById("chat-mensagens");

btnEnviar.onclick = () => {
    const texto = inputChat.value;
    if (texto.trim() !== "") {
        socket.emit("mensagemChat", { texto: texto });
        inputChat.value = "";
    }
};

// Receber mensagem e mostrar na tela
socket.on("receberMensagem", (dados) => {
    const msgEl = document.createElement("p");
    msgEl.innerHTML = `<strong style="color: ${dados.cor === 'preta' ? '#555' : '#fff'}">${dados.cor.toUpperCase()}:</strong> ${dados.texto}`;
    areaMensagens.appendChild(msgEl);
    areaMensagens.scrollTop = areaMensagens.scrollHeight; // Auto-scroll para a última mensagem
});