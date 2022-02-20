/*
    Help with launching pieces and dealing with launch vectors.
*/

import Matter from "matter-js";
var Body = Matter.Body;

import {
    SCREEN_H,
    SCREEN_W,
    LAUNCH_MULT,
    MAX_LAUNCH,
    MAX_LAUNCH_SQUARED,
} from "./constants.js";

import { serLaunchVec } from "./deserde.js";

import {
    destroyArrows,
    createSensors,
    destroySensors,
    destroy,
} from "./createDestroy.js";

// piece is a `body`
// `mousePos` is of the form {x, y}
export const storeLaunchVec = (piece, mousePos, game) => {
    const piecePos = piece.position;
    let vel = calcLaunchVec({
        x: mousePos.x - piecePos.x,
        y: mousePos.y - piecePos.y,
    });
    game.pieceIdToLaunchVec.set(piece.id, vel);
};

// returns the velocity vector capped to the maximum launch speed
// These values will need to be sent to other players, so make them integers for ease of sending
export const calcLaunchVec = (vel) => {
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

export const launch = (game) => {
    destroySensors(game);
    destroyArrows(game);

    // stop runner so that all piece velocity vectors can be set.
    game.runner.enabled = false;
    for (var [id, launchVec] of game.pieceIdToLaunchVec.entries()) {
        launchVec.x *= LAUNCH_MULT;
        launchVec.y *= LAUNCH_MULT;
        Body.setVelocity(game.pieceOfId(id), launchVec);
    }
    // launch pieces simultaneously
    game.runner.enabled = true;

    game.pieceIdToLaunchVec = new Map();
    simulate(game);
};

export const sendLaunchVecs = (game) => {
    // Transform the launch vec map into an array because it is compatible with the server.
    const launchVecArr = serLaunchVec(game.pieceIdToLaunchVec);
    game.channel.push("sendLaunchVecs", { body: launchVecArr });
};

const simulate = (game) => {
    setTimeout(function () {
        outOfBoundsCheck(game);
        createSensors(game);
        console.log("sensors created");
    }, 5000);
};

const outOfBoundsCheck = (game) => {
    for (const [id, piece] of game.idToPiece) {
        if (outOfBounds(piece)) {
            // remove the piece id in the player or opponent data
            if (game.opponentPieceIds.has(id)) {
                game.opponentPieceIds.delete(id);
            } else {
                game.playerPieceIds.delete(id);
            }
            destroy(game, piece);
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
