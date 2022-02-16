import Matter from "matter-js";

import { channel } from "../user_socket.js";

import {
    SCREEN_H,
    SCREEN_W,
    PIECE_R,
    LAUNCH_MULT,
    MAX_LAUNCH,
    MAX_LAUNCH_SQUARED,
    P_MASK,
    PLAYER_PIECES,
    P_COLORS,
} from "./constants.js";
import { desArrAddToMap, serLaunchVec } from "./deserde.js";
import {
    createArrow,
    destroyArrows,
    createSensors,
} from "./createDestroy.js";

// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Composite = Matter.Composite,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Body = Matter.Body,
    Bodies = Matter.Bodies,
    Events = Matter.Events;

var Game = {
    // 0 when no piece is selected
    selectedPieceId: 0,
    idToPiece: new Map(),
    playerPieceIds: new Set(),
    opponentPieceIds: new Set(),
    pieceIdToLaunchVec: new Map(),
    sensorToPieceId: new Map(),
    pieceIdToArrow: new Map(),
};

// create an engine with no gravity
var engine = Engine.create(),
    world = engine.world;
engine.gravity.y = 0;

Game.world = world;

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

export function startGame() {
    createPieces();

    // run the renderer
    Render.run(render);

    // run the engine
    Runner.run(runner, engine);

    // add mouse control
    var mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
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
        Game.selectedPieceId = Game.sensorToPieceId.get(sensor);
        if (Game.selectedPieceId) {
            const id = Game.selectedPieceId;

            if (!Game.pieceIdToArrow.has(id)) {
                // create arrow
                Game.pieceIdToArrow.set(
                    id,
                    createArrow(
                        mouseConstraint.mouse.position,
                        world,
                    ),
                );
            }
            renderArrow(
                Game.pieceIdToArrow.get(id),
                pieceOfId(id),
                mouseConstraint.mouse.position,
            );
        }
    });

    Events.on(mouseConstraint, "mousemove", () => {
        const selectedPiece = pieceOfId(Game.selectedPieceId);
        if (selectedPiece) {
            renderArrow(
                Game.pieceIdToArrow.get(Game.selectedPieceId),
                selectedPiece,
                mouseConstraint.mouse.position,
            );
        }
    });

    Events.on(mouseConstraint, "mouseup", () => {
        const selectedPiece = pieceOfId(Game.selectedPieceId);
        if (selectedPiece) {
            storeLaunchVec(
                selectedPiece,
                mouseConstraint.mouse.position,
            );
        }
        Game.selectedPieceId = 0;
    });

    Composite.add(world, mouseConstraint);

    channel.on("launchVecs", (payload) => {
        desArrAddToMap(Game.pieceIdToLaunchVec, payload.body);
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

// returns the piece corresponding to the `id` parameter
const pieceOfId = (id) => {
    return Game.idToPiece.get(id);
};

const launch = () => {
    destroySensors();
    destroyArrows(Game, world);

    // stop runner so that all piece velocity vectors can be set.
    runner.enabled = false;
    for (var [id, launchVec] of Game.pieceIdToLaunchVec.entries()) {
        launchVec.x *= LAUNCH_MULT;
        launchVec.y *= LAUNCH_MULT;
        Body.setVelocity(pieceOfId(id), launchVec);
    }
    // launch pieces simultaneously
    runner.enabled = true;

    Game.pieceIdToLaunchVec = new Map();
    simulate();
};

const sendLaunchVecs = () => {
    // Transform the launch vec map into an array because it is compatible with the server.
    const launchVecArr = serLaunchVec(Game.pieceIdToLaunchVec);
    channel.push("sendLaunchVecs", { body: launchVecArr });
};

const simulate = () => {
    setTimeout(function () {
        outOfBoundsCheck();
        createSensors(Game);
        console.log("sensors created");
    }, 5000);
};

const outOfBoundsCheck = () => {
    for (const [id, piece] of Game.idToPiece) {
        if (outOfBounds(piece)) {
            // remove the piece id in the player or opponent data
            if (Game.opponentPieceIds.has(id)) {
                Game.opponentPieceIds.delete(id);
            } else {
                Game.playerPieceIds.delete(id);
            }
            destroyPiece(piece);
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

const destroyPiece = (piece) => {
    Composite.remove(world, piece);
};

const destroySensors = () => {
    for (const [
        sensor,
        _id, // eslint-disable-line no-unused-vars
    ] of Game.sensorToPieceId.entries()) {
        Composite.remove(world, sensor);
    }

    // prepare the Game state to receive the sensors in the next round
    Game.sensorToPieceId = new Map();
};

// piece is a `body`
// `mousePos` is of the form {x, y}
const storeLaunchVec = (piece, mousePos) => {
    const piecePos = piece.position;
    let vel = calcLaunchVec({
        x: mousePos.x - piecePos.x,
        y: mousePos.y - piecePos.y,
    });
    Game.pieceIdToLaunchVec.set(piece.id, vel);
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

const createPieces = () => {
    const pieces = [
        createPiece(SCREEN_W / 4, SCREEN_H / 4, {
            fillStyle: P_COLORS[0],
        }),
        createPiece(SCREEN_W / 4, (SCREEN_H * 3) / 4, {
            fillStyle: P_COLORS[0],
        }),
        createPiece(SCREEN_W / 8, SCREEN_H / 2, {
            fillStyle: P_COLORS[0],
        }),
        createPiece((SCREEN_W * 3) / 4, SCREEN_H / 4, {
            fillStyle: P_COLORS[1],
        }),
        createPiece((SCREEN_W * 3) / 4, (SCREEN_H * 3) / 4, {
            fillStyle: P_COLORS[1],
        }),
        createPiece((SCREEN_W * 7) / 8, SCREEN_H / 2, {
            fillStyle: P_COLORS[1],
        }),
    ];

    for (const piece of pieces) {
        Game.idToPiece.set(piece.id, piece);
    }
};

const createPiece = function (x, y, render = {}) {
    const piece = Bodies.circle(x, y, PIECE_R, {
        restitution: 0.5,
        friction: 0,
        frictionAir: 0.03,
        frictionStatic: 0,
        render: render,
    });
    Composite.add(world, piece);
    return piece;
};

const assignPieces = function (Game, playerId, players) {
    let pieceIds = allPieceIdArr(players);
    Game.playerPieceIds = setPlayerPieces(playerId, pieceIds);
    console.log(Game.playerPieceIds);
    Game.opponentPieceIds = new Set(pieceIds);
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
    assignPieces(Game, playerId, players);
    createSensors(Game);
}
