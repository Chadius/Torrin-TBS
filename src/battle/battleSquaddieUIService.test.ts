import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {MissionMap} from "../missionMap/missionMap";
import {calculateNewBattleSquaddieUISelectionState} from "./battleSquaddieUIService";
import {BattleSquaddieUISelectionState} from "./battleSquaddieUIInput";
import {SquaddieID} from "../squaddie/id";
import {NullSquaddieResource} from "../squaddie/resource";
import {NullTraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../squaddie/turn";
import {SquaddieMovement} from "../squaddie/movement";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";

describe('BattleSquaddieUIService', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let playerStaticSquaddie: BattleSquaddieStatic;
    let playerDynamicSquaddie: BattleSquaddieDynamic;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        playerStaticSquaddie = {
            squaddieID: new SquaddieID({
                name: "torrin",
                id: "torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER
            }),
            movement: new SquaddieMovement({
                movementPerAction: 1,
                traits: NullTraitStatusStorage(),
            }),
            activities: [],
        };
        squaddieRepository.addStaticSquaddie(
            playerStaticSquaddie
        );

        playerDynamicSquaddie = {
            staticSquaddieId: "torrin",
            mapLocation: {q: 0, r: 0},
            squaddieTurn: new SquaddieTurn(),
        };
        squaddieRepository.addDynamicSquaddie("torrin_0", playerDynamicSquaddie);
    });

    const createMissionMap: (movementCost: string[]) => MissionMap = (movementCost: string[]) => {
        const terrainTileMap: TerrainTileMap = new TerrainTileMap({movementCost});
        const missionMap: MissionMap = new MissionMap({terrainTileMap})
        return missionMap
    }

    it('should start in NO_SQUADDIE_SELECTED mode', () => {
        const missionMap = createMissionMap(["1 1 "]);

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    selectionState: BattleSquaddieUISelectionState.UNKNOWN,
                    missionMap,
                    squaddieRepository,
                }
            )
        ).toBe(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
    });

    it('should switch to SELECTED_SQUADDIE mode when clicked on', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie(
            new SquaddieID({
                name: "torrin",
                id: "torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER
            }),
            {q: 0, r: 0}
        )

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: {q: 0, r: 0},
                    selectionState: BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED,
                    missionMap,
                    squaddieRepository,
                }
            )
        ).toBe(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
    });

    it('should change to NO_SQUADDIE_SELECTED when an uncontrollable squaddie is selected and you click on the map', () => {
        const missionMap = createMissionMap(["1 1 "]);

        const enemySquaddieStatic: BattleSquaddieStatic = {
            activities: [],
            movement: new SquaddieMovement({
                movementPerAction: 1,
                traits: NullTraitStatusStorage()
            }),
            squaddieID: new SquaddieID({
                name: "enemy",
                id: "enemy",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.ENEMY
            })
        }
        squaddieRepository.addStaticSquaddie(enemySquaddieStatic);
        const enemySquaddieDynamic: BattleSquaddieDynamic = {
            staticSquaddieId: "enemy",
            mapLocation: {q: 0, r: 0},
            squaddieTurn: new SquaddieTurn(),
        }
        squaddieRepository.addDynamicSquaddie("enemy_0", enemySquaddieDynamic)

        missionMap.addSquaddie(
            enemySquaddieStatic.squaddieID,
            {q: 0, r: 0}
        )

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: {q: 0, r: 1},
                    selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                    missionMap,
                    selectedSquaddieDynamicID: "enemy_0",
                    squaddieRepository,
                }
            )
        ).toBe(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
    });

    it('should stay on SELECTED_SQUADDIE if you clicked on another squaddie', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie(
            new SquaddieID({
                name: "torrin",
                id: "torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER
            }),
            {q: 0, r: 0}
        )

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: {q: 0, r: 0},
                    selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                    missionMap,
                    squaddieRepository,
                }
            )
        ).toBe(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
    });

    it('should change to MOVING_SQUADDIE when a controllable squaddie is selected and you click on the map', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie(
            new SquaddieID({
                name: "torrin",
                id: "torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            {q: 0, r: 0}
        )

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: {q: 0, r: 1},
                    selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                    missionMap,
                    selectedSquaddieDynamicID: "torrin_0",
                    squaddieRepository,
                }
            )
        ).toBe(BattleSquaddieUISelectionState.MOVING_SQUADDIE);
    });

    it('should change to NO_SQUADDIE_SELECTED when the moving squaddie has finished', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie(
            new SquaddieID({
                name: "torrin",
                id: "torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            {q: 0, r: 0}
        )

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: {q: 0, r: 1},
                    selectionState: BattleSquaddieUISelectionState.MOVING_SQUADDIE,
                    missionMap,
                    selectedSquaddieDynamicID: "torrin_0",
                    squaddieRepository,
                    finishedAnimating: true,
                }
            )
        ).toBe(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
    });

    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
    // it('should ', () => {});
});