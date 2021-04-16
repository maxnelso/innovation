import {INVALID_MOVE, TurnOrder} from 'boardgame.io/core';
import {generateDecks, stackablesTable} from './InnovationData';

export const Innovation = {
    name: 'innovation',
    minPlayers: 2,
    maxPlayers: 2, // TODO: not everything is multiplayer-friendly or teams-friendly.
    setup: mySetup,

    phases: {
        startPhase: {
            moves: {MeldAction},
            stages: {
                startStage: {},
            },
            turn: {
                moveLimit: 1,
            },
            start: true,
            next: 'mainPhase',
            endIf: (G, ctx) => (G.numDoneOpening === ctx.numPlayers),
            onEnd: (G, ctx) => {
                let players = ctx.playOrder.slice();
                players.sort((a, b) => {
                    let nameA = topCards(G[a].board)[0].name;
                    let nameB = topCards(G[b].board)[0].name;
                    if (nameA < nameB) {
                        return -1;
                    } else if (nameA > nameB) {
                        return 1;
                    }
                    return 0;
                });
                G.turnOrderStateMachine.leader = players[0];
            },
        },

        mainPhase: {
            moves: {
                MeldAction, AchieveAction,
                DogmaAction: {
                    // May crash since we don't know what the dogma will do.
                    move: DogmaAction,
                    client: false,
                },
                DrawAction: {
                    // Crashes otherwise by trying to access deck locally.
                    move: DrawAction,
                    client: false,
                }
            },
            endIf: G => (G.stack.length !== 0),
            next: 'resolveStack',
            turn: {
                moveLimit: 1,
                order: {
                    first: (G, ctx) => parseInt(G.turnOrderStateMachine.leader),
                    next: (G, ctx) => parseInt(G.turnOrderStateMachine.leader),
                }
            }
        },

        resolveStack: {
            moves: {
                // Both of these need the server since we don't know
                // what effect they will end up executing.
                ClickMenu: {
                    move: ClickMenu,
                    client: false,
                }, ClickCard: {
                    move: ClickCard,
                    client: false,
                },
            },
            endIf: G => (G.stack.length === 0),
            next: 'mainPhase',
            turn: {
                moveLimit: 1,
                order: {
                    first: playerPosFromStackable,
                    next: playerPosFromStackable,
                }
            }
        },
    },

    endIf: computeVictory,
};

const acceleratedSetup = true; // Give each player a bunch of stuff to speed up debugging.

export const colors = Array.of("yellow", "blue", "purple", "red", "green");
export const symbols = Array.of("castle", "crown", "bulb", "leaf", "factory", "clock");
export const ages = Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

const functionsTable = {
    "wheel": (G, playerID) => drawMultiple(G, playerID, 1, 2),
    "writing": (G, playerID) => drawMultiple(G, playerID, 2, 1),
    "shareDraw": (G, playerID) => drawNormal(G, playerID),
    "scoreOneFromHand": (G, playerID, cardID) => {
        let index = G[playerID].hand.findIndex(element => (element.id === cardID));
        if (index === -1) {
            return INVALID_MOVE;
        }
        let name = G[playerID].hand[index].name;
        G[playerID].score.push(G[playerID].hand[index]);
        G[playerID].hand.splice(index, 1);
        G.log.push("Player " + playerID + " scores " + name + " from hand");
    },
    "mayDrawATen": (G, playerID, msg) => {
        if (msg === "no") {
            G.log.push("Player " + playerID + " declines to draw a 3");
            return;
        }
        if (msg === "yes") {
            drawMultiple(G, playerID, 10, 1)
            return;
        }
        return INVALID_MOVE;
    },
    "splayPurpleLeft": (G, playerID) => {
        G[playerID].board.splay['purple'] = 'left';
    },
};

function ClickCard(G, ctx, id) {
    let stackable = G.stack.pop();
    if (!stackable.hasOwnProperty('executeWithCard')) {
        return INVALID_MOVE;
    }
    let x = functionsTable[stackable.executeWithCard](G, stackable.playerID, id);
    TryUnwindStack(G, ctx);
    return x;
}

function ClickMenu(G, ctx, msg) {
    let stackable = G.stack.pop();
    if (!stackable.hasOwnProperty('executeWithMenu')) {
        return INVALID_MOVE;
    }
    let x = functionsTable[stackable.executeWithMenu](G, stackable.playerID, msg);
    TryUnwindStack(G, ctx);
    return x;
}

function TryUnwindStack(G, ctx) {
    while (G.stack.length !== 0 && G.stack[G.stack.length - 1].playerToMove === '') {
        let stackable = G.stack.pop();
        functionsTable[stackable.executeBlind](G, stackable.playerID);
    }
}

// TODO: we need to check this during each stackable etc.
// Technically in the middle of every effect.
// Let's just check after turns for now and revisit later.
function computeVictory(G, ctx) {
    let players = ctx.playOrder.slice();
    let winningPlayers = Array(0);
    if (G.drewEleven) {
        // compute highest score.
        let scores = players.map(p => getScore(G, p));
        let highestScore = Math.max(...scores);
        winningPlayers = players.filter(p => (getScore(G, p) === highestScore));
    } else {
        winningPlayers = players.filter(p => (G[p].achievements.length >= G.achievementsToWin));
    }
    if (winningPlayers.length >= 1) {
        if (winningPlayers.length >= 2) {
            return {draw: true};
        }
        return {winner: winningPlayers[0]};
    }
}

function playerPosFromStackable(G, ctx) {
    let stackable = G.stack[G.stack.length - 1];
    console.log("playerPosFromStackable", stackable.playerToMove);
    return parseInt(stackable.playerToMove);
}

function recordMainPhaseAction(G, ctx) {
    G.turnOrderStateMachine.movesAsLeader += 1;
    if (G.turnOrderStateMachine.initialTurnsRemaining > 0 || G.turnOrderStateMachine.movesAsLeader === 2) {
        G.turnOrderStateMachine.leader = nextPlayer(G.turnOrderStateMachine.leader, ctx.numPlayers);
        G.turnOrderStateMachine.movesAsLeader = 0;
    }
    if (G.turnOrderStateMachine.initialTurnsRemaining > 0) {
        G.turnOrderStateMachine.initialTurnsRemaining -= 1;
    }
}

function DrawAction(G, ctx) {
    drawNormal(G, ctx.playerID)
    recordMainPhaseAction(G, ctx);
}

function drawNormal(G, playerID) {
    let ageToDraw = topAge(G, playerID);
    drawAux(G, playerID, ageToDraw);
}

function drawMultiple(G, playerID, age, num) {
    for (let i = 0; i < num; i++) {
        drawAux(G, playerID, age);
    }
}

// TODO: want to use typescript... ageToDraw is an int.
function drawAux(G, playerID, ageToDraw) {
    if (ageToDraw <= 0) {
        drawAux(G, playerID, 1);
    } else if (ageToDraw > 10) {
        G.drewEleven = true;
    } else if (G.decks[ageToDraw].length === 0) {
        drawAux(G, playerID, ageToDraw + 1);
    } else {
        G.log.push("Player " + playerID + " draws a " + ageToDraw.toString());
        G[playerID].hand.push(G.decks[ageToDraw].pop());
    }
}

// TODO: symbolCounts does not consider splay, it only takes the top card.
export function symbolCounts(board) {
    let counts = {};
    for (const key of symbols) {
        counts[key] = 0;
    }
    colors.forEach(color => {
        let pile = board[color];
        if (pile.length === 0) {
            return;
        }
        let splay = board.splay[color];
        // 0 1 2
        // 3 4 5
        let positions = [];
        if (splay === 'left') {
            positions = [2, 5];
        } else if (splay === 'right') {
            positions = [0, 3];
        } else if (splay === 'up') {
            positions = [3, 4, 5];
        }
        for (let i = 0; i < pile.length - 1; i++) {
            positions.forEach(pos => {
                let s = pile[i].symbols[pos];
                if (s === "hex" || s === "") {
                    return;
                }
                counts[s] += 1;
            });
        }
        pile[pile.length - 1].symbols.forEach(s => {
            if (s === "hex" || s === "") {
                return;
            }
            counts[s] += 1;
        });
    });
    return counts;
}

export function topAge(G, playerID) {
    let topAges = topCards(G[playerID].board).map(element => element.age);
    let age = 0;
    if (topAges.length !== 0) {
        age = Math.max(...topAges);
    }
    return age;
}

function getScore(G, playerID) {
    let total = 0;
    G[playerID].score.forEach(element => {
        total += element.age;
    });
    return total;
}

function MeldAction(G, ctx, id) {
    let index = G[ctx.playerID].hand.findIndex(element => (element.id === id));
    if (index === -1) {
        return INVALID_MOVE;
    }
    let name = G[ctx.playerID].hand[index].name;
    let color = G[ctx.playerID].hand[index].color;
    G[ctx.playerID].board[color].push(G[ctx.playerID].hand[index]);
    G[ctx.playerID].hand.splice(index, 1);
    G.log.push("Player " + ctx.playerID + " melds " + name);
    if (ctx.phase === 'startPhase') {
        G.numDoneOpening += 1;
    } else {
        recordMainPhaseAction(G, ctx);
    }
}

function AchieveAction(G, ctx, id) {
    let index = G.achievements.findIndex(element => (element.id === id));
    if (index === -1) {
        return INVALID_MOVE;
    }
    let achievement = G.achievements[index];
    if (!isEligible(G, ctx.playerID, achievement.age)) {
        return INVALID_MOVE;
    }
    G.log.push("Player " + ctx.playerID + " achieves " + G.achievements[index].name);
    G[ctx.playerID].achievements.push(G.achievements[index]);
    G.achievements.splice(index, 1);
    recordMainPhaseAction(G, ctx);
}

function isEligible(G, playerID, achievementAge) {
    // TODO: doesn't handle Echoes rules yet.
    return (topAge(G, playerID) >= achievementAge && getScore(G, playerID) >= 5 * achievementAge);
}

function DogmaAction(G, ctx, id) {
    // TODO: need to check if the card is a top card of the board, not just onboard.
    let candidates = topCards(G[ctx.playerID].board);
    let index = candidates.findIndex(element => (element.id === id));
    if (index === -1) {
        return INVALID_MOVE;
    }
    let card = candidates[index];
    G.log.push("Player " + ctx.playerID + " activates " + card.name);

    let playersToShare = [];
    let activePlayerSymbols = symbolCounts(G[ctx.playerID].board);
    // Note: this is the wrong iteration order for multiplayer.
    // If we implement 3+ players, start from player x+1` and wrap around.
    ctx.playOrder.forEach(player => {
        if (player === ctx.playerID) {
            return;
        }
        let playerSymbols = symbolCounts(G[player].board);
        if (playerSymbols[card.mainSymbol] >= activePlayerSymbols[card.mainSymbol]) {
            playersToShare.push(player);
        }
    });

    // TODO: for now we assume a share-draw is present if we shared.
    // Later, figure out how to wire through the bool of whether anything changed.
    if (playersToShare.length > 0) {
        G.stack.push(stackablesTable["shareDraw"](G, ctx.playerID));
        card.dogmasFunction.forEach(dogmaName => {
            G.stack.push(stackablesTable[dogmaName](G, ctx.playerID));
            playersToShare.forEach(playerID => G.stack.push(stackablesTable[dogmaName](G, playerID)))
        });
    } else {
        card.dogmasFunction.forEach(dogmaName => G.stack.push(stackablesTable[dogmaName](G, ctx.playerID)));
    }

    TryUnwindStack(G, ctx);
    recordMainPhaseAction(G, ctx);
}

function mySetup(ctx) {
    let G = {
        log: Array(0),
        decks: generateDecks(ctx),
        turnOrderStateMachine: {
            numSingleTurnsRemaining: false,
            leader: "0",
            movesAsLeader: 0,
            initialTurnsRemaining: Math.floor(ctx.numPlayers / 2),
        },
        stack: Array(0),
        achievements: Array(0),
        achievementsToWin: 8 - ctx.numPlayers, // TODO: different for expansions.
        numDoneOpening: 0,
        drewEleven: false,
    };
    for (let i = 0; i < ctx.numPlayers; i++) {
        let board = {};
        let splay = {};
        for (const key of colors) {
            board[key] = [];
            splay[key] = '';
        }
        board.splay = splay;
        let playerData = {
            hand: Array(0),
            score: Array(0),
            achievements: Array(0),
            board: board,
        };
        for (let j = 0; j < 2; j++) {
            playerData.hand.push(G.decks[1].pop());
        }
        G[i.toString()] = playerData;
    }
    for (let i = 1; i < 10; i++) {
        G.achievements.push(G.decks[i].pop());
    }
    if (acceleratedSetup) {
        for (let age = 2; age < 8; age++) {
            for (let i = 0; i < ctx.numPlayers; i++) {
                G[i.toString()].hand.push(G.decks[age].pop());
                G[i.toString()].score.push(G.decks[age].pop());
            }
        }
    }
    ctx.events.setActivePlayers({all: 'startStage', moveLimit: 1});
    return G;
}

function nextPlayer(player, numPlayers) {
    return ((parseInt(player, 10) + 1) % numPlayers).toString();
}

function topCards(board) {
    return colors.flatMap(color => {
        if (board[color].length === 0) {
            return [];
        }
        return [board[color][board[color].length - 1]];
    });
}