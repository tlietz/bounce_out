import Matter from "matter-js";
// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner;

import { SCREEN_H, SCREEN_W } from "./constants.js";

import { initChannel, initMouse, initPieces } from "./setup.js";

class Game {
    constructor(channel, gameState = 0) {
        // create an engine with no gravity
        this.channel = channel;
        var engine = Engine.create();
        engine.gravity.y = 0;

        var render = Render.create({
            element: document.body,
            engine: engine,
            options: {
                width: SCREEN_W,
                height: SCREEN_H,
                wireframes: false,
            },
        });

        var runner = Runner.create();
        // run the renderer
        Render.run(render);

        // run the engine
        Runner.run(runner, engine);
        this.world = engine.world;
        this.render = render;
        this.runner = runner;
        this.engine = engine;

        // 0 when no piece is selected
        this.selectedPieceId = 0;

        if (!gameState) {
            this.idToPiece = new Map();
            this.playerPieceIds = new Set();
            this.opponentPieceIds = new Set();
            this.pieceIdToLaunchVec = new Map();
            this.sensorToPieceId = new Map();
            this.pieceIdToArrow = new Map();
        }
    }

    pieceOfId(id) {
        return this.idToPiece.get(id);
    }

    pieces() {
        return Array.from(this.idToPiece.values());
    }
}

// TODO: ability to define the starting state of a game
export function startGame(playerId, players, channel, gameState) {
    var game = new Game(channel, gameState);

    initPieces(game, playerId, players);

    initMouse(game);

    initChannel(game);

    document.body.onkeyup = function (e) {
        if (e.key == " ") {
            notifyLaunch(game);
        }
    };
}

const notifyLaunch = (game) => {
    game.channel.push("notifyLaunch");
};
