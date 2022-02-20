export const SCREEN_W = 800;
export const SCREEN_H = 600;

export const PIECE_R = 30;

// determines the launch strength
export const LAUNCH_MULT = 0.075;

// maximum magnitude of the launch velocity vector squared
export const MAX_LAUNCH = 150;
export const MAX_LAUNCH_SQUARED = MAX_LAUNCH * MAX_LAUNCH;

// The value of the collision category and collision mask of player's mouse.
export const P_MASK = 0x0002;

// The length of each grouping sent to server
export const PACKET_LENGTH = 3;

export const PLAYER_PIECES = 3;

const P1_COLOR = "green";
const P2_COLOR = "purple";

export const P_COLORS = [P1_COLOR, P2_COLOR];

export const PIECES_DEFAULT_INFO = [
    { location: { x: SCREEN_W / 4, y: SCREEN_H / 4 }, playerId: 1 },
    {
        location: { x: SCREEN_W / 4, y: (SCREEN_H * 3) / 4 },
        playerId: 1,
    },
    { location: { x: SCREEN_W / 8, y: SCREEN_H / 2 }, playerId: 1 },
    {
        location: { x: (SCREEN_W * 3) / 4, y: SCREEN_H / 4 },
        playerId: 2,
    },
    {
        location: { x: (SCREEN_W * 3) / 4, y: (SCREEN_H * 3) / 4 },
        playerId: 2,
    },
    {
        location: { x: (SCREEN_W * 7) / 8, y: SCREEN_H / 2 },
        playerId: 2,
    },
];
