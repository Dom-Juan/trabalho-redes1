//client.js
/* 
 *  O node.js utiliza monothreads com um loop de event podendo executar
 * diversas tarefas, callbacks, promesas, classes e funções, isso se da
 * em forma de como o JavaScript funciona, o socket.io consegue contro-
 * -lar essa parte com eventos do tipo .on; e .emit; Permitindo o func-
 * ionamento de flow como de uma thread junto de um socket funcional,ou
 * seja:
 * 
 * Em uma linguagem com multhithread,o cliente teriamos em  a seguinte
 * threading sendo feita:
 * 
 * /////////// PROCESSO /////////
 * //          Socket          //
 * //////////////////////////////
 * //          Porta           //
 * //////////////////////////////
 * // Thread 1: Função connect //
 * //////////////////////////////
 * // Thread 2: Função enviar  //
 * // dados                    //
 * //////////////////////////////
 * 
 * já com o node, funciona monothread, o seu esquema de funcionamento de
 * processo é dado como:
 * 
 * ///// PROCESSO E THREAD  /////
 * //|======= Socket io=======|//
 * //|  <===================> |//
 * //|  <   IP a conectar   > |//
 * //|  <===================> |//
 * //|  <  Porta a conectar > |//
 * //|  <===================> |//
 * //|  <===================> |//
 * //|  < Handler de eventos> |//
 * //|  < programados       > |//
 * //|  <===================> |//
 * //|========================|//
 * //////////////////////////////
 * //////////////////////////////
 * //  Read Line para leitura  //
 * // de texto ASCII           //
 * //////////////////////////////
 * 
 * O funcionamento do server segue de maneria similar ao cliente, apenas
 * trocando so casos para espera de conexão dos clientes e envio de dados
 * para conexões de cada socket de um cliente que se conectou.
 */

// import de bibliotecas.

const io = require('socket.io-client'); // Import da biblioteca
const socket = io.connect('http://localhost:3001', {reconnect: true});  // inicia a conexão com o server e ativa possbilidade de reconectar.
const readline = require('readline'); // import da biblioteca de leitura de console.
const { exit } = require('process');  // importa a saida e processos.
// import de bibliotecas.

// variáveis globais.
let sala = undefined; // Definindo a variável de sala;
let username = undefined; // Definindo a variável de nome;
let regExp = new RegExp(/[+[a-z]+]/); // Expressão regular para os comandos.
// variáveis globais.

// Criando uma interface de leitura.
const rl = readline.createInterface({
	input: process.stdin,   // escolhe o console como input.
	output: process.stdout  // escolhe o console como output.
});

// configura o output do terminal pra sempre ter essa aparencia
rl.setPrompt('Comando >: ');

// Função de output customizada para output no cmd.
function output(message) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(":: "+ message);
  rl.prompt(true); // ativa estilo do console.
}

// Função que gerencia os comandos digitados no chat.
function chatCommands(action, string) {
  if(action === '[entrar]' && string !== '') {  // Entra em um chat.
    sala = string.split(' ')[1];
    socket.emit('entrar', String(sala)); // envia um evento o server e entrar na sala escolhida.
  } else if(action === '[nome]') {  // Registra seu nome.
    username = string.split(' ')[1];
    console.log(username);
    socket.emit('nome', username);  // envia um evento para o server, registrar ou editando o nome. 
  } else if (action === '[sair]') { // Sai do chat.
    sala = string.split(' ')[1];
    socket.emit('sair', String(sala)); // envia um evento pedindo para sair da sala.
  } else if(action === '[fechar]'){ // Fecha o chat e sai do processo.
    socket.emit('close'); // avisa ao server que vai sair.
    rl.close();
    exit(0);
  } else if (action === '[ajuda]') {
    // mostra os comandos de ajuda, depois do - é apenas o texto de ajuda antes disso é o comando.
    output("Segue os comandos válidos: ");
    output("[entrar] numero_da_sala - Entra em uma das salas dos server.");
    output("[nome] username - Registra o seu nome no server.");
    output("[sair] numero_da_sala - Sai da sala especificada.");
    output("[fechar] - Fecha a conexão e o processo.");
    output("[ajuda] - Abre esta área de comandos.");
  } else { // Comando inválido
    output('Comando inválido.');
  }
  rl.prompt(true); // ativa estilo do console.
}

// inicia a conexão com o server.
socket.on('connect', () => {
  output("Console conectado, pode começar a digitar.\n");
  output("Qualquer dúvida acesse os comandos válidos com: [ajuda]");
  rl.prompt(true);

  // Inicia o buffer para receber texto e comandos.
  rl.addListener('line', line => {
    if(username === undefined) {
      output('Por favor digite o comando a seguir para registrar no server: [nome] nickname');
    }

    // Verifica o comando e se ele é valido e entra na função de comandos para serem executados.
    if (line[0] === '[' && line.length > 1) {
      const action = line.match(regExp)[0];
      const string = line.substr(action.length, line.length);
      rl.prompt(true);
      return chatCommands(action, string); // output do resultado.
    }
  
    // Envia a mensagem para a pessoa na sala.
    if(sala != undefined && sala != '') {
      // se o cliente não estiver em uma sala, ele deve entrar em uma.
      socket.emit('enviar',  {message: line, room: sala }); // emite a mensagem para o server.
      rl.prompt(true); // seta o estilo do console novamente.
    }

  });

  // Recebe mensagens enviadas pelos clientes.
  socket.on('mensagem-cliente', (data) => {
    output(data);
  });

  // Recebe mensagens enviadas do server.
  socket.on('mensagem-server', data =>{
    output(data);
  });

  rl.prompt(true);
});

// No evento em que o console é fechado, o processo termina.
rl.on("close", function saveInput() {
  console.log("\nSaindo do processo...");
  process.exit(0);
});