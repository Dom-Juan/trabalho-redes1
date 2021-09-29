const express = require("express"); // Framework simples para aplicação de conexão.
const app = express();              // Obriga o server a usar o express.
const cors = require("cors");       // Importando Cross Origin Resource Sharing para compartilhar conexões.
const server = require("http").createServer(app); // Cria o server em uma conexão http.
const PORT = 3001;                                // Porta onde o servidor roda.
const io = require("socket.io")(server, {         // Cria o nosso socket de server com a biblioteca de sockets.
  cors: true,                            // Ativa o CORS para essa conexão.
  origins: ["localhost:3001"],           // Origem da conexão.
  transports: ["polling"]                // O tipo de transporte a ser feito.
});

// Variáveis globais.
let countConection = 0;
const serverRoom = ['0', '1', '2']; // define um vetor constante para definir as salas.

app.use(cors());  // Ativa o uso do CORS para conexões seguras.

// Classe de cliente.
class Clients {
  constructor() {
    this.clientList = [];                         // Lista de clientes que conectam no server.
    this.addUser = this.addUser.bind(this);       // Vinula o add user a essa classe.
    this.getUsers = this.getUsers.bind(this);     // Vinula o get user a essa classe.
    this.removeUser = this.removeUser.bind(this); // Vinula o remove user a essa classe.
  }

  // Adiciona um usuário.
  addUser(userID, userName, socket) {
    this.clientList[userID] = { id: userID, name: userName, socket: socket, rooms: [] }; // adiciona um objeto usuário na lista, pasasndo id como index.
  }

  // Pega todos usuários.
  getUsers() {
    return this.clientList; // retorna usuários.
  }

  // Remove um usuário
  removeUser(id) {
    delete clientClass.clientList[id];
  }
}

const clientClass = new Clients(); // Gerando uma classe de cliente.

/* Ao receber uma conexão, a biblioteca vai conectar e pegar o socket do cliente e passar em uma variável, logo depois
 * um evento ira acontecer, onde varias funções de eventos ocorrem em determinados parametros que o cliente ou o serv-
 * idor pode emitir.
 * 
 * Esta parte do código, com a conexão e com o socket pego do cliente, é a parte principal do processo.
 * 
 * Existe alguns eventos que o nosso socket pode realizer para se comunicar com o cliente depois da conexão feita, eles são:
 *    - emit('evento'): um evento de emição aonde o server envia algum tipo de data para os clientes, ou alguns clientes específicos
 *            (depende da implementação).
 *    - on('evento'): Evento de espera/listening, ele aguarda uma ação do cliente para responder de acordo com ela.
 * 
 *    - in(room): Não um evento em so, mas parte de uma configuração de um dos eventos citados, nele eu limito a comunicação do socket
 *          a um tipo específico, se A está em uma sala X e Y, em X temos A1 e Y A2, A vai poder visualizar as conversas dos outros
 *          dois clientes, por estar conectado nessa "sala", enquanto A1 e A2 apenas ve a conversa de A sem ver as conversas entre si.
 * 
 * A conexão que o socket-io realiza é voltada do tipo voltado a conexão, os eventos criam essa sensação de UDP mas não é, é apenas o fato
 * que o javascript é uma linguagem asincrona, permitindo execuçãos de partes de códigos sem necessitar das outras no momento que executa,
 * o socket-io configura o tipo de conexão baseado no tipo de cliente que conecta com ele, mas por padrão é voltada a conexão, se um cliente
 * do tipo X entra, ele vai tentar se adaptar para conectar nesse cliente X. A conexão do socket-io pode ser melhorada até o protocole XHR.
 */
io.sockets.on('connect', (socket) => {
  countConection++;
  console.log("Recebendo conexão do socket: ", socket.id, socket);
  socket.emit('mensagem-server', "Bem vindo ao servidor, seu id de conexão é: " + socket.id);
  // Ao fechar uma conexão, diminui o contador.
  socket.on('close', () => {
    countConection--;
  });

  // handler de evento para aceitar conexões ao server.
  socket.on('entrar', (room) => {
    if (clientClass.clientList[socket.id] !== undefined && clientClass.clientList[socket.id] !== '') {
      console.log("Cliente conectou em ", serverRoom[room]);
      socket.emit('mesagem-server', 'Você se conectou em: ', serverRoom[room]);
      socket.join(serverRoom[room]);
      clientClass.clientList[socket.id].rooms.push(serverRoom[room]);
      console.log(clientClass.clientList[socket.id].rooms);
    } else {
      socket.emit('mensagem-server', "Por favor registre seu nome com o comando [nome] nickname");
    }
  })

  // handler de evento para registar o nome de um cliente.
  socket.on('nome', (username) => {
    socket.username = username;
    clientClass.addUser(socket.id, socket.username, socket);        // adiciona o cliente e seu socket a classe no servidor.
    console.log("Nome de " + socket.id + " setado com sucesso!!");  
    socket.emit('mensagem-server', clientClass.clientList[socket.id].name + " foi registrado..."); // respondendo o usuário.
  });

  // handler de evento para sair da sala.
  socket.on('sair', (room) => {
    console.log('Saindo da sala: ', serverRoom[room]);
    socket.leave(serverRoom[room]);
    // se o cliente e seu socket não existir, evitar erros e desligar o server.
    if (clientClass.clientList[socket.id] !== undefined && clientClass.clientList[socket.id] !== '') {
      socket.emit('mensagem-server', clientClass.clientList[socket.id].name + " Saiu da sala: " + serverRoom[room]);
      let newRooms = clientClass.clientList[socket.id].rooms;
      const index = newRooms.indexOf(room);
      if(index > -1) {
        newRooms.splice(index, 1);
      }
      clientClass.clientList[socket.id].rooms = newRooms;
      console.log("Salas atuais: ", clientClass.clientList[socket.id].rooms = newRooms);
    } else {
      socket.emit('mensagem-server', "Saindo da sala ", serverRoom[room]);
    }
  })

  // handler de evento para enviar dados de um clinte a outro na mesma sala.
  socket.on('enviar', (data) => {
    console.log("=================Enviando=======================");
    console.log(data);

    // se o cliente e seu socket não existir, evitar erros e desligar o server.
    if (clientClass.clientList[socket.id] !== undefined && clientClass.clientList[socket.id] !== '') {
      for(let room of clientClass.clientList[socket.id].rooms) {
        console.log(room);
        io.sockets.in(room).emit('mensagem-cliente', ("["+room+"] (" + clientClass.clientList[socket.id].name + ") -> " + data.message));
      }
      //io.sockets.in(data.room).emit('mensagem-cliente', ("(" + clientClass.clientList[socket.id].name + ") -> " + data.message));
    } else {
      socket.emit('mensagem-server', "Por favor registre seu nome com o comando [nome] nickname");
    }
    console.log("================================================");
  });

  // handler de evento para o server enviar avisos, mensagems e textos do server, quando um cliente fizer um comando.
  socket.on("mensagem-server", data => {
    console.log("=================Enviando a Todos==============");
    io.emit("mensagem", data);
    console.log(data);
    console.log("===============================================");
  });

  // handler do server para desconexões, no caso, quando uma ocorrer automaticamente.
  socket.on("disconnect", () => {
    clientClass.removeUser(socket.id);    // remove da classes de clientes.
    console.log("Cliente desconectado!");
  });

  console.log('Número de conexões atuais neste server: ' + countConection);
});

// Server node fica esperando por uma conexão na porta especificada, caso algum erro ocorra, o erro é emitido.
server.listen(PORT, error => {
  error ? console.error(error) : console.log(`Esperando conexão em ${PORT}`);
});

// Evento de mensagem caso o server node seja fechado.
server.on('close', () => {
  console.log("Server fechado!");
});