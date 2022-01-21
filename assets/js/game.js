import Matter from "matter-js";

export function startGame() {
    // module aliases
    var Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Composite = Matter.Composite;

    // create an engine
    var engine = Engine.create();
    engine.gravity.y = 0;

    // create a renderer
    var render = Render.create({
        element: document.body,
        engine: engine,
    });

    const pieces = [
        Bodies.circle(400, 200, 30),
        Bodies.circle(450, 90, 30),
    ];

    const border = [
        // bottom
        Bodies.rectangle(400, 600, 800, 60, {
            isStatic: true,
        }),
        // top
        Bodies.rectangle(400, 0, 800, 60, {
            isStatic: true,
        }),
        // left
        Bodies.rectangle(0, 300, 60, 600, {
            isStatic: true,
        }),
        // right
        Bodies.rectangle(800, 300, 60, 600, {
            isStatic: true,
        }),
    ];

    // add all of the bodies to the world
    Composite.add(engine.world, [...pieces, ...border]);

    // run the renderer
    Render.run(render);

    // create runner
    var runner = Runner.create();

    // run the engine
    Runner.run(runner, engine);
}
