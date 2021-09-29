const express = require("express");               // Framework simples para aplicação de conexão.
const app = express();                            // Obriga o server a usar o express.
const server = require("http").createServer(app); // Cria o server em uma conexão http.
let processTree = require('ps-tree');             // Importa a biblioteca de arvore de processos
                                                  // para poder gerenciar os processos executados.

/* Como o JavaScript trata cada .js como um processo mono thread, para poder pegar o do processo
 * para gerenciar o caminho de execução, foi criado esse arquivo chamado de monitor, resposável
 * em fazer esse gerenciamente.
 */

// Uma função para matar o processo quando ele fechar ou parar de funcionar por algum motivo.
let kill = (pid, signal, callback) => {
  signal = signal || "SIGKILL";
  callback = callback || function () {};
  let killTree = true;
  if(killTree) {
    processTree(pid, (error, children) => {
      [pid].concat(
        children.map((p) => {
          return p.id;
        })
      ).forEach((targetPID) => {
        try{
          process.kill(targetPID, signal);
        } catch(e) {
          console.log(e);
        }
        callback();
      });
    });
  } else {
    try{
      process.kill(targetPID, signal);
    } catch(e) {
      console.log(e);
    }
    callback();
  }
}

// Abaixo o exec recebe o import dos processos para executar processos filhos.
let exec = require('child_process').exec;
let child = exec('node ./server-thread.js'); // comando de execução para abrir o server.

// Função de evento para pegar o processo executando no server.
child.stdout.on('data', (data) => {
  console.log('Process ID: ', child.pid)
  console.log('stdout: ' + data);
});

// Caso a conexão com o server caia, mostrar o motivo do disconnect e mata o processo.
child.on('disconnect', (code) => {
  console.log('Código de disconnect: ' + code);
  kill();
});

// Caso o server feche, matar o processo em execução.
child.on('close', (code) => {
  console.log('closing code: ' + code);
  kill();
});

