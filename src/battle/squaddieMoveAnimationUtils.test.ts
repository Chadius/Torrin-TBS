import {getSquaddiePositionAlongPath, lerpSquaddieBetweenPath} from "./squaddieMoveAnimationUtils";
import {Integer} from "../hexMap/hexGrid";
import {HEX_TILE_WIDTH} from "../graphicsConstants";
import {TileFoundDescription} from "../hexMap/pathfinder/tileFoundDescription";
import {BattleCamera} from "./battleCamera";
import {convertMapCoordinatesToScreenCoordinates} from "../hexMap/convertCoordinates";
import {ScreenDimensions} from "../utils/graphicsConfig";

describe('lerpSquaddieBetweenPath', () => {
    it('lerp between two points on a map', () => {
        const movementPathInfo: TileFoundDescription[] = [
            {
                q: 0 as Integer,
                r: 0 as Integer,
                movementCost: 0,
            },
            {
                q: 0 as Integer,
                r: 1 as Integer,
                movementCost: 0,
            }
        ]

        const startLocation = lerpSquaddieBetweenPath(
            movementPathInfo,
            0,
            1000,
            0,
            0,
        )
        expect(startLocation).toStrictEqual([ScreenDimensions.SCREEN_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT / 2]);

        const midLocation = lerpSquaddieBetweenPath(
            movementPathInfo,
            500,
            1000,
            0,
            0,
        )
        expect(midLocation).toStrictEqual([ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH / 2, ScreenDimensions.SCREEN_HEIGHT / 2]);

        const endLocation = lerpSquaddieBetweenPath(
            movementPathInfo,
            1000,
            1000,
            0,
            0,
        )
        expect(endLocation).toStrictEqual([ScreenDimensions.SCREEN_WIDTH / 2 + HEX_TILE_WIDTH, ScreenDimensions.SCREEN_HEIGHT / 2]);
    })
})

describe('getSquaddiePositionAlongPath', () => {
    let movementPath: TileFoundDescription[];
    let camera: BattleCamera;

    beforeEach(() => {
        movementPath = [
            {
                q: 0 as Integer,
                r: 0 as Integer,
                movementCost: 0,
            },
            {
                q: 0 as Integer,
                r: 1 as Integer,
                movementCost: 1,
            },
            {
                q: 1 as Integer,
                r: 1 as Integer,
                movementCost: 2,
            }
        ];

        camera = new BattleCamera();
    });

    it('starts at the start point', () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            0,
            1000,
            camera,
        );
        expect(startLocation).toStrictEqual(
            convertMapCoordinatesToScreenCoordinates(
                movementPath[0].q,
                movementPath[0].r,
                ...camera.getCoordinates()
            )
        );
    });
    it('ends at the end point', () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            1000,
            1000,
            camera,
        );
        expect(startLocation).toStrictEqual(
            convertMapCoordinatesToScreenCoordinates(
                movementPath[0].q,
                movementPath[0].r,
                ...camera.getCoordinates()
            )
        );
    });
    it('if time is before, maps to start point', () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            -100,
            1000,
            camera,
        );
        expect(startLocation).toStrictEqual(
            convertMapCoordinatesToScreenCoordinates(
                movementPath[0].q,
                movementPath[0].r,
                ...camera.getCoordinates()
            )
        );
    });

    it('if time is after, maps to end point', () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            1100,
            1000,
            camera,
        );
        expect(startLocation).toStrictEqual(
            convertMapCoordinatesToScreenCoordinates(
                movementPath[movementPath.length - 1].q,
                movementPath[movementPath.length - 1].r,
                ...camera.getCoordinates()
            )
        );
    });

    it('maps to midway point when halfway done', () => {
        const startLocation = getSquaddiePositionAlongPath(
            movementPath,
            500,
            1000,
            camera,
        );
        const tile1Coords: [number, number] = convertMapCoordinatesToScreenCoordinates(
            movementPath[1].q,
            movementPath[1].r,
            ...camera.getCoordinates()
        );
        const tile2Coords: [number, number] = convertMapCoordinatesToScreenCoordinates(
            movementPath[2].q,
            movementPath[2].r,
            ...camera.getCoordinates()
        );

        expect(startLocation).toStrictEqual(
            [
                (tile1Coords[0] + tile2Coords[0]) / 2.0,
                (tile1Coords[1] + tile2Coords[1]) / 2.0,
            ]
        );
    });
})
