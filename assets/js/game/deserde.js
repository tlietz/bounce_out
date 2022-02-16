import { PACKET_LENGTH } from "./constants";

// Deserializes the array and adds the results to the map
export const desArrAddToMap = (map, arr) => {
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
export const serLaunchVec = (pieceIdToLaunchVec) => {
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
