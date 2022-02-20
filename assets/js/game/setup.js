/*
    Code that helps with initialization
*/

import Matter from "matter-js";
var Composite = Matter.Composite,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Body = Matter.Body,
    Events = Matter.Events;

import {
    P_MASK,
    PLAYER_PIECES,
    PIECES_DEFAULT_INFO,
} from "./constants.js";

import { desArrAddToMap } from "./deserde.js";

import {
    createArrow,
    createSensors,
    createPiece,
} from "./createDestroy.js";

import {
    launch,
    storeLaunchVec,
    sendLaunchVecs,
    calcLaunchVec,
} from "./launch.js";

export const initChannel = (game) => {
    game.channel.on("launchVecs", (payload) => {
        desArrAddToMap(game.pieceIdToLaunchVec, payload.body);
        launch(game);
    });

    game.channel.on("sendLaunchVecs", () => {
        sendLaunchVecs(game);
    });
};

export const initMouse = (game) => {
    // add mouse control
    var mouse = Mouse.create(game.render.canvas),
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
                        game,
                        mouseConstraint.mouse.position,
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
                game,
            );
        }
        game.selectedPieceId = 0;
    });

    Composite.add(game.world, mouseConstraint);
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

export const initPieces = function (game, playerId, players) {
    createPieces(game);
    assignPieces(game, playerId, players);
    createSensors(game);
};

const assignPieces = function (game, playerId, players) {
    let pieceIds = allPieceIdArr(players);
    game.playerPieceIds = setPlayerPieces(playerId, pieceIds);
    console.log(game.playerPieceIds);
    game.opponentPieceIds = new Set(pieceIds);
};

// allPieceIdArr makes an array starting at 0 incrementing until the total number of pieces
const allPieceIdArr = (players) => {
    return Array.from(
        { length: players * PLAYER_PIECES },
        (_, idx) => ++idx,
    );
};

const setPlayerPieces = (playerId, allPieceIdArr) => {
    return new Set(
        allPieceIdArr.splice(
            PLAYER_PIECES * (playerId - 1),
            PLAYER_PIECES,
        ),
    );
};

// `piecesInfo` is an object with the following fields:
export const createPieces = (
    game,
    piecesInfo = PIECES_DEFAULT_INFO,
) => {
    for (const pieceInfo of piecesInfo) {
        const piece = createPiece(
            game,
            pieceInfo.location,
            pieceInfo.playerId,
        );
        game.idToPiece.set(piece.id, piece);
    }
};
