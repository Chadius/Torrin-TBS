import {TerrainTileMap} from "../hexMap/terrainTileMap";
import {MissionMap} from "../missionMap/missionMap";
import {calculateNewBattleSquaddieUISelectionState} from "./battleSquaddieUIService";
import {BattleSquaddieUISelectionState} from "./battleSquaddieUIInput";
import {SquaddieId} from "../squaddie/id";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {SquaddieInstructionInProgress} from "./history/squaddieInstructionInProgress";
import {SquaddieInstruction} from "./history/squaddieInstruction";
import {SquaddieMovementActivity} from "./history/squaddieMovementActivity";
import {TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieResource} from "../squaddie/resource";

describe('BattleSquaddieUIService', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let playerStaticSquaddie: BattleSquaddieStatic;
    let playerDynamicSquaddie: BattleSquaddieDynamic;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        playerStaticSquaddie = new BattleSquaddieStatic({
            attributes: new ArmyAttributes(),
            squaddieId: new SquaddieId({
                name: "torrin",
                staticId: "torrin",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER
            }),
            activities: [],
        });
        squaddieRepository.addStaticSquaddie(
            playerStaticSquaddie
        );

        playerDynamicSquaddie = new BattleSquaddieDynamic({
            dynamicSquaddieId: "torrin_0",
            staticSquaddieId: "torrin",
            squaddieTurn: new SquaddieTurn(),
        });
        squaddieRepository.addDynamicSquaddie(playerDynamicSquaddie);
    });

    const createMissionMap: (movementCost: string[]) => MissionMap = (movementCost: string[]) => {
        const terrainTileMap: TerrainTileMap = new TerrainTileMap({movementCost});
        return new MissionMap({terrainTileMap})
    }

    it('should start in NO_SQUADDIE_SELECTED mode', () => {
        const missionMap = createMissionMap(["1 1 "]);

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    selectionState: BattleSquaddieUISelectionState.UNKNOWN,
                    missionMap,
                    squaddieRepository,
                    squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
                }
            )
        ).toBe(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
    });

    it('should switch to SELECTED_SQUADDIE mode when clicked on', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie("torrin", "torrin_0", new HexCoordinate({q: 0, r: 0}));

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: new HexCoordinate({q: 0, r: 0}),
                    selectionState: BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED,
                    missionMap,
                    squaddieRepository,
                    squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
                }
            )
        ).toBe(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
    });

    it('should change to NO_SQUADDIE_SELECTED when an uncontrollable squaddie is selected and you click on the map', () => {
        const missionMap = createMissionMap(["1 1 "]);

        const enemySquaddieStatic: BattleSquaddieStatic = new BattleSquaddieStatic({
            attributes: new ArmyAttributes(),
            activities: [],
            squaddieId: new SquaddieId({
                name: "enemy",
                staticId: "enemy",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage(),
                affiliation: SquaddieAffiliation.ENEMY
            })
        });
        squaddieRepository.addStaticSquaddie(enemySquaddieStatic);
        const enemySquaddieDynamic: BattleSquaddieDynamic = new BattleSquaddieDynamic({
            dynamicSquaddieId: "enemy_0",
            staticSquaddieId: "enemy",
            squaddieTurn: new SquaddieTurn(),
        });
        squaddieRepository.addDynamicSquaddie(enemySquaddieDynamic)

        missionMap.addSquaddie("enemy", "enemy_0", new HexCoordinate({q: 0, r: 0}));

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: new HexCoordinate({q: 0, r: 1}),
                    selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                    missionMap,
                    selectedSquaddieDynamicID: "enemy_0",
                    squaddieRepository,
                    squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
                }
            )
        ).toBe(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
    });

    it('should stay on SELECTED_SQUADDIE if you clicked on another squaddie', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie("torrin", "torrin_0", new HexCoordinate({q: 0, r: 0}));

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: new HexCoordinate({q: 0, r: 0}),
                    selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                    missionMap,
                    squaddieRepository,
                    squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
                }
            )
        ).toBe(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
    });

    it('should change to MOVING_SQUADDIE when a controllable squaddie is selected and you click on the map', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie("torrin", "torrin_0", new HexCoordinate({q: 0, r: 0}));

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: new HexCoordinate({q: 0, r: 1}),
                    selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
                    missionMap,
                    selectedSquaddieDynamicID: "torrin_0",
                    squaddieRepository,
                    squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
                }
            )
        ).toBe(BattleSquaddieUISelectionState.MOVING_SQUADDIE);
    });

    it('should change to NO_SQUADDIE_SELECTED when the moving squaddie has finished', () => {
        const missionMap = createMissionMap(["1 1 "]);

        missionMap.addSquaddie("torrin", "torrin_0", new HexCoordinate({q: 0, r: 0}));

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    tileClickedOn: new HexCoordinate({q: 0, r: 1}),
                    selectionState: BattleSquaddieUISelectionState.MOVING_SQUADDIE,
                    missionMap,
                    selectedSquaddieDynamicID: "torrin_0",
                    squaddieRepository,
                    finishedAnimating: true,
                    squaddieInstructionInProgress: new SquaddieInstructionInProgress({}),
                }
            )
        ).toBe(BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED);
    });

    it('goes to SQUADDIE_SELECTED phase when the squaddie is mid turn', () => {
        const missionMap = createMissionMap(["1 1 "]);
        missionMap.addSquaddie("torrin", "torrin_0", new HexCoordinate({q: 0, r: 0}));
        const moveInstruction = new SquaddieInstruction({
            staticSquaddieId: "torrin",
            dynamicSquaddieId: "torrin_0",
            startingLocation: new HexCoordinate({q: 0, r: 0})
        });
        moveInstruction.addActivity(new SquaddieMovementActivity({
            destination: new HexCoordinate({q: 0, r: 1}),
            numberOfActionsSpent: 1,
        }));
        const currentInstruction = new SquaddieInstructionInProgress({
            instruction: moveInstruction
        });

        expect(
            calculateNewBattleSquaddieUISelectionState(
                {
                    squaddieInstructionInProgress: currentInstruction,
                    selectionState: BattleSquaddieUISelectionState.NO_SQUADDIE_SELECTED,
                    missionMap,
                    selectedSquaddieDynamicID: "torrin_0",
                    squaddieRepository,
                    finishedAnimating: true,
                }
            )
        ).toBe(BattleSquaddieUISelectionState.SELECTED_SQUADDIE);
    });
});
