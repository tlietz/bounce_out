import Matter from "matter-js";

const BORDER_W = 60;
const SCREEN_W = 800;
const SCREEN_H = 600;

const PIECE_R = 30;

// determines the launch strength
const LAUNCH_MULT = 0.07;

const MAX_LAUNCH_VEL = 15;

// The value of the collision category and collision mask of player's mouse.
const P1 = 0x0002;

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

// create the game state
var gameState = {
    selectedPiece: null,
    playerPieces: [],
    // stores the launch velocities for each of the pieces.
    pieceToLaunchVec: new Map(),
    // holds sensors to the pieces they correspond to
    sensorToPiece: new Map(),
};

var engine = Engine.create(),
    world = engine.world;
engine.gravity.y = 0;

export function startGame() {
    // create an engine with no gravity

    // create a renderer
    var render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: SCREEN_W,
            height: SCREEN_H,
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
        gameState.selectedPiece =
            gameState.sensorToPiece.get(sensor);
    });

    Events.on(mouseConstraint, "mousemove", () => {
        const { selectedPiece } = gameState;
        if (selectedPiece) {
            renderArrow(
                selectedPiece.position,
                mouseConstraint.mouse.position,
            );
        }
    });

    Events.on(mouseConstraint, "mouseup", () => {
        const { selectedPiece } = gameState;
        if (selectedPiece) {
            storeLaunchVec(
                selectedPiece,
                mouseConstraint.mouse.position,
            );
        }
        gameState.selectedPiece = null;
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
    ] of gameState.pieceToLaunchVec.entries()) {
        Body.setVelocity(piece, launchVec);
    }
    gameState.pieceToLaunchVec = new Map();
};

const destroySensors = () => {
    for (const [
        sensor,
        _piece, // eslint-disable-line no-unused-vars
    ] of gameState.sensorToPiece.entries()) {
        Composite.remove(world, sensor);
    }

    // prepare the game state to receive the sensors in the next round
    gameState.sensorToPiece = new Map();
};

const createSensors = () => {
    for (const piece of gameState.playerPieces) {
        const sensor = createSensor(piece, P1);
        gameState.sensorToPiece.set(sensor, piece);
    }
};

// piece is a `body`
// `end` is of the form {x, y}
const storeLaunchVec = (piece, end) => {
    const start = piece.position;
    let velX = (end.x - start.x) * LAUNCH_MULT;
    if (velX > MAX_LAUNCH_VEL) {
        velX = MAX_LAUNCH_VEL;
    } else if (velX < -MAX_LAUNCH_VEL) {
        velX = -MAX_LAUNCH_VEL;
    }
    let velY = (end.y - start.y) * LAUNCH_MULT;
    if (velY > MAX_LAUNCH_VEL) {
        velY = MAX_LAUNCH_VEL;
    } else if (velY < -MAX_LAUNCH_VEL) {
        velY = -MAX_LAUNCH_VEL;
    }

    gameState.pieceToLaunchVec.set(piece, { x: velX, y: velY });

    console.log(`Will launch with velocity: ${velX}, ${velY}`);
};

// The starting and ending position of the arrow of the form: {x, y}
const renderArrow = (start, end) => {
    console.log(
        `Arrow start: ${start.x}, ${start.y} end: ${end.x}, ${end.y}`,
    );
};

const createPlayerPieces = () => {
    const playerPieces = [
        createPiece(SCREEN_W / 4, SCREEN_H / 4),
        createPiece(SCREEN_W / 4, (SCREEN_H * 3) / 4),
    ];
    gameState.playerPieces = playerPieces;
};

const createOpponentPieces = () => {
    createPiece((SCREEN_W * 3) / 4, SCREEN_H / 4);
    createPiece((SCREEN_W * 3) / 4, (SCREEN_H * 3) / 4);
};

const createBorder = () => {
    const border = [
        // bottom
        Bodies.rectangle(
            SCREEN_W / 2,
            SCREEN_H,
            SCREEN_W,
            BORDER_W,
            {
                isStatic: true,
            },
        ),
        // top
        Bodies.rectangle(SCREEN_W / 2, 0, SCREEN_W, BORDER_W, {
            isStatic: true,
        }),
        // left
        Bodies.rectangle(0, SCREEN_H / 2, BORDER_W, SCREEN_H, {
            isStatic: true,
        }),
        // right
        Bodies.rectangle(
            SCREEN_W,
            SCREEN_H / 2,
            BORDER_W,
            SCREEN_H,
            {
                isStatic: true,
            },
        ),
    ];

    Composite.add(world, border);
};

const createBodies = function () {
    createPlayerPieces();
    createSensors();
    createOpponentPieces();
    createBorder();
};

const createPiece = function (x, y) {
    const piece = Bodies.circle(x, y, PIECE_R, {
        restitution: 1,
        friction: 0,
        frictionAir: 0.03,
        frictionStatic: 0,
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
    });

    // link the sensor to its corresponding piece
    gameState.sensorToPiece.set(sensor, piece);

    Composite.add(world, sensor);

    return sensor;
};
