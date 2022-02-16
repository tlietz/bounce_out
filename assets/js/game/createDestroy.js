/*
    Functions that create or destroy bodies.
*/

import Matter from "matter-js";
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

import { PIECE_R, P_MASK } from "./constants";

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

    Composite.add(game.world, sensor);

    return sensor;
};

export const createArrow = (mousePos, world) => {
    const arrow = Bodies.rectangle(mousePos.x, mousePos.y, 10, 10, {
        isSensor: true,
        render: {
            fillStyle: "red",
        },
    });

    Composite.add(world, arrow);

    return arrow;
};

export const destroyArrows = (game, world) => {
    for (const [
        _id, // eslint-disable-line no-unused-vars
        arrow,
    ] of game.pieceIdToArrow.entries()) {
        Composite.remove(world, arrow);
    }

    // prepare the game state to receive the sensors in the next round
    game.pieceIdToArrow = new Map();
};
