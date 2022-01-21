import Matter from "matter-js";

const BORDER_W = 60;
const SCREEN_W = 800;
const SCREEN_H = 600;

const PIECE_R = 30;

// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Composite = Matter.Composite,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Bodies = Matter.Bodies;

export function startGame() {
    // create an engine
    var engine = Engine.create();
    engine.gravity.y = 0;

    // create a renderer
    var render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: SCREEN_W,
            height: SCREEN_H,
        },
    });

    const bodies = createBodies();

    // add all of the bodies to the world
    Composite.add(engine.world, [...bodies]);

    // run the renderer
    Render.run(render);

    // create runner
    var runner = Runner.create();

    // run the engine
    Runner.run(runner, engine);
}

const createBodies = function () {
    const pieces = [
        Bodies.circle(400, 200, PIECE_R),
        Bodies.circle(450, 90, PIECE_R),
    ];

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

    return [...pieces, ...border];
};
