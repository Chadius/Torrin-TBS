import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionMap} from "../../missionMap/missionMap";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {BattleCamera} from "../battleCamera";
import {convertMapCoordinatesToScreenCoordinates,} from "../../hexMap/convertCoordinates";
import {GetSquaddieAtMapLocation, GetSquaddieAtScreenLocation} from "./orchestratorUtils";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";

describe("GetSquaddieAtScreenLocation and GetSquaddieAtMapLocation", () => {
    let knightSquaddieStatic: BattleSquaddieStatic;
    let knightSquaddieDynamic: BattleSquaddieDynamic;
    let squaddieRepository: BattleSquaddieRepository;
    let map: MissionMap;
    let camera: BattleCamera;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();

        ({
            staticSquaddie: knightSquaddieStatic,
            dynamicSquaddie: knightSquaddieDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "knight",
            staticId: "knight_static",
            dynamicId: "knight_dynamic",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository,
        }));

        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 1 "
                ]
            })
        });
        map.addSquaddie(
            knightSquaddieStatic.staticId,
            knightSquaddieDynamic.dynamicSquaddieId,
            new HexCoordinate({q: 0, r: 2})
        );

        camera = new BattleCamera();
    });

    it('can return the squaddie and information at a given location on the screen', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates());

        const {
            staticSquaddie,
            dynamicSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(staticSquaddie).toStrictEqual(knightSquaddieStatic);
        expect(dynamicSquaddie).toStrictEqual(knightSquaddieDynamic);
        expect(squaddieMapLocation).toStrictEqual(new HexCoordinate({q: 0, r: 2}));
    });

    it('can return the squaddie and information at a given map location', () => {
        const {
            staticSquaddie,
            dynamicSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtMapLocation({
            mapLocation: new HexCoordinate({q: 0, r: 2}),
            map,
            squaddieRepository,
        });

        expect(staticSquaddie).toStrictEqual(knightSquaddieStatic);
        expect(dynamicSquaddie).toStrictEqual(knightSquaddieDynamic);
        expect(squaddieMapLocation).toStrictEqual(new HexCoordinate({q: 0, r: 2}));
    });

    it('returns undefined information if there is no squaddie at the location', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());

        const {
            staticSquaddie,
            dynamicSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(staticSquaddie).toBeUndefined();
        expect(dynamicSquaddie).toBeUndefined();
        expect(squaddieMapLocation).toBeUndefined();
    });

    it('throws an error if squaddie repository does not have squaddie', () => {
        map.addSquaddie("static does not exist", "dynamic does not exist",
            new HexCoordinate({q: 0, r: 0})
        );
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());

        const shouldThrowError = () => {
            GetSquaddieAtScreenLocation({
                mouseX,
                mouseY,
                camera,
                map,
                squaddieRepository,
            });
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
    });
});
