const ws = new WebSocket(`ws://${window.location.host}`);
let jogoAtivo = true;

ws.onopen = () => {
    console.log('Conectado ao servidor');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.tipo === 'boasVindas') {
        document.getElementById('mensagem-boas-vindas').textContent = data.mensagem;
    } else if (data.tipo === 'estadoJogo') {
        document.getElementById('estado-jogo').textContent = data.estado;
    } else if (data.tipo === 'pergunta') {
        exibirPergunta(data.pergunta, data.indicePergunta);
    } else if (data.tipo === 'resultado') {
        exibirResultados(data.resultado);
    } else if (data.tipo === 'atualizacaoPontuacao') {
        atualizarPontuacoes(data.pontuacoes);
    } else if (data.tipo === 'resultadoFinal') {
        exibirResultadoFinal(data.mensagem);
        desabilitarQuiz();
    } else if (data.tipo === 'jogoEncerrado') {
        exibirResultadoFinal(data.mensagem);
        desabilitarQuiz();
    }
};

ws.onclose = () => {
    console.log('Desconectado do servidor');
};

document.getElementById('enviar').onclick = () => {
    if (!jogoAtivo) {
        alert("O tempo do jogo acabou. Você não pode mais enviar respostas.");
        return;
    }
    const respostas = obterRespostaSelecionada();
    if (respostas === null) {
        alert("Por favor, selecione uma resposta antes de enviar.");
        return;
    }
    const indicePergunta = document.getElementById('quiz').getAttribute('data-indice-pergunta');
    ws.send(JSON.stringify({ tipo: 'enviarRespostas', respostas: respostas, indicePergunta: parseInt(indicePergunta) }));
};

function exibirPergunta(pergunta, indicePergunta) {
    const quizDiv = document.getElementById('quiz');
    quizDiv.setAttribute('data-indice-pergunta', indicePergunta);
    quizDiv.innerHTML = `<h2>${pergunta.pergunta}</h2>`;
    pergunta.opcoes.forEach((opcao, index) => {
        const elementoOpcao = document.createElement('div');
        elementoOpcao.innerHTML = `
            <input type="radio" name="resposta" value="${opcao}" id="opcao${index}">
            <label for="opcao${index}">${opcao}</label>
        `;
        quizDiv.appendChild(elementoOpcao);
    });
}

function exibirResultados(resultado) {
    document.getElementById('resultados').textContent = resultado;
}

function atualizarPontuacoes(pontuacoes) {
    const estadoJogoDiv = document.getElementById('estado-jogo');
    let mensagemPontuacao = 'Pontuação: ';
    for (let idJogador in pontuacoes) {
        mensagemPontuacao += `Jogador ${parseInt(idJogador) + 1} - ${pontuacoes[idJogador]}, `;
    }
    estadoJogoDiv.textContent = mensagemPontuacao.slice(0, -2); // Remove a última vírgula e espaço
}

function exibirResultadoFinal(mensagem) {
    const resultadosDiv = document.getElementById('resultados');
    resultadosDiv.innerHTML = `<h2>${mensagem}</h2>`;
}

function desabilitarQuiz() {
    jogoAtivo = false;
    const botoes = document.querySelectorAll('input[name="resposta"]');
    botoes.forEach(botao => botao.disabled = true);
    document.getElementById('enviar').disabled = true;
}

function obterRespostaSelecionada() {
    const opcaoSelecionada = document.querySelector('input[name="resposta"]:checked');
    return opcaoSelecionada ? opcaoSelecionada.value : null;
}