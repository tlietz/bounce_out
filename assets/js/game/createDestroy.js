/*
    Functions that create or destroy bodies.
*/

import Matter from "matter-js";
// module aliases
var Composite = Matter.Composite,
    Bodies = Matter.Bodies;

import { PIECE_R, P_MASK, P_COLORS } from "./constants";

export const createPiece = function (game, location, playerId) {
    const piece = Bodies.circle(location.x, location.y, PIECE_R, {
        restitution: 0.5,
        friction: 0,
        frictionAir: 0.03,
        frictionStatic: 0,
        render: {
            fillStyle: P_COLORS[playerId - 1],
        },
    });
    add(game, piece);
    return piece;
};

// Depends on pieces being assigned to their respective players first.
export const createSensors = (game) => {
    for (const id of game.playerPieceIds) {
        const sensor = createSensor(
            game.pieceOfId(id),
            P_MASK,
            game,
        );
        game.sensorToPieceId.set(sensor, id);
    }
};

const createSensor = function (piece, player, game) {
    const position = piece.position;
    const sensor = Bodies.circle(position.x, position.y, PIECE_R, {
        isSensor: true,
        isStatic: true,
        collisionFilter: {
            category: player,
            mask: player,
        },
        render: {
            opacity: 0,
        },
    });

    // link the sensor to the id of its corresponding piece
    game.sensorToPieceId.set(sensor, piece.id);

    add(game, sensor);

    return sensor;
};

export const destroySensors = (game) => {
    for (const [
        sensor,
        _id, // eslint-disable-line no-unused-vars
    ] of game.sensorToPieceId.entries()) {
        destroy(game, sensor);
    }

    // prepare the game state to receive the sensors in the next round
    game.sensorToPieceId = new Map();
};

export const createArrow = (game, mousePos) => {
    const arrow = Bodies.rectangle(mousePos.x, mousePos.y, 10, 10, {
        isSensor: true,
        render: {
            fillStyle: "red",
        },
    });

    add(game, arrow);

    return arrow;
};

export const destroyArrows = (game) => {
    for (const [
        _id, // eslint-disable-line no-unused-vars
        arrow,
    ] of game.pieceIdToArrow.entries()) {
        destroy(game, arrow);
    }

    // prepare the game state to receive the sensors in the next round
    game.pieceIdToArrow = new Map();
};

export const destroy = (game, piece) => {
    Composite.remove(game.world, piece);
};

const add = (game, piece) => {
    Composite.add(game.world, piece);
};
