import Matter from "matter-js";

import { channel } from "./user_socket.js";

const SCREEN_W = 800;
const SCREEN_H = 600;

const PIECE_R = 30;

// determines the launch strength
const LAUNCH_MULT = 0.075;
// maximum magnitude of the launch velocity vector squared
const MAX_LAUNCH = 150;
const MAX_LAUNCH_SQUARED = MAX_LAUNCH * MAX_LAUNCH;

// The value of the collision category and collision mask of player's mouse.
const P1 = 0x0002;

// The length of each grouping sent to server
const PACKET_LENGTH = 3;

const P1_COLOR = "green";
const P2_COLOR = "purple";

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

// TODO: add some visual feedback for the launch vectors.

// TODO: Have all pieces launch in the same frame, instead of having a for loop do that

// TODO: refactor into an ECS where all pieces are held in one array, then the opponent and player pieces will be tracked through an index to the piece array.
// TODO: make the piece into a class or object to implement the ECS system.

// create the Game state
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
    // add all of the bodies to the world
    createBodies();

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
                category: P1,
                mask: P1,
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
                    createArrow(mouseConstraint.mouse.position),
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
        console.log(payload.body);
        launch();
    });

    document.body.onkeyup = function (e) {
        if (e.key == " ") {
            sendLaunchVecs();
            launch();
        }
    };
}

const createArrow = (mousePos) => {
    const arrow = Bodies.rectangle(mousePos.x, mousePos.y, 10, 10, {
        isSensor: true,
        render: {
            fillStyle: "red",
        },
    });

    Composite.add(world, arrow);

    return arrow;
};

// returns the piece corresponding to the `id` parameter
const pieceOfId = (id) => {
    return Game.idToPiece.get(id);
};

const launch = () => {
    destroySensors();

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

// Deserializes the array and adds the results to the map
const desArrAddToMap = (map, arr) => {
    for (let i = 0; i < arr.length; i += PACKET_LENGTH) {
        const pieceId = arr[i];
        const launchVec = { x: arr[i + 1], y: arr[i + 2] };
        map.set(pieceId, launchVec);
    }
};

// Returns the serialized form of the launch vector map.
// The serialized form consists of an array with the following elements:
// [pieceId_1, x1, y1, pieceId_2, x2, y2, ...]
// where `x` is the x component and `y` is the y component of the launch vector of
// of the corresponding piece.
const serLaunchVec = (pieceIdToLaunchVec) => {
    // make an array with enough room to serialize the launch vector map.
    let launchVecArr = Array(
        PACKET_LENGTH * pieceIdToLaunchVec.size,
    );

    let i = 0;
    for (const [id, launchVec] of pieceIdToLaunchVec) {
        launchVecArr[i] = id;
        i++;
        launchVecArr[i] = launchVec.x;
        i++;
        launchVecArr[i] = launchVec.y;
        i++;
    }
    return launchVecArr;
};

const sendLaunchVecs = () => {
    // Transform the launch vec map into an array because it is compatible with the server.
    const launchVecArr = serLaunchVec(Game.pieceIdToLaunchVec);
    channel.push("launchVecs", { body: launchVecArr });
};

const simulate = () => {
    setTimeout(function () {
        outOfBoundsCheck();
        createSensors();
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

const createSensors = () => {
    for (const id of Game.playerPieceIds) {
        const sensor = createSensor(pieceOfId(id), P1);
        Game.sensorToPieceId.set(sensor, id);
    }
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
            fillStyle: P1_COLOR,
        }),
        createPiece(SCREEN_W / 4, (SCREEN_H * 3) / 4, {
            fillStyle: P1_COLOR,
        }),
        createPiece(SCREEN_W / 8, SCREEN_H / 2, {
            fillStyle: P1_COLOR,
        }),
        createPiece((SCREEN_W * 3) / 4, SCREEN_H / 4, {
            fillStyle: P2_COLOR,
        }),
        createPiece((SCREEN_W * 3) / 4, (SCREEN_H * 3) / 4, {
            fillStyle: P2_COLOR,
        }),
        createPiece((SCREEN_W * 7) / 8, SCREEN_H / 2, {
            fillStyle: P2_COLOR,
        }),
    ];

    for (const piece of pieces) {
        Game.idToPiece.set(piece.id, piece);
    }
};

const assignPieces = function () {
    Game.playerPieceIds = new Set([1, 2, 3]);
    Game.opponentPieceIds = new Set([4, 5, 6]);
};

const createBodies = function () {
    createPieces();
    assignPieces();
    createSensors();
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

const createSensor = function (piece, player) {
    const position = piece.position;
    const sensor = Bodies.circle(position.x, position.y, PIECE_R, {
        isSensor: true,
        isStatic: true,
        collisionFilter: {
            category: player,
            mask: player,
        },
        render: {
            fillStyle: P1_COLOR,
        },
    });

    // link the sensor to the id of its corresponding piece
    Game.sensorToPieceId.set(sensor, piece.id);

    Composite.add(world, sensor);

    return sensor;
};
