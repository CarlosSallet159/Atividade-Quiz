const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

const app = express();

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let jogadores = [];
let perguntas = [];
let pontuacoes = {};
let finalizado = {};
let indicePerguntaAtual = 0;
let jogoAtivo = false;

// Carregar perguntas do arquivo JSON
fs.readFile('perguntas.json', 'utf8', (err, data) => {
    if (err) {
        console.error('Erro ao ler o arquivo de perguntas:', err);
        return;
    }
    perguntas = JSON.parse(data);
});

wss.on('connection', (ws) => {
    console.log('Um jogador se conectou à partida.');

    const idJogador = jogadores.length;
    jogadores.push(ws);
    pontuacoes[idJogador] = 0;
    finalizado[idJogador] = false;

    ws.send(JSON.stringify({ tipo: 'boasVindas', mensagem: 'Bem vindo ao Quiz Maluco' }));
    transmitirEstadoJogo();

    if (jogadores.length >= 2) {
        jogadores.forEach((jogador, index) => {
            iniciarJogoParaJogador(index);
        });
        iniciarTemporizadorJogo();
    }

    ws.on('message', (message) => {
        if (!jogoAtivo) {
            ws.send(JSON.stringify({ tipo: 'jogoEncerrado', mensagem: 'O tempo do jogo acabou.' }));
            return;
        }

        const data = JSON.parse(message);

        if (data.tipo === 'enviarRespostas') {
            const indiceJogador = jogadores.indexOf(ws);
            const respostaJogador = data.respostas;
            const respostaCorreta = perguntas[data.indicePergunta].respostaCorreta;
            if (respostaJogador === respostaCorreta) {
                pontuacoes[indiceJogador] += 1;
            }
            ws.send(JSON.stringify({ tipo: 'resultado', resultado: respostaJogador === respostaCorreta ? 'Correto!' : 'Errado!' }));
            enviarPontuacoesParaJogadores();
            enviarProximaPergunta(indiceJogador, data.indicePergunta + 1);
        }
    });

    ws.on('close', () => {
        console.log('Um jogador saiu da partida.');
        jogadores = jogadores.filter(jogador => jogador !== ws);
        if (jogadores.length < 2) {
            jogadores.forEach(jogador => {
                jogador.send(JSON.stringify({ tipo: 'estadoJogo', estado: 'Esperando mais jogadores...' }));
            });
        }
    });
});

function iniciarJogoParaJogador(indiceJogador) {
    if (indicePerguntaAtual < perguntas.length) {
        enviarPerguntaParaJogador(indiceJogador, indicePerguntaAtual);
    } else {
        jogadores[indiceJogador].send(JSON.stringify({ tipo: 'resultado', resultado: 'Muito bem, você respondeu todas as perguntas. Agora aguarde os outros jogadores terminarem.' }));
        finalizado[indiceJogador] = true;
        if (Object.values(finalizado).every(status => status)) {
            finalizarJogo();
        }
    }
}

function enviarPerguntaParaJogador(indiceJogador, indicePergunta) {
    if (indicePergunta < perguntas.length) {
        jogadores[indiceJogador].send(JSON.stringify({ tipo: 'pergunta', pergunta: perguntas[indicePergunta], indicePergunta: indicePergunta }));
    } else {
        jogadores[indiceJogador].send(JSON.stringify({ tipo: 'resultado', resultado: 'Muito bem, você respondeu todas as perguntas. Agora aguarde os outros jogadores terminarem.' }));
        finalizado[indiceJogador] = true;
        if (Object.values(finalizado).every(status => status)) {
            finalizarJogo();
        }
    }
}

function enviarProximaPergunta(indiceJogador, proximaIndicePergunta) {
    if (proximaIndicePergunta < perguntas.length) {
        enviarPerguntaParaJogador(indiceJogador, proximaIndicePergunta);
    } else {
        enviarPerguntaParaJogador(indiceJogador, perguntas.length);
    }
}

function enviarPontuacoesParaJogadores() {
    jogadores.forEach(jogador => {
        jogador.send(JSON.stringify({ tipo: 'atualizacaoPontuacao', pontuacoes: pontuacoes }));
    });
}

function iniciarTemporizadorJogo() {
    jogoAtivo = true;
    const tempoJogo = 60000; // 60 segundos
    setTimeout(() => {
        jogoAtivo = false;
        finalizarJogo();
    }, tempoJogo);
}

function finalizarJogo() {
    let mensagemVencedor = "Resultado final:\n";
    let pontuacaoMaxima = -1;
    let vencedores = [];

    Object.keys(pontuacoes).forEach(idJogador => {
        if (pontuacoes[idJogador] > pontuacaoMaxima) {
            pontuacaoMaxima = pontuacoes[idJogador];
            vencedores = [idJogador];
        } else if (pontuacoes[idJogador] === pontuacaoMaxima) {
            vencedores.push(idJogador);
        }
    });

    vencedores.forEach(vencedor => {
        mensagemVencedor += `Jogador ${parseInt(vencedor) + 1} venceu com ${pontuacoes[vencedor]} pontos!\n`;
    });

    Object.keys(pontuacoes).forEach(idJogador => {
        mensagemVencedor += `Jogador ${parseInt(idJogador) + 1}: ${pontuacoes[idJogador]} pontos\n`;
    });

    jogadores.forEach(jogador => {
        jogador.send(JSON.stringify({ tipo: 'resultadoFinal', mensagem: mensagemVencedor }));
    });

    // Reiniciar o estado do jogo
    indicePerguntaAtual = 0;
    pontuacoes = {};
    finalizado = {};
    jogadores = [];
}

function transmitirEstadoJogo() {
    jogadores.forEach((jogador, index) => {
        jogador.send(JSON.stringify({ tipo: 'estadoJogo', estado: `Jogador ${index + 1} conectado. Total de jogadores: ${jogadores.length}` }));
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor está rodando na porta ${PORT}`);
});