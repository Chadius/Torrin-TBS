import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {convertMapCoordinatesToScreenCoordinates,} from "../../hexMap/convertCoordinates";
import {GetSquaddieAtMapLocation, GetSquaddieAtScreenLocation} from "./orchestratorUtils";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe("GetSquaddieAtScreenLocation and GetSquaddieAtMapLocation", () => {
    let knightSquaddieStatic: SquaddieTemplate;
    let knightSquaddieDynamic: BattleSquaddie;
    let squaddieRepository: BattleSquaddieRepository;
    let map: MissionMap;
    let camera: BattleCamera;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();

        ({
            squaddieTemplate: knightSquaddieStatic,
            battleSquaddie: knightSquaddieDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            name: "knight",
            templateId: "knight_static",
            battleId: "knight_dynamic",
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
            knightSquaddieStatic.templateId,
            knightSquaddieDynamic.battleSquaddieId,
            {q: 0, r: 2}
        );

        camera = new BattleCamera();
    });

    it('can return the squaddie and information at a given location on the screen', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 2, ...camera.getCoordinates());

        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toStrictEqual(knightSquaddieStatic);
        expect(battleSquaddie).toStrictEqual(knightSquaddieDynamic);
        expect(squaddieMapLocation).toStrictEqual({q: 0, r: 2});
    });

    it('can return the squaddie and information at a given map location', () => {
        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtMapLocation({
            mapLocation: {q: 0, r: 2},
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toStrictEqual(knightSquaddieStatic);
        expect(battleSquaddie).toStrictEqual(knightSquaddieDynamic);
        expect(squaddieMapLocation).toStrictEqual({q: 0, r: 2});
    });

    it('returns undefined information if there is no squaddie at the location', () => {
        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 0, ...camera.getCoordinates());

        const {
            squaddieTemplate,
            battleSquaddie,
            squaddieMapLocation,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera,
            map,
            squaddieRepository,
        });

        expect(squaddieTemplate).toBeUndefined();
        expect(battleSquaddie).toBeUndefined();
        expect(squaddieMapLocation).toBeUndefined();
    });

    it('throws an error if squaddie repository does not have squaddie', () => {
        map.addSquaddie("static does not exist", "dynamic does not exist",
            {q: 0, r: 0}
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
