import Matter from "matter-js";

const BORDER_W = 60;
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

const P1_COLOR = "green";
const P2_COLOR = "purple";
const BORDER_COLOR = "#444444";

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

// create the Game state
var Game = {
    selectedPiece: null,
    playerPieces: [],
    // stores the launch velocities for each of the pieces.
    pieceToLaunchVec: new Map(),
    // holds sensors to the pieces they correspond to
    sensorToPiece: new Map(),
};

// create an engine with no gravity
var engine = Engine.create(),
    world = engine.world;
engine.gravity.y = 0;

export function startGame() {
    // create a renderer
    var render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: SCREEN_W,
            height: SCREEN_H,
            wireframes: false,
        },
    });

    // run the renderer
    Render.run(render);

    // create runner
    var runner = Runner.create();

    // run the engine
    Runner.run(runner, engine);

    // add all of the bodies to the world
    createBodies();

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
    // then launch the piece corresponding to where the mouse was released.
    Events.on(mouseConstraint, "mousedown", () => {
        const sensor = mouseConstraint.body;
        Game.selectedPiece = Game.sensorToPiece.get(sensor);
    });

    Events.on(mouseConstraint, "mousemove", () => {
        const { selectedPiece } = Game;
        if (selectedPiece) {
            renderArrow(
                selectedPiece.position,
                mouseConstraint.mouse.position,
            );
        }
    });

    Events.on(mouseConstraint, "mouseup", () => {
        const { selectedPiece } = Game;
        if (selectedPiece) {
            storeLaunchVec(
                selectedPiece,
                mouseConstraint.mouse.position,
            );
        }
        Game.selectedPiece = null;
    });

    Composite.add(world, mouseConstraint);

    document.body.onkeyup = function (e) {
        if (e.key == " ") {
            launch();
        }
    };
}

const launch = () => {
    destroySensors();
    for (const [
        piece,
        launchVec,
    ] of Game.pieceToLaunchVec.entries()) {
        Body.setVelocity(piece, launchVec);
    }
    Game.pieceToLaunchVec = new Map();
};

const destroySensors = () => {
    for (const [
        sensor,
        _piece, // eslint-disable-line no-unused-vars
    ] of Game.sensorToPiece.entries()) {
        Composite.remove(world, sensor);
    }

    // prepare the Game state to receive the sensors in the next round
    Game.sensorToPiece = new Map();
};

const createSensors = () => {
    for (const piece of Game.playerPieces) {
        const sensor = createSensor(piece, P1);
        Game.sensorToPiece.set(sensor, piece);
    }
};

// piece is a `body`
// `end` is of the form {x, y}
const storeLaunchVec = (piece, end) => {
    const start = piece.position;

    let velX = end.x - start.x;
    let velY = end.y - start.y;

    Game.pieceToLaunchVec.set(
        piece,
        checkLaunch({ x: velX, y: velY }),
    );
};

// returns the velocity vector capped to the maximum launch speed
const checkLaunch = (vel) => {
    console.log(`${vel.x} and ${vel.y}`);
    const velXsq = vel.x * vel.x;
    const velYsq = vel.y * vel.y;
    if (velXsq + velYsq > MAX_LAUNCH_SQUARED) {
        const normalize = Math.sqrt(velXsq + velYsq);
        vel.x = (MAX_LAUNCH * vel.x) / normalize;
        vel.y = (MAX_LAUNCH * vel.y) / normalize;
    }
    vel.x *= LAUNCH_MULT;
    vel.y *= LAUNCH_MULT;
    return vel;
};

// The starting and ending position of the arrow of the form: {x, y}
const renderArrow = (start, end) => {
    console.log(
        `Arrow start: ${start.x}, ${start.y} end: ${end.x}, ${end.y}`,
    );
};

const createPlayerPieces = () => {
    const playerPieces = [
        createPiece(SCREEN_W / 4, SCREEN_H / 4, {
            fillStyle: P1_COLOR,
        }),
        createPiece(SCREEN_W / 4, (SCREEN_H * 3) / 4, {
            fillStyle: P1_COLOR,
        }),
    ];
    Game.playerPieces = playerPieces;
};

const createOpponentPieces = () => {
    createPiece((SCREEN_W * 3) / 4, SCREEN_H / 4, {
        fillStyle: P2_COLOR,
    });
    createPiece((SCREEN_W * 3) / 4, (SCREEN_H * 3) / 4, {
        fillStyle: P2_COLOR,
    });
};

const createBorder = () => {
    const border = [
        // bottom
        borderPiece(SCREEN_W / 2, SCREEN_H, SCREEN_W, BORDER_W, {
            isStatic: true,
            isSensor: true,
            render: {
                fillStyle: BORDER_COLOR,
            },
        }),
        // top
        borderPiece(SCREEN_W / 2, 0, SCREEN_W, BORDER_W, {
            isStatic: true,
            isSensor: true,
        }),
        // left
        borderPiece(0, SCREEN_H / 2, BORDER_W, SCREEN_H, {
            isStatic: true,
            isSensor: true,
        }),
        // right
        borderPiece(SCREEN_W, SCREEN_H / 2, BORDER_W, SCREEN_H, {
            isStatic: true,
            isSensor: true,
        }),
    ];

    Composite.add(world, border);
};

const borderPiece = (x, y, w, h) => {
    return Bodies.rectangle(x, y, w, h, {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: BORDER_COLOR,
        },
    });
};

const createBodies = function () {
    createPlayerPieces();
    createSensors();
    createOpponentPieces();
    createBorder();
};

// creates a piece at the location (x, y) and with the render applied
const createPiece = function (x, y, render = {}) {
    const piece = Bodies.circle(x, y, PIECE_R, {
        restitution: 0.8,
        friction: 0,
        frictionAir: 0.03,
        frictionStatic: 0,
        render: render,
    });
    Composite.add(world, piece);
    return piece;
};

// Creates a sensor, and adds it to the Composite with the same size and location as the `piece`
// The sensor will have have its collision filter group and category set to the `player`
// The sensor created is returned
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

    // link the sensor to its corresponding piece
    Game.sensorToPiece.set(sensor, piece);

    Composite.add(world, sensor);

    return sensor;
};
