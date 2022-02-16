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

import {
    PIECE_R,
    P_MASK,
    SCREEN_H,
    SCREEN_W,
    P_COLORS,
} from "./constants";

export const createPieces = (game) => {
    const pieces = [
        createPiece(SCREEN_W / 4, SCREEN_H / 4, game.world, {
            fillStyle: P_COLORS[0],
        }),
        createPiece(SCREEN_W / 4, (SCREEN_H * 3) / 4, game.world, {
            fillStyle: P_COLORS[0],
        }),
        createPiece(SCREEN_W / 8, SCREEN_H / 2, game.world, {
            fillStyle: P_COLORS[0],
        }),
        createPiece((SCREEN_W * 3) / 4, SCREEN_H / 4, game.world, {
            fillStyle: P_COLORS[1],
        }),
        createPiece(
            (SCREEN_W * 3) / 4,
            (SCREEN_H * 3) / 4,
            game.world,
            {
                fillStyle: P_COLORS[1],
            },
        ),
        createPiece((SCREEN_W * 7) / 8, SCREEN_H / 2, game.world, {
            fillStyle: P_COLORS[1],
        }),
    ];

    for (const piece of pieces) {
        game.idToPiece.set(piece.id, piece);
    }
};

const createPiece = function (x, y, world, render = {}) {
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
