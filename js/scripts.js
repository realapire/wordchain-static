const DOM = {
    txtInputBox: document.querySelector('#inputTextBox'),
    btnSubmit: document.querySelector('#inputSubmit'),
    letterHolder: document.querySelector('#letter'),
    errorHolder: document.querySelector('.errorHolder'),
    scoreHolder: document.querySelector('#scoreHolder'),
    currentPlayerTurn: document.querySelector('#playerTurn'),
    btnGoBack: document.querySelector('.btnGoBack'),
    btnRestart: document.querySelector('#btnRestart')
};

const GamemodesDOM = {
    helpTitle: document.querySelector('.helpTitle span'),
    gamemodeHolder: document.querySelector('.gamemodeHolder'),
    gamemodePanel: document.querySelector('.gamemodePanel'),
    gamePanel: document.querySelector('.gamePanel'),
    gamemodeButtons: document.querySelectorAll('.chooseGamemode'),
    hotseatForm: document.querySelector('.hotseatForm'),
    txthotseatPlayers: document.querySelector('#txthotseatPlayers'),
    playerOverview: document.querySelector('.playerOverview'),
};

const UsernameDOM = {
    frmUsername: document.querySelector('.username-form'),
    txtUsername: document.querySelector('#txtUsername'),
    btnUsername: document.querySelector('#btnUsername'),
    usernameHolder: document.querySelector('#usernameHolder')
};

const FinishDOM = {
    finishPanel: document.querySelector('.finishPanel'),
    playerStatsTable: document.querySelector('#statsPlayer'),
    podiumHolder: document.querySelector('.podium')
};

const TimerDOM = {
    timeLeftHolder: document.querySelector('#timeLeftHolder'),
    timeLeftValue: document.querySelector('#timeLeft')
};

const MultiplayerDOM = {
    multiplayerEnteringLobby: document.querySelector('.multiplayerEnteringLobby'),
    multiplayerForm: document.querySelector('.multiplayerForm'),
    multiplayerHelpText: document.querySelector('.multiplayerHelpText'),
    btnHostSession: document.querySelector('#btnHostSession'),
    btnJoinSession: document.querySelector('#btnJoinSession'),
    txtSessionId: document.querySelector('#txtSession'),
    lobbyHolder: document.querySelector('.multiplayerLobby'),
    playersHolder: document.querySelector('.playersHolder'),
    lobbyCode: document.querySelector('.lobbyCode span'),
    lobbyPublic: document.querySelector('.lobbyPublic span'),
    btnStartGame: document.querySelector('#btnStartGame')
};

const URL = {
    enWoordenboek: 'https://api.dictionaryapi.dev/api/v2/entries/en/'
};

const letters = 'abcdefghijklmnopqrstuvwxyz';

// Multiplayer 
let socket;
let isConnected = false;
let sessionId;

function startMultiplayer() {
    if (!isConnected) {
        socket = new WebSocket('ws://localhost:8080');
            
        socket.addEventListener('open', (event) => {
            console.log('Connection established with Websocket');
            isConnected = true;
            sendJoinMessage();
        });

        socket.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message from websocket:', data);
            switch (data.type) {
                case 'session-created':
                    MultiplayerDOM.multiplayerHelpText.innerText = 'LOBBY - ONLY HOST CAN START (2-5)';
                    loadLobby(data);
                    break;
                case 'session-joined':
                    MultiplayerDOM.multiplayerHelpText.innerText = 'LOBBY - ONLY HOST CAN START (2-5)';
                    loadLobby(data);
                    break;
                case 'start':
                    startMultiGame(data.startLetter);
                    startTimer();
                    break;
                case 'correct-answer':
                    adjustScore();
                    nextPlayer();
                    loadScore();
                    loadNewLetter(data.lastLetter);
                    DOM.txtInputBox.value = '';
                    break;
                case 'wrong-answer':
                    eliminatePlayer();
                    loadScore();
                    DOM.txtInputBox.value = '';
                    break;
                case 'time-up':
                    eliminatePlayer();
                    loadScore();
                case 'session-left':
                    loadLobby(data);
            }
        });

        socket.addEventListener('close', (event) => {
            loadError('Connection closed with server');
            isConnected = false;
        });

        socket.addEventListener('error', (event) => {
            loadError('Could not connect to the server');
            isConnected = false;
        });
    } else {
        loadError('Already connected');
    }
}

function sendJoinMessage() {
    const message = {
        type: 'join',
        username: username
    };
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
}

function loadLobby(data) {
    if(MultiplayerDOM.lobbyHolder.classList.contains('hidden')) {
        MultiplayerDOM.lobbyHolder.classList.remove('hidden');
        MultiplayerDOM.multiplayerEnteringLobby.classList.add('hidden');
    }
    MultiplayerDOM.playersHolder.innerHTML = '';
    const hostName = data.host.name;
    MultiplayerDOM.lobbyCode.innerText = data.sessionId;
    players = data.players;
    for (let i = 0; i < data.players.length; i++) {
        let role = 'PLAYER';
        if(data.players[i].name == hostName) {
            role = 'HOST';
        }
        if (data.players.length == 1) {
            role = 'HOST';
        }
        MultiplayerDOM.playersHolder.innerHTML += `<div class='player'>
            <p><span class='playerName'>${data.players[i].name}</span></p>
            <p><span class='playerRole'>${role}</span></p>
        </div>`; 
    }
}

MultiplayerDOM.btnHostSession.addEventListener('click', function(){
    const message = {
        type: 'create-session'
    }
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
});

MultiplayerDOM.btnJoinSession.addEventListener('click', function() {
    const message = {
        type: 'join-session',
        sessionId: MultiplayerDOM.txtSessionId.value
    }
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
});

MultiplayerDOM.btnStartGame.addEventListener('click', function() {
    const message = {
        type: 'start-session',
    };
    socket.send(JSON.stringify(message));
});

// Username

let username = JSON.parse(localStorage.getItem('username')) || '';

if(!username) {
    askUsername();
}

function askUsername() {
    UsernameDOM.frmUsername.classList.remove('hidden');
    UsernameDOM.btnUsername.addEventListener('click', function() {
        if(UsernameDOM.txtUsername.value.length < 3) {
            loadError('Naam moet langer zijn dan 3 karaketers');
            return;
        }

        username = UsernameDOM.txtUsername.value;
        localStorage.setItem('username', JSON.stringify(username));
        UsernameDOM.usernameHolder.innerText = 'Hello, ' + username;
        UsernameDOM.frmUsername.classList.add('hidden');
    });
} 

UsernameDOM.usernameHolder.innerText = 'Hello, ' + username;

// Geschiedenis van alle gegeven woorden in een array
let usedWords = [];
const randomWords = ['elephant', 'ghost', 'dog', 'car', 'rocket'];

let startLetter = '';
let nextLetter = '';
let players = [];
// -1 betekent singleplayer, geen andere speler
let currentPlayer = -1;

let eliminatedPlayers = [];
//

// Gamemode
GamemodesDOM.gamemodeButtons.forEach(button => {
    button.addEventListener('click', function(e) {

        // reset alle spelers
        players = [];

        GamemodesDOM.gamemodePanel.classList.add('hidden');
        const selectedGamemode = e.target.getAttribute('data-gamemode');
        if (selectedGamemode == 'singleplayer') {
            GamemodesDOM.helpTitle.classList.add('hidden');
            DOM.currentPlayerTurn.classList.remove('hidden');
            TimerDOM.timeLeftHolder.classList.remove('hidden');
            DOM.scoreHolder.classList.add('hidden');
            startSingleplayer();
        }
        if (selectedGamemode == 'hot-seat') {
            GamemodesDOM.helpTitle.innerText = 'ENTER THE AMOUNT OF PLAYERS';
            GamemodesDOM.hotseatForm.classList.remove('hidden');
            GamemodesDOM.txthotseatPlayers.addEventListener('keypress', function(e) {
                if (e.key == 'Enter') {
                    if (parseInt(e.target.value) >= 2 && parseInt(e.target.value) <= 5) {
                        // startMultiGame(parseInt(e.target.value));   
                        eliminatedPlayers = [];
                        generatePlayers(parseInt(e.target.value)); 
                    }
                }
            })
        }
        if (selectedGamemode == 'multiplayer') {
            startMultiplayer();
            GamemodesDOM.helpTitle.classList.add('hidden');
            MultiplayerDOM.multiplayerForm.classList.remove('hidden');
        }
    });
});

function generatePlayers(amount) {
    GamemodesDOM.playerOverview.innerHTML = '<div class="players"></div>';
    for (let i = 0; i < amount; i++) {
        players.push({ name: `player ${i + 1}`, score: 0, word: getRandomWord(), eliminated: false });
        GamemodesDOM.playerOverview.querySelector('.players').innerHTML += 
        `<div class='player'>
            <p>
                <img src='img/${players[i].word}.png' class='avatar' alt='img'>
                <span>Name: ${players[i].name}</span>
                <span>Symbol: ${players[i].word}</span>
            </p>
        </div>`
    }
    console.log(players);
    GamemodesDOM.playerOverview.innerHTML += '<button type="button" id="btnDecided">START</button>';
    GamemodesDOM.hotseatForm.classList.add('hidden');
    GamemodesDOM.helpTitle.innerText = 'DECIDE WHO IS WHO';
    GamemodesDOM.playerOverview.classList.remove('hidden');
    
    document.querySelector('#btnDecided').addEventListener('click', function() {
        let time = 3;
        GamemodesDOM.helpTitle.innerText = `GAME WILL BEGIN IN ${time} SECONDS`;
        const playerOverviewCountdown = setInterval(() => {
            if(time == 0) {
                clearInterval(playerOverviewCountdown);
                GamemodesDOM.playerOverview.classList.add('hidden');
                GamemodesDOM.helpTitle.classList.add('hidden');
                TimerDOM.timeLeftHolder.classList.remove('hidden');
                startMultiGame();
            }
            time--;
            GamemodesDOM.helpTitle.innerText = `GAME WILL BEGIN IN ${time} SECONDS`;
        }, 1000);
    })
}

function getRandomWord() {
    let alreadyExists = false;
    let randomWord;
    do {
        alreadyExists = false;
        randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
        players.forEach(player => {
            if (randomWord == player.word) {
                alreadyExists = true;
            }
        });
    }
    while (alreadyExists)

    return randomWord;
}

function startSingleplayer() {
    players.push({ 'name': username, 'score': 0 });
    loadNewLetter();
}

function startMultiGame(serverLetter = null) {
    if(!document.querySelector('.multiplayerLobby').classList.contains('hidden')) {
        document.querySelector('.multiplayerLobby').classList.add('hidden');
    }
    
    currentPlayer = 0;
    
    DOM.currentPlayerTurn.classList.remove('hidden');
    
    // Start het spel
    if(!isConnected){
        loadNewLetter();
        DOM.currentPlayerTurn.innerText = players[currentPlayer].word + `'s turn`;
    } else {
        DOM.currentPlayerTurn.innerText = players[currentPlayer].name + `'s turn`;
        MultiplayerDOM.multiplayerForm.classList.add('hidden');
        TimerDOM.timeLeftHolder.classList.remove('hidden');
        const hiddenPanel = document.querySelector('.gamePanel.hidden');
        if(hiddenPanel) {
            hiddenPanel.classList.remove('hidden');
            DOM.scoreHolder.classList.remove('hidden');
            loadScore();
        }
        startLetter = serverLetter;
        DOM.letterHolder.innerText = `Enter word beginning with ${startLetter}`;
    }
    
}

// Game logica

// Deze methode checkt na of het woord geldig is
async function checkWord(word) {
    word = word.toLowerCase();

    const res = await fetch(URL.enWoordenboek + word);
    const data = await res.json();

    if(isConnected) {
        const message = {
            type: 'check-word',
            word,
            currentplayer: players[currentPlayer],
            fetchdata: data
        };
        socket.send(JSON.stringify(message));
        return;
    }
    // Eerste ronde, aangezien nextLetter nog leeg is
    if (nextLetter == '') {
        if (word[0] != startLetter) {
            loadError('Word does not begin with ' + startLetter);
            wrongAnswer();
            return;
        }
    } else {
        // Checkt of het woordt al is gebruikt door te loopen door de usedWords array
        for (let i = 0; i < usedWords.length; i++) {
            // Indien het gevonden werd laat het een fout zien en stopt het hier
            if (usedWords[i] == word) {
                loadError(`${word} has already been used`);
                return;
            }
        }
        // Checkt of het laatste letter van het gegeven woord overeenkomt met nextLetter
        // Indien het niet overeenkomt laat het een foutmelding zien en stopt het hier
        if (word[0] != nextLetter) {
            loadError('Word does not begin with ' + nextLetter);
            wrongAnswer();
            return;
        }
    }

    if (data.title) {
        loadError('The entered word is invalid');
        wrongAnswer();
        return;
    }

    usedWords.push(word);
    nextLetter = word[word.length - 1];
    adjustScore();
    nextPlayer();
    loadScore();
    loadNewLetter();
    DOM.txtInputBox.value = '';
}

function wrongAnswer() {
    // player geelimineerd
    if (currentPlayer == -1) {
        DOM.txtInputBox.value = '';
        finish();
        return;
    }
    else {
        eliminatePlayer();
        loadScore();
        DOM.txtInputBox.value = '';
    }
}

function eliminatePlayer() {
    if (currentPlayer == -1) {
        players[0].eliminated = true;
        finish();
    } else {
        eliminatedPlayers.push(players[currentPlayer]);
        players[currentPlayer].eliminated = true;
        nextPlayer();
        loadScore();
    }
}

function adjustScore() {
    if (currentPlayer == -1) {
        players[0].score += 1;
        return;
    }

    players[currentPlayer].score += 1;
}

function nextPlayer() {
    if (currentPlayer == -1) return;

    if (eliminatedPlayers.length == players.length - 1) {
        finish();
        GamemodesDOM.gamePanel.classList.add('hidden');
        return;
    }

    currentPlayer++;

    if (currentPlayer > players.length - 1) {
        currentPlayer = 0;
    }
    
    if(players[currentPlayer].eliminated) {
        nextPlayer();
    }
    
    if (isConnected) {
        DOM.currentPlayerTurn.innerText = players[currentPlayer].name + `'s turn`;
    } else {
        DOM.currentPlayerTurn.innerText = players[currentPlayer].word + `'s turn`;
    }
}

let countDownTimer;

function startTimer() {
    if (countDownTimer != undefined) {
        clearInterval(countDownTimer);
    }

    let time = 10;
    TimerDOM.timeLeftValue.innerText = time;

    countDownTimer = setInterval(() => {
        time--;
        TimerDOM.timeLeftValue.innerText = time;
        if (currentPlayer != -1 && eliminatedPlayers.length == players.length - 1) {
            clearInterval(countDownTimer);
        }
        if(time == 0) {
            if(isConnected) {
                const message = {
                    type: 'time-up',
                    currentPlayer: players[currentPlayer]
                };
                console.log('Sending message:', message);
                socket.send(JSON.stringify(message));
            }
            eliminatePlayer();
            clearInterval(countDownTimer);
            startTimer();
        }
    }, 1000);
}

function switchGameOver() {
    for (let i = 0; i < players.length; i++) {
        if(i == 2) {
            players[i].eliminated = false;
        } else {
            players[i].eliminated = true;
        }
        nextPlayer();
    }
}

function loadScore() {
    if (currentPlayer == -1) {
        DOM.currentPlayerTurn.innerText = 'SCORE: ' + players[0].score;
        return;
    }

    DOM.scoreHolder.querySelector('tbody').innerHTML = '';
    for (let i = 0; i < players.length; i++) {
        let eliminatedClass = '';
        let activePlayerClass = '';
        if(players[i].eliminated) {
            eliminatedClass = 'elim';
        }
        if(players[currentPlayer].name == players[i].name) {
            activePlayerClass = 'active';
        } 
        if(!isConnected) {
            DOM.scoreHolder.querySelector('tbody').innerHTML += `<tr class='${eliminatedClass} ${activePlayerClass}'><td><img class='avatar mini' src='img/${players[i].word}.png' alt='img'>${players[i].word}</td><td>${players[i].score}</td></tr>`;
        } else {
            DOM.scoreHolder.querySelector('tbody').innerHTML += `<tr class='${eliminatedClass} ${activePlayerClass}'><td>${players[i].name}</td><td>${players[i].score}</td></tr>`;
        }

    }
    
}

function loadNewLetter(serverLetter = null) {
    startTimer();
    const hiddenPanel = document.querySelector('.gamePanel.hidden');
    if(hiddenPanel) {
        hiddenPanel.classList.remove('hidden');
        if (currentPlayer != -1) {
            DOM.scoreHolder.classList.toggle('hidden');
        }
        loadScore();
    }

    if(isConnected) {
        nextLetter = serverLetter;
        DOM.letterHolder.innerText = `Enter word beginning with ${nextLetter}`;
        return;
    }

    // Eerste ronde, aangezien nextLetter nog leeg is
    if (nextLetter == '') {
        startLetter = letters[Math.floor(Math.random() * letters.length)];
        DOM.letterHolder.innerText = `Enter word beginning with ${startLetter}`;
        return;
    }

    DOM.letterHolder.innerText = `Enter word beginning with ${nextLetter}`;
}

function finish() {
    DOM.errorHolder.innerHTML = '';
    FinishDOM.finishPanel.classList.remove('hidden');
    TimerDOM.timeLeftHolder.classList.add('hidden');
    DOM.currentPlayerTurn.classList.add('hidden');
    DOM.scoreHolder.classList.add('hidden');
    FinishDOM.playerStatsTable.innerHTML = '';    
    if (currentPlayer != -1) {
        FinishDOM.podiumHolder.classList.remove('hidden');
    }
    const { first, second, third } = getTopThree();
    players.forEach(player => {
        if (currentPlayer == -1) {
            FinishDOM.playerStatsTable.innerHTML += `<tr><td>${player.name}</td><td>${player.score}</td></tr>`
        } else {
            let placement = '';
            if(player.name == first.name) placement = '<span class="number">1</span>';
            if(player.name == second.name) placement = '<span class="number">2</span>';
            if (players.length > 2) {
                if(player.name == third.name) placement = '<span class="number">3</span>';
            }
            if(!isConnected) {
                FinishDOM.playerStatsTable.innerHTML += `<tr><td><img src='img/${player.word}.png' class='avatar mini' alt='img'>${player.word}${placement}</td><td>${player.score}</td></tr>`
            } else {
                FinishDOM.playerStatsTable.innerHTML += `<tr><td>${player.name}${placement}</td><td>${player.score}</td></tr>`
            }
        }
    });
    GamemodesDOM.gamePanel.classList.add('hidden');
}

function getTopThree() {
    if (currentPlayer == -1 && players.length < 3) return {};
    let firstPlace, secondPlace, thirdPlace;

    for(let i = 0; i < players.length; i++) {
        if (!players[i].eliminated) {
            firstPlace = players[i];
        }
    }

    secondPlace = eliminatedPlayers[eliminatedPlayers.length - 1];
    thirdPlace = eliminatedPlayers[eliminatedPlayers.length - 2];

    return { 'first': firstPlace, 'second': secondPlace, 'third': thirdPlace };
}

function loadError(msgError) {
    DOM.errorHolder.innerHTML += `<div class='error'>${msgError}</div>`;
}

DOM.btnSubmit.addEventListener('click', () => checkWord(DOM.txtInputBox.value));
DOM.txtInputBox.addEventListener('keypress', function (e) {
    if (e.key == 'Enter') {
        if (!DOM.txtInputBox.value) return;
        checkWord(DOM.txtInputBox.value);
    }
});

DOM.btnGoBack.addEventListener('click', function() {
    /* if(isConnected) {
        socket.close();
        isConnected = false;
    }

    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    GamemodesDOM.gamemodeHolder.classList.remove('hidden'); */

    location.reload();
});

DOM.btnRestart.addEventListener('click', function() {
    const playersAmount = players.length;
    usedWords = [];
    players = [];
    
    // singleplayer
    if (currentPlayer == -1) {
        players[0].score = 0;
        GamemodesDOM.gamePanel.classList.remove('hidden');
        FinishDOM.finishPanel.classList.add('hidden');
        TimerDOM.timeLeftHolder.classList.remove('hidden');
        DOM.currentPlayerTurn.classList.remove('hidden');
        startSingleplayer();
    }

    // hot-seat
    if (currentPlayer != -1 && !isConnected) {
        for (let i = 0; i < players.length; i++) {
            players[i].score = 0;
        }
        FinishDOM.finishPanel.classList.add('hidden');
        GamemodesDOM.helpTitle.classList.remove('hidden');
        generatePlayers(playersAmount);
    }

    // multiplayer
    if (currentPlayer != -1 && isConnected) {

    }
});

function backToLobby() {

}