import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    HighlightTileDescription,
    TerrainTileMap,
    TerrainTileMapService,
} from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    SearchPath,
    SearchPathService,
} from "../../hexMap/pathfinder/searchPath"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { SquaddieMovementService } from "../../squaddie/movement"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { MapHighlightService } from "./mapHighlight"
import { MissionMapService } from "../../missionMap/missionMap"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    CampaignResources,
    CampaignResourcesService,
} from "../../campaign/campaignResources"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { TargetConstraintsService } from "../../action/targetConstraints"

describe("map highlight generator", () => {
    let terrainAllSingleMovement: TerrainTileMap
    let terrainAllDoubleMovement: TerrainTileMap
    let terrainAlternatingPits: TerrainTileMap
    let objectRepository: ObjectRepository

    let meleeAndRangedAction: ActionTemplate
    let campaignResources: CampaignResources

    beforeEach(() => {
        campaignResources = CampaignResourcesService.default()

        objectRepository = ObjectRepositoryService.new()
        terrainAllSingleMovement = TerrainTileMapService.new({
            movementCost: ["1 1 1 1 1 1 1 1 1 1 "],
        })

        terrainAllDoubleMovement = TerrainTileMapService.new({
            movementCost: ["2 2 2 2 2 2 2 2 2 2 "],
        })

        terrainAlternatingPits = TerrainTileMapService.new({
            movementCost: ["1 1 - 1 1 1 - 1 1 1 "],
        })

        meleeAndRangedAction = ActionTemplateService.new({
            id: "meleeAndRanged",
            name: "melee and ranged",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            meleeAndRangedAction
        )
    })

    it("can draw a search path based on the number of actions spent", () => {
        const pathToDraw: SearchPath = SearchPathService.newSearchPath()
        SearchPathService.add(
            pathToDraw,
            {
                hexCoordinate: {
                    q: 0,
                    r: 0,
                },
                cumulativeMovementCost: 0,
            },
            0
        )
        SearchPathService.add(
            pathToDraw,
            {
                hexCoordinate: {
                    q: 0,
                    r: 1,
                },
                cumulativeMovementCost: 1,
            },
            1
        )
        SearchPathService.add(
            pathToDraw,
            {
                hexCoordinate: {
                    q: 1,
                    r: 1,
                },
                cumulativeMovementCost: 2,
            },
            2
        )
        SearchPathService.add(
            pathToDraw,
            {
                hexCoordinate: {
                    q: 1,
                    r: 2,
                },
                cumulativeMovementCost: 4,
            },
            2
        )
        SearchPathService.add(
            pathToDraw,
            {
                hexCoordinate: {
                    q: 1,
                    r: 3,
                },
                cumulativeMovementCost: 6,
            },
            1
        )
        SearchPathService.add(
            pathToDraw,
            {
                hexCoordinate: {
                    q: 2,
                    r: 3,
                },
                cumulativeMovementCost: 7,
            },
            1
        )

        const squaddieWith2Movement: SquaddieTemplate =
            SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "2movement",
                    name: "2 movement",
                    affiliation: SquaddieAffiliation.UNKNOWN,
                }),
                attributes: ArmyAttributesService.new({
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                }),
            })
        ObjectRepositoryService.addSquaddieTemplate(
            objectRepository,
            squaddieWith2Movement
        )

        const battleSquaddie: BattleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: "2 movement",
            squaddieTemplate: squaddieWith2Movement,
        })
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            battleSquaddie
        )

        const highlightedTiles: HighlightTileDescription[] =
            MapHighlightService.convertSearchPathToHighlightLocations({
                searchPath: pathToDraw,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                repository: objectRepository,
                campaignResources,
                squaddieIsNormallyControllableByPlayer: true,
            })

        expect(highlightedTiles).toEqual([
            {
                tiles: [{ q: 0, r: 0 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    { q: 0, r: 1 },
                    { q: 1, r: 1 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE,
            },
            {
                tiles: [{ q: 1, r: 2 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE,
            },
            {
                tiles: [{ q: 1, r: 3 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE,
            },
            {
                tiles: [{ q: 2, r: 3 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE,
            },
        ])
    })

    describe("shows movement for squaddie with no actions", () => {
        let squaddieWithMovement1: SquaddieTemplate
        let battleSquaddie: BattleSquaddie

        const createSquaddie = (affiliation: SquaddieAffiliation) => {
            squaddieWithMovement1 = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "templateId",
                    name: "template",
                    affiliation: affiliation,
                }),
                attributes: ArmyAttributesService.new({
                    movement: SquaddieMovementService.new({
                        movementPerAction: 1,
                    }),
                }),
            })
            ObjectRepositoryService.addSquaddieTemplate(
                objectRepository,
                squaddieWithMovement1
            )

            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleId",
                squaddieTemplate: squaddieWithMovement1,
            })
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                battleSquaddie
            )
        }
        const expectedMovementWith1Action = (
            campaignResources: CampaignResources
        ) => [
            {
                tiles: [{ q: 0, r: 2 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    { q: 0, r: 1 },
                    { q: 0, r: 3 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE,
            },
        ]
        const expectedMovementWith3Actions = (
            campaignResources: CampaignResources
        ) => [
            {
                tiles: [{ q: 0, r: 2 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    { q: 0, r: 1 },
                    { q: 0, r: 3 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE,
            },
            {
                tiles: [
                    { q: 0, r: 0 },
                    { q: 0, r: 4 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE,
            },
            {
                tiles: [{ q: 0, r: 5 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE,
            },
        ]

        it("highlights correct locations when squaddie has 1 action", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)
            SquaddieTurnService.spendActionPoints(
                battleSquaddie.squaddieTurn,
                2
            )
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(1)

            const highlightedDescription: HighlightTileDescription[] =
                MapHighlightService.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllSingleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                })

            expect(highlightedDescription).toEqual(
                expectedMovementWith1Action(campaignResources)
            )
        })
        it("highlights correct locations when squaddie has multiple actions", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(3)

            const highlightedDescription: HighlightTileDescription[] =
                MapHighlightService.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllSingleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                })

            expect(highlightedDescription).toEqual(
                expectedMovementWith3Actions(campaignResources)
            )
        })
        it("highlights correct locations when applying the number of actions override", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(3)

            const turnWith1Action = SquaddieTurnService.new()
            SquaddieTurnService.spendActionPoints(turnWith1Action, 2)

            const highlightedDescription: HighlightTileDescription[] =
                MapHighlightService.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllSingleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                    squaddieTurnOverride: turnWith1Action,
                })

            expect(highlightedDescription).toEqual(
                expectedMovementWith1Action(campaignResources)
            )
        })
        it("highlights correct locations when squaddie has to deal with double movement terrain", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)
            expect(battleSquaddie.squaddieTurn.remainingActionPoints).toBe(3)

            const highlightedDescription: HighlightTileDescription[] =
                MapHighlightService.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllDoubleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                })

            expect(highlightedDescription).toEqual([
                {
                    tiles: [{ q: 0, r: 2 }],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        { q: 0, r: 1 },
                        { q: 0, r: 3 },
                    ],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    overlayImageResourceName:
                        campaignResources.missionMapMovementIconResourceKeys
                            .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE,
                },
            ])
        })
    })

    describe("shows attack tiles when squaddie cannot move to location but can attack", () => {
        let squaddieWithOneMovement: SquaddieTemplate
        let battleSquaddie: BattleSquaddie

        beforeEach(() => {
            squaddieWithOneMovement = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "templateId",
                    name: "template",
                    affiliation: SquaddieAffiliation.UNKNOWN,
                }),
                attributes: ArmyAttributesService.new({
                    movement: SquaddieMovementService.new({
                        movementPerAction: 1,
                    }),
                }),
                actionTemplateIds: [meleeAndRangedAction.id],
            })
            ObjectRepositoryService.addSquaddieTemplate(
                objectRepository,
                squaddieWithOneMovement
            )

            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleId",
                squaddieTemplate: squaddieWithOneMovement,
            })
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                battleSquaddie
            )
        })

        it("highlights correct locations when squaddie has a ranged weapon", () => {
            const highlightedDescription: HighlightTileDescription[] =
                MapHighlightService.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAlternatingPits,
                    }),
                    startLocation: { q: 0, r: 4 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                })

            expect(highlightedDescription).toEqual([
                {
                    tiles: [{ q: 0, r: 4 }],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        { q: 0, r: 3 },
                        { q: 0, r: 5 },
                    ],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
                    overlayImageResourceName:
                        campaignResources.missionMapMovementIconResourceKeys
                            .MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE,
                },
                {
                    tiles: [
                        { q: 0, r: 1 },
                        { q: 0, r: 7 },
                    ],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
                    overlayImageResourceName:
                        campaignResources.missionMapAttackIconResourceKeys
                            .ATTACK_1_ACTION,
                },
            ])
        })
    })
})
