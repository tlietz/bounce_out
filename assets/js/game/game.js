import Matter from "matter-js";

import { channel } from "../user_socket.js";

import {
    SCREEN_H,
    SCREEN_W,
    LAUNCH_MULT,
    MAX_LAUNCH,
    MAX_LAUNCH_SQUARED,
    P_MASK,
    PLAYER_PIECES,
} from "./constants.js";

import { desArrAddToMap, serLaunchVec } from "./deserde.js";

import {
    createArrow,
    destroyArrows,
    createSensors,
    destroySensors,
    createPieces,
    destroy,
} from "./createDestroy.js";

// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Composite = Matter.Composite,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Body = Matter.Body,
    Events = Matter.Events;

class Game {
    constructor(world, render, runner, engine) {
        this.world = world;
        this.render = render;
        this.runner = runner;
        this.engine = engine;
        // 0 when no piece is selected
        this.selectedPieceId = 0;
        this.idToPiece = new Map();
        this.playerPieceIds = new Set();
        this.opponentPieceIds = new Set();
        this.pieceIdToLaunchVec = new Map();
        this.sensorToPieceId = new Map();
        this.pieceIdToArrow = new Map();
    }

    pieceOfId(id) {
        return this.idToPiece.get(id);
    }
}

// create an engine with no gravity
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

// create runner
var runner = Runner.create();
var game = new Game(engine.world, render, runner, engine);

export function startGame() {
    createPieces(game);

    // run the renderer
    Render.run(game.render);

    // run the engine
    Runner.run(game.runner, game.engine);

    // add mouse control
    var mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(game.engine, {
            mouse: mouse,
            constraint: {
                stiffness: 1,
                render: {
                    visible: false,
                },
            },
            collisionFilter: {
                category: P_MASK,
                mask: P_MASK,
            },
        });

    // If a piece was clicked,
    // track the motion of the mouse until it is released,
    // then store the launch vector of the piece corresponding to where the mouse was released.
    Events.on(mouseConstraint, "mousedown", () => {
        const sensor = mouseConstraint.body;
        game.selectedPieceId = game.sensorToPieceId.get(sensor);
        if (game.selectedPieceId) {
            const id = game.selectedPieceId;

            if (!game.pieceIdToArrow.has(id)) {
                // create arrow
                game.pieceIdToArrow.set(
                    id,
                    createArrow(
                        mouseConstraint.mouse.position,
                        game.world,
                    ),
                );
            }
            renderArrow(
                game.pieceIdToArrow.get(id),
                game.pieceOfId(id),
                mouseConstraint.mouse.position,
            );
        }
    });

    Events.on(mouseConstraint, "mousemove", () => {
        const selectedPiece = game.pieceOfId(game.selectedPieceId);
        if (selectedPiece) {
            renderArrow(
                game.pieceIdToArrow.get(game.selectedPieceId),
                selectedPiece,
                mouseConstraint.mouse.position,
            );
        }
    });

    Events.on(mouseConstraint, "mouseup", () => {
        const selectedPiece = game.pieceOfId(game.selectedPieceId);
        if (selectedPiece) {
            storeLaunchVec(
                selectedPiece,
                mouseConstraint.mouse.position,
            );
        }
        game.selectedPieceId = 0;
    });

    Composite.add(game.world, mouseConstraint);

    channel.on("launchVecs", (payload) => {
        desArrAddToMap(game.pieceIdToLaunchVec, payload.body);
        launch();
    });

    channel.on("sendLaunchVecs", () => {
        sendLaunchVecs();
    });

    document.body.onkeyup = function (e) {
        if (e.key == " ") {
            notifyLaunch();
        }
    };
}

const notifyLaunch = () => {
    channel.push("notifyLaunch");
};

const launch = () => {
    destroySensors(game);
    destroyArrows(game);

    // stop runner so that all piece velocity vectors can be set.
    runner.enabled = false;
    for (var [id, launchVec] of game.pieceIdToLaunchVec.entries()) {
        launchVec.x *= LAUNCH_MULT;
        launchVec.y *= LAUNCH_MULT;
        Body.setVelocity(game.pieceOfId(id), launchVec);
    }
    // launch pieces simultaneously
    runner.enabled = true;

    game.pieceIdToLaunchVec = new Map();
    simulate();
};

const sendLaunchVecs = () => {
    // Transform the launch vec map into an array because it is compatible with the server.
    const launchVecArr = serLaunchVec(game.pieceIdToLaunchVec);
    channel.push("sendLaunchVecs", { body: launchVecArr });
};

const simulate = () => {
    setTimeout(function () {
        outOfBoundsCheck();
        createSensors(game);
        console.log("sensors created");
    }, 5000);
};

const outOfBoundsCheck = () => {
    for (const [id, piece] of game.idToPiece) {
        if (outOfBounds(piece)) {
            // remove the piece id in the player or opponent data
            if (game.opponentPieceIds.has(id)) {
                game.opponentPieceIds.delete(id);
            } else {
                game.playerPieceIds.delete(id);
            }
            destroy(piece);
        }
    }
};

const outOfBounds = (piece) => {
    const x = piece.position.x;
    const y = piece.position.y;

    if (x < 0 || x > SCREEN_W || y < 0 || y > SCREEN_H) {
        return true;
    }
    return false;
};

// piece is a `body`
// `mousePos` is of the form {x, y}
const storeLaunchVec = (piece, mousePos) => {
    const piecePos = piece.position;
    let vel = calcLaunchVec({
        x: mousePos.x - piecePos.x,
        y: mousePos.y - piecePos.y,
    });
    game.pieceIdToLaunchVec.set(piece.id, vel);
};

// returns the velocity vector capped to the maximum launch speed
// These values will need to be sent to other players, so make them integers for ease of sending
const calcLaunchVec = (vel) => {
    const velXsq = vel.x * vel.x;
    const velYsq = vel.y * vel.y;
    if (velXsq + velYsq > MAX_LAUNCH_SQUARED) {
        const normalize = Math.sqrt(velXsq + velYsq);
        vel.x = (MAX_LAUNCH * vel.x) / normalize;
        vel.y = (MAX_LAUNCH * vel.y) / normalize;
    }

    // The server expects integers
    vel.x = Math.round(vel.x);
    vel.y = Math.round(vel.y);
    return vel;
};

const renderArrow = (arrow, piece, mousePos) => {
    const piecePos = piece.position;
    const launchVec = calcLaunchVec({
        x: mousePos.x - piecePos.x,
        y: mousePos.y - piecePos.y,
    });
    const arrowPos = {
        x: launchVec.x + piecePos.x,
        y: launchVec.y + piecePos.y,
    };
    Body.setPosition(arrow, arrowPos);
};

const assignPieces = function (game, playerId, players) {
    let pieceIds = allPieceIdArr(players);
    game.playerPieceIds = setPlayerPieces(playerId, pieceIds);
    console.log(game.playerPieceIds);
    game.opponentPieceIds = new Set(pieceIds);
};

const setPlayerPieces = (playerId, allPieceIdArr) => {
    return new Set(
        allPieceIdArr.splice(
            PLAYER_PIECES * (playerId - 1),
            PLAYER_PIECES,
        ),
    );
};

// allPieceIdArr makes an array starting at 0 incrementing until the total number of pieces
const allPieceIdArr = (players) => {
    return Array.from(
        { length: players * PLAYER_PIECES },
        (_, idx) => ++idx,
    );
};

export function playerSetup(playerId, players) {
    assignPieces(game, playerId, players);
    createSensors(game);
}
