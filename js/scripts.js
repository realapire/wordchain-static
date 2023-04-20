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

const LoginDOM = {
    frmLogin: document.querySelector('.username-form'),
    txtEmail: document.querySelector('#txtEmail'),
    txtPassword: document.querySelector('#txtPassword'),
    btnLogin: document.querySelector('#btnLogin'),
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
        socket = new WebSocket('ws://localhost:4000');

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
        username: username,
        fetchedId: savedPlayerInfo.id
    };
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
}

let host = '';

function loadLobby(data) {
    if (MultiplayerDOM.lobbyHolder.classList.contains('hidden')) {
        MultiplayerDOM.lobbyHolder.classList.remove('hidden');
        MultiplayerDOM.multiplayerEnteringLobby.classList.add('hidden');
    }
    MultiplayerDOM.playersHolder.innerHTML = '';
    const hostName = data.host.name;
    MultiplayerDOM.lobbyCode.innerText = data.sessionId;
    players = data.players;
    for (let i = 0; i < data.players.length; i++) {
        let role = 'PLAYER';
        if (data.players[i].name == hostName) {
            host = data.players[i];
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

MultiplayerDOM.btnHostSession.addEventListener('click', function () {
    const message = {
        type: 'create-session'
    }
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
});

MultiplayerDOM.btnJoinSession.addEventListener('click', function () {
    const message = {
        type: 'join-session',
        sessionId: MultiplayerDOM.txtSessionId.value
    }
    console.log('Sending message:', message);
    socket.send(JSON.stringify(message));
});

MultiplayerDOM.btnStartGame.addEventListener('click', function () {

    if (players.length < 2 || players.length > 5) {
        loadError('At least 2 and a maximum of 5 people must be connected');
        return;
    }

    for (let i = 0; i < players.length; i++) {
        const currentPlayer = players[i];
        for (let j = i + 1; j < players.length; j++) {
            if (currentPlayer.name === players[j].name) {
                loadError('Two players have the same name');
                return;
            }
        }
    }

    createMatch();

    const message = {
        type: 'start-session',
    };
    socket.send(JSON.stringify(message));
});

// Login

let savedPlayerInfo = JSON.parse(localStorage.getItem('playerInformation')) || '';
let username = '';

console.log(savedPlayerInfo);

if (!savedPlayerInfo) {
    askPlayerInfo();
} else {
    username = savedPlayerInfo.username;
    LoginDOM.usernameHolder.innerText = 'Hello, ' + savedPlayerInfo.username.split('.')[0];
}

async function askPlayerInfo() {
    LoginDOM.frmLogin.classList.remove('hidden');
    LoginDOM.btnLogin.addEventListener('click', async function () {
        savedPlayerInfo = await getPlayerInfo();

        username = savedPlayerInfo.username;
        LoginDOM.usernameHolder.innerText = 'Hello, ' + savedPlayerInfo.username.split('.')[0];
        localStorage.setItem('playerInformation', JSON.stringify(savedPlayerInfo));
        LoginDOM.frmLogin.classList.add('hidden');
    });
}

async function getPlayerInfo() {
    const formData = new FormData();
    formData.append('identity', LoginDOM.txtEmail.value);
    formData.append('password', LoginDOM.txtPassword.value);
    const options = {
        method: 'POST',
        body: formData,
        redirect: 'follow'
    }
    const resp = await fetch('https://lucas-miserez.be/api/collections/person/auth-with-password', options);
    if (!resp.ok) {
        loadError('Error fetching account');
        return 'error';
    }
    const data = await resp.json();
    if (!data.token) {
        loadError('User has not been found');
        return 'error';
    }

    const playerInfo = { id: data.record.id, username: data.record.username, email: LoginDOM.txtEmail.value, token: data.token };

    return playerInfo;
}

// Geschiedenis van alle gegeven woorden in een array
let usedWords = [];
const randomWords = ['elephant', 'ghost', 'dog', 'car', 'rocket'];

let startLetter = '';
let nextLetter = '';
let players = [];
// -1 betekent singleplayer, geen andere speler
let currentPlayer = -1;

let eliminatedPlayers = [];
const teamID = 'foz0mvij5qb59dq';
//

// Gamemode
GamemodesDOM.gamemodeButtons.forEach(button => {
    button.addEventListener('click', function (e) {

        // reset alle spelers
        // players = [];

        DOM.btnGoBack.classList.remove('hidden');

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
            GamemodesDOM.txthotseatPlayers.addEventListener('keypress', function (e) {
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

    document.querySelector('#btnDecided').addEventListener('click', function () {
        let time = 3;
        GamemodesDOM.helpTitle.innerText = `GAME WILL BEGIN IN ${time} SECONDS`;
        const playerOverviewCountdown = setInterval(() => {
            if (time == 0) {
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

    createMatch(savedPlayerInfo.id, savedPlayerInfo.id);

    loadNewLetter();
}


// API calls

async function createMatch(spelers, hostID) {
	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");
	myHeaders.append("Authorization", "Bearer " + savedPlayerInfo.token);

	var raw = JSON.stringify({
		"spelers": [
            spelers
		],
		"host": hostID,    
		"team": teamID
	});

	var requestOptions = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow'
	};

	await fetch("https://lucas-miserez.be/api/collections/match/records", requestOptions)
		.then(response => response.json())
		.then(result => {
			match = result.id;
		})
		.catch(error => console.log('error', error));
}

let collectionScoreIds = [];

async function createScorePerPlayer(playerId, plaats, score) {
	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");
	myHeaders.append("Authorization", "Bearer " + savedPlayerInfo.token);

	var raw = JSON.stringify({
		"player": playerId,
		"plaats": plaats,
		"score": score,
		"score_is_van_team": teamID
	});

	var requestOptions = {
		method: 'POST',
		headers: myHeaders,
		body: raw,
		redirect: 'follow'
	};

	await fetch("https://lucas-miserez.be/api/collections/score/records", requestOptions)
		.then(response => response.json())
		.then(result => {
            console.log(host);
			collectionScoreIds.push(result.id);
		})
		.catch(error => console.log('error', error));

    console.log(collectionScoreIds);
}

async function endGame(userIdVanWinnaar) {
	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");
	myHeaders.append("Authorization", "Bearer " + verificationToken);

	var raw = JSON.stringify({
		"scores": scores,
		"winnaar": userIdVanWinnaar,
		"d0n3": true
	});

	var requestOptions = {
		method: 'PATCH',
		headers: myHeaders,
		body: raw,
		redirect: 'follow'
	};

	fetch("https://lucas-miserez.be/api/collections/match/records/" + match, requestOptions)
		.then(response => response.text())
		.then(result => console.log(result))
		.catch(error => console.log('error', error));
}


function startMultiGame(serverLetter = null) {
    if (!document.querySelector('.multiplayerLobby').classList.contains('hidden')) {
        document.querySelector('.multiplayerLobby').classList.add('hidden');
    }

    currentPlayer = 0;

    DOM.currentPlayerTurn.classList.remove('hidden');

    // Start het spel
    if (!isConnected) {
        loadNewLetter();
        DOM.currentPlayerTurn.innerText = players[currentPlayer].word + `'s turn`;
    } else {
        DOM.currentPlayerTurn.innerText = players[currentPlayer].name + `'s turn`;
        MultiplayerDOM.multiplayerForm.classList.add('hidden');
        TimerDOM.timeLeftHolder.classList.remove('hidden');
        const hiddenPanel = document.querySelector('.gamePanel.hidden');
        if (hiddenPanel) {
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

    if (isConnected) {
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

    if (players[currentPlayer].eliminated) {
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
        if (time == 0) {
            if (isConnected) {
                const message = {
                    type: 'time-up',
                    currentplayer: players[currentPlayer]
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
        if (i == 2) {
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
        if (players[i].eliminated) {
            eliminatedClass = 'elim';
        }
        if (players[currentPlayer].name == players[i].name) {
            activePlayerClass = 'active';
        }
        if (!isConnected) {
            DOM.scoreHolder.querySelector('tbody').innerHTML += `<tr class='${eliminatedClass} ${activePlayerClass}'><td><img class='avatar mini' src='img/${players[i].word}.png' alt='img'>${players[i].word}</td><td>${players[i].score}</td></tr>`;
        } else {
            DOM.scoreHolder.querySelector('tbody').innerHTML += `<tr class='${eliminatedClass} ${activePlayerClass}'><td>${players[i].name}</td><td>${players[i].score}</td></tr>`;
        }

    }

}

function loadNewLetter(serverLetter = null) {
    startTimer();
    const hiddenPanel = document.querySelector('.gamePanel.hidden');
    if (hiddenPanel) {
        hiddenPanel.classList.remove('hidden');
        if (currentPlayer != -1) {
            DOM.scoreHolder.classList.toggle('hidden');
        }
        loadScore();
    }

    if (isConnected) {
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
    if (countDownTimer != undefined) {
        clearInterval(countDownTimer);
    }

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
            if (player.name == first.name) placement = '<span class="number">1</span>';
            if (player.name == second.name) placement = '<span class="number">2</span>';
            if (players.length > 2) {
                if (player.name == third.name) placement = '<span class="number">3</span>';
            }
            if (!isConnected) {
                FinishDOM.playerStatsTable.innerHTML += `<tr><td><img src='img/${player.word}.png' class='avatar mini' alt='img'>${player.word}${placement}</td><td>${player.score}</td></tr>`
            } else {
                FinishDOM.playerStatsTable.innerHTML += `<tr><td>${player.name}${placement}</td><td>${player.score}</td></tr>`
            }
        }
    });

    
    if (currentPlayer == -1) {
        createScorePerPlayer(savedPlayerInfo.id, 1, players[0].score);
        endGame(savedPlayerInfo.id);
    } else {
        if (isConnected) {
            console.log(getCurrentPlayerById());
            // console.log(eliminatedPlayers[getCurrentPlayerById()], players[getCurrentPlayerById()].score);
            console.log(getPlayerPosition());
                
            createScorePerPlayer(savedPlayerInfo.id, getPlayerPosition(), players[getCurrentPlayerById()].score);
        }    
    }

    GamemodesDOM.gamePanel.classList.add('hidden');
}

function getCurrentPlayerById() {
    for (let i = 0; i < players.length; i++) {
        if (players[i].fetchid == savedPlayerInfo.id) {
            return i;
        }
    }

    return -1;
}

function getPlayerPosition() {
    for (let i = 2; i < eliminatedPlayers.length + 2; i++)
    {
        if (eliminatedPlayers[i - 2].fetchid == savedPlayerInfo.id) {
            return i;
        }    
    }

    return 1;
}

function getTopThree() {
    if (currentPlayer == -1 && players.length < 3) return {};
    let firstPlace, secondPlace, thirdPlace;

    for (let i = 0; i < players.length; i++) {
        if (!players[i].eliminated) {
            firstPlace = players[i];
        }
    }

    secondPlace = eliminatedPlayers[eliminatedPlayers.length - 1];
    thirdPlace = eliminatedPlayers[eliminatedPlayers.length - 2];

    return { 'first': firstPlace, 'second': secondPlace, 'third': thirdPlace };
}

function loadError(msgError) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerText = msgError;

    DOM.errorHolder.appendChild(errorDiv);

    setTimeout(function () {
        const fadeEffect = setInterval(function () {
            if (!errorDiv.style.opacity) {
                errorDiv.style.opacity = 1;
            }
            if (errorDiv.style.opacity > 0) {
                errorDiv.style.opacity -= 0.1;
            } else {
                clearInterval(fadeEffect);
                DOM.errorHolder.removeChild(errorDiv);
            }
        }, 50);
    }, 750);
}


DOM.btnSubmit.addEventListener('click', () => checkWord(DOM.txtInputBox.value));
DOM.txtInputBox.addEventListener('keypress', function (e) {
    if (e.key == 'Enter') {
        if (!DOM.txtInputBox.value) return;
        checkWord(DOM.txtInputBox.value);
    }
});

DOM.btnGoBack.addEventListener('click', function () {
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

DOM.btnRestart.addEventListener('click', function () {
    const playersAmount = players.length;
    usedWords = [];
    players = [];

    // singleplayer
    if (currentPlayer == -1) {
        if (players[0].score) {
            players[0].score = 0;
        }
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