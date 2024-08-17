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
    SearchPathHelper,
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
import {
    HighlightPulseBlueColor,
    HighlightPulseRedColor,
} from "../../hexMap/hexDrawingUtils"
import { MapHighlightHelper } from "./mapHighlight"
import { MissionMapService } from "../../missionMap/missionMap"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    CampaignResources,
    CampaignResourcesService,
} from "../../campaign/campaignResources"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"

describe("map highlight generator", () => {
    let terrainAllSingleMovement: TerrainTileMap
    let terrainAllDoubleMovement: TerrainTileMap
    let terrainAlternatingPits: TerrainTileMap
    let repository: ObjectRepository

    let rangedAction: ActionTemplate
    let campaignResources: CampaignResources

    beforeEach(() => {
        campaignResources = CampaignResourcesService.default({})

        repository = ObjectRepositoryService.new()
        terrainAllSingleMovement = TerrainTileMapService.new({
            movementCost: ["1 1 1 1 1 1 1 1 1 1 "],
        })

        terrainAllDoubleMovement = TerrainTileMapService.new({
            movementCost: ["2 2 2 2 2 2 2 2 2 2 "],
        })

        terrainAlternatingPits = TerrainTileMapService.new({
            movementCost: ["1 1 - 1 1 1 - 1 1 1 "],
        })

        rangedAction = ActionTemplateService.new({
            id: "meleeAndRanged",
            name: "melee and ranged",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    minimumRange: 0,
                    maximumRange: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
    })

    it("can draw a search path based on the number of actions spent", () => {
        const pathToDraw: SearchPath = SearchPathHelper.newSearchPath()
        SearchPathHelper.add(
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
        SearchPathHelper.add(
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
        SearchPathHelper.add(
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
        SearchPathHelper.add(
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
        SearchPathHelper.add(
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
        SearchPathHelper.add(
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
            repository,
            squaddieWith2Movement
        )

        const battleSquaddie: BattleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: "2 movement",
            squaddieTemplate: squaddieWith2Movement,
        })
        ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie)

        const highlightedTiles: HighlightTileDescription[] =
            MapHighlightHelper.convertSearchPathToHighlightLocations({
                searchPath: pathToDraw,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                repository,
                campaignResources,
            })

        expect(highlightedTiles).toEqual([
            {
                tiles: [{ q: 0, r: 0 }],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    { q: 0, r: 1 },
                    { q: 1, r: 1 },
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_1_ACTION,
            },
            {
                tiles: [{ q: 1, r: 2 }],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_2_ACTIONS,
            },
            {
                tiles: [{ q: 1, r: 3 }],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_3_ACTIONS,
            },
            {
                tiles: [{ q: 2, r: 3 }],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_3_ACTIONS,
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
                repository,
                squaddieWithMovement1
            )

            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleId",
                squaddieTemplate: squaddieWithMovement1,
            })
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie
            )
        }
        const expectedMovementWith1Action = (
            campaignResources: CampaignResources
        ) => [
            {
                tiles: [{ q: 0, r: 2 }],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    { q: 0, r: 1 },
                    { q: 0, r: 3 },
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_1_ACTION,
            },
        ]
        const expectedMovementWith3Actions = (
            campaignResources: CampaignResources
        ) => [
            {
                tiles: [{ q: 0, r: 2 }],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    { q: 0, r: 1 },
                    { q: 0, r: 3 },
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_1_ACTION,
            },
            {
                tiles: [
                    { q: 0, r: 0 },
                    { q: 0, r: 4 },
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_2_ACTIONS,
            },
            {
                tiles: [{ q: 0, r: 5 }],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName:
                    campaignResources.missionMapMovementIconResourceKeys
                        .MOVE_3_ACTIONS,
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
                MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllSingleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository,
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
                MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllSingleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository,
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
                MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllSingleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository,
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
                MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAllDoubleMovement,
                    }),
                    startLocation: { q: 0, r: 2 },
                    repository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                })

            expect(highlightedDescription).toEqual([
                {
                    tiles: [{ q: 0, r: 2 }],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        { q: 0, r: 1 },
                        { q: 0, r: 3 },
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName:
                        campaignResources.missionMapMovementIconResourceKeys
                            .MOVE_2_ACTIONS,
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
                actionTemplates: [rangedAction],
            })
            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieWithOneMovement
            )

            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleId",
                squaddieTemplate: squaddieWithOneMovement,
            })
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie
            )
        })

        it("highlights correct locations when squaddie has a ranged weapon", () => {
            const highlightedDescription: HighlightTileDescription[] =
                MapHighlightHelper.highlightAllLocationsWithinSquaddieRange({
                    missionMap: MissionMapService.new({
                        terrainTileMap: terrainAlternatingPits,
                    }),
                    startLocation: { q: 0, r: 4 },
                    repository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                })

            expect(highlightedDescription).toEqual([
                {
                    tiles: [{ q: 0, r: 4 }],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName: "",
                },
                {
                    tiles: [
                        { q: 0, r: 3 },
                        { q: 0, r: 5 },
                    ],
                    pulseColor: HighlightPulseBlueColor,
                    overlayImageResourceName:
                        campaignResources.missionMapMovementIconResourceKeys
                            .MOVE_1_ACTION,
                },
                {
                    tiles: [
                        { q: 0, r: 1 },
                        { q: 0, r: 7 },
                    ],
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName:
                        campaignResources.missionMapAttackIconResourceKeys
                            .ATTACK_1_ACTION,
                },
            ])
        })
    })
})
