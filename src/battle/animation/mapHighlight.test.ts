import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {HighlightTileDescription, TerrainTileMap, TerrainTileMapHelper} from "../../hexMap/terrainTileMap";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SearchPath, SearchPathHelper} from "../../hexMap/pathfinder/searchPath";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {SquaddieIdService} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ArmyAttributesService} from "../../squaddie/armyAttributes";
import {SquaddieMovementHelper} from "../../squaddie/movement";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS} from "../loading/missionLoader";
import {MapHighlightHelper} from "./mapHighlight";
import {MissionMapService} from "../../missionMap/missionMap";
import {SquaddieTurnService} from "../../squaddie/turn";

describe('map highlight generator', () => {
    let terrainAllSingleMovement: TerrainTileMap;
    let terrainAllDoubleMovement: TerrainTileMap;
    let terrainAlternatingPits: TerrainTileMap;
    let repository: ObjectRepository;

    let rangedAction: ActionEffectSquaddieTemplate;

    beforeEach(() => {
        repository = ObjectRepositoryService.new();
        terrainAllSingleMovement = TerrainTileMapHelper.new({
            movementCost: ["1 1 1 1 1 1 1 1 1 1 "],
        });

        terrainAllDoubleMovement = TerrainTileMapHelper.new({
            movementCost: ["2 2 2 2 2 2 2 2 2 2 "],
        });

        terrainAlternatingPits = TerrainTileMapHelper.new({
            movementCost: ["1 1 - 1 1 1 - 1 1 1 "],
        });

        rangedAction = ActionEffectSquaddieTemplateService.new({
            id: "meleeAndRanged",
            name: "melee and ranged",
            minimumRange: 0,
            maximumRange: 2,
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        });
    });

    it('can draw a search path based on the number of actions spent', () => {
        const pathToDraw: SearchPath = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 0,
                    r: 0,
                },
                cumulativeMovementCost: 0,
            },
            0
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 0,
                    r: 1,
                },
                cumulativeMovementCost: 1,
            },
            1
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 1,
                    r: 1,
                },
                cumulativeMovementCost: 2,
            },
            2
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 1,
                    r: 2,
                },
                cumulativeMovementCost: 4,
            },
            2
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 1,
                    r: 3,
                },
                cumulativeMovementCost: 6,
            },
            1
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 2,
                    r: 3,
                },
                cumulativeMovementCost: 7,
            },
            1
        );

        const squaddieWith2Movement: SquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "2movement",
                name: "2 movement",
                affiliation: SquaddieAffiliation.UNKNOWN,
            }),
            attributes: ArmyAttributesService.new({
                movement: SquaddieMovementHelper.new({
                    movementPerAction: 2,
                })
            })
        });
        ObjectRepositoryService.addSquaddieTemplate(repository, squaddieWith2Movement);

        const battleSquaddie: BattleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: "2 movement",
            squaddieTemplate: squaddieWith2Movement,
        })
        ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie);

        const highlightedTiles: HighlightTileDescription[] = MapHighlightHelper.convertSearchPathToHighlightLocations({
            searchPath: pathToDraw,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository,
        });

        expect(highlightedTiles).toEqual([
            {
                tiles: [
                    {q: 0, r: 0},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    {q: 0, r: 1},
                    {q: 1, r: 1},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0],
            },
            {
                tiles: [
                    {q: 1, r: 2},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[1],
            },
            {
                tiles: [
                    {q: 1, r: 3},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2],
            },
            {
                tiles: [
                    {q: 2, r: 3},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2],
            },
        ]);
    });

    describe('shows movement for squaddie with no actions', () => {
        let squaddieWithNoMovement: SquaddieTemplate;
        let battleSquaddie: BattleSquaddie;

        beforeEach(() => {
            squaddieWithNoMovement = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "templateId",
                    name: "template",
                    affiliation: SquaddieAffiliation.UNKNOWN,
                }),
                attributes: ArmyAttributesService.new({
                    movement: SquaddieMovementHelper.new({
                        movementPerAction: 1,
                    })
                })
            });
            ObjectRepositoryService.addSquaddieTemplate(repository, squaddieWithNoMovement);

            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleId",
                squaddieTemplate: squaddieWithNoMovement,
            })
            ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie);
        });
        it('highlights correct locations when squaddie has 1 action', () => {
            SquaddieTurnService.spendActionPoints(battleSquaddie.squaddieTurn, 2);
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(1);

            const highlightedDescription: HighlightTileDescription[] = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                missionMap: MissionMapService.new({terrainTileMap: terrainAllSingleMovement}),
                startLocation: {q: 0, r: 2},
                repository,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            });

            expect(highlightedDescription).toEqual([
                {
                    tiles: [
                        {q: 0, r: 2}
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        {q: 0, r: 1},
                        {q: 0, r: 3},
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0],
                }
            ])
        });
        it('highlights correct locations when squaddie has multiple actions', () => {
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(3);

            const highlightedDescription: HighlightTileDescription[] = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                missionMap: MissionMapService.new({terrainTileMap: terrainAllSingleMovement}),
                startLocation: {q: 0, r: 2},
                repository,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            });

            expect(highlightedDescription).toEqual([
                {
                    tiles: [
                        {q: 0, r: 2}
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        {q: 0, r: 1},
                        {q: 0, r: 3},
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0],
                },
                {
                    tiles: [
                        {q: 0, r: 0},
                        {q: 0, r: 4},
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[1],
                },
                {
                    tiles: [
                        {q: 0, r: 5},
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2],
                },
            ])
        });
        it('highlights correct locations when squaddie has to deal with double movement terrain', () => {
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(3);

            const highlightedDescription: HighlightTileDescription[] = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                missionMap: MissionMapService.new({terrainTileMap: terrainAllDoubleMovement}),
                startLocation: {q: 0, r: 2},
                repository,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            });

            expect(highlightedDescription).toEqual([
                {
                    tiles: [
                        {q: 0, r: 2}
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        {q: 0, r: 1},
                        {q: 0, r: 3},
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[1],
                }
            ])
        });
    });

    describe('shows attack tiles when squaddie cannot move to location but can attack', () => {
        let squaddieWithNoMovement: SquaddieTemplate;
        let battleSquaddie: BattleSquaddie;

        beforeEach(() => {
            squaddieWithNoMovement = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "templateId",
                    name: "template",
                    affiliation: SquaddieAffiliation.UNKNOWN,
                }),
                attributes: ArmyAttributesService.new({
                    movement: SquaddieMovementHelper.new({
                        movementPerAction: 1,
                    })
                }),
                actions: [rangedAction],
            });
            ObjectRepositoryService.addSquaddieTemplate(repository, squaddieWithNoMovement);

            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleId",
                squaddieTemplate: squaddieWithNoMovement,
            })
            ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie);
        });

        it('highlights correct locations when squaddie has a ranged weapon', () => {
            const highlightedDescription: HighlightTileDescription[] = MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                missionMap: MissionMapService.new({terrainTileMap: terrainAlternatingPits}),
                startLocation: {q: 0, r: 4},
                repository,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
            });

            expect(highlightedDescription).toEqual([
                {
                    tiles: [
                        {q: 0, r: 4}
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        {q: 0, r: 3},
                        {q: 0, r: 5},
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0],
                },
                {
                    tiles: [
                        {q: 0, r: 1},
                        {q: 0, r: 7},
                    ],
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[3],
                }
            ])
        });
    });
});
