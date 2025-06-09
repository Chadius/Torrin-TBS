import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    HighlightCoordinateDescription,
    TerrainTileMap,
    TerrainTileMapService,
} from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
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
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { beforeEach, describe, expect, it } from "vitest"
import { AttributeType } from "../../squaddie/attribute/attributeType"
import { SearchPathAdapterService } from "../../search/searchPathAdapter/searchPathAdapter"
import { SearchConnection } from "../../search/searchGraph/graph"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SearchResultsCacheService } from "../../hexMap/pathfinder/searchResults/searchResultsCache"

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
        const pathToDraw: SearchConnection<HexCoordinate>[] = []
        SearchPathAdapterService.add({
            path: pathToDraw,
            newCoordinate: {
                q: 0,
                r: 1,
            },
            costToMoveToNewCoordinate: 1,
            startCoordinate: {
                q: 0,
                r: 0,
            },
        })
        SearchPathAdapterService.add({
            path: pathToDraw,
            newCoordinate: {
                q: 1,
                r: 1,
            },
            costToMoveToNewCoordinate: 1,
        })
        SearchPathAdapterService.add({
            path: pathToDraw,
            newCoordinate: {
                q: 1,
                r: 2,
            },
            costToMoveToNewCoordinate: 2,
        })
        SearchPathAdapterService.add({
            path: pathToDraw,
            newCoordinate: {
                q: 1,
                r: 3,
            },
            costToMoveToNewCoordinate: 2,
        })
        SearchPathAdapterService.add({
            path: pathToDraw,
            newCoordinate: {
                q: 2,
                r: 3,
            },
            costToMoveToNewCoordinate: 1,
        })

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

        const highlightedTiles: HighlightCoordinateDescription[] =
            MapHighlightService.convertSearchPathToHighlightCoordinates({
                searchPath: pathToDraw,
                battleSquaddieId: battleSquaddie.battleSquaddieId,
                repository: objectRepository,
                squaddieIsNormallyControllableByPlayer: true,
            })

        expect(highlightedTiles).toEqual([
            {
                coordinates: [{ q: 0, r: 0 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [
                    { q: 0, r: 1 },
                    { q: 1, r: 1 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [{ q: 1, r: 2 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [{ q: 1, r: 3 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [{ q: 2, r: 3 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
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
                coordinates: [{ q: 0, r: 2 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [
                    { q: 0, r: 1 },
                    { q: 0, r: 3 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
        ]
        const expectedMovementWith3Actions = (
            campaignResources: CampaignResources
        ) => [
            {
                coordinates: [{ q: 0, r: 2 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [
                    { q: 0, r: 1 },
                    { q: 0, r: 3 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [
                    { q: 0, r: 0 },
                    { q: 0, r: 4 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
            {
                coordinates: [{ q: 0, r: 5 }],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            },
        ]

        it("highlights correct coordinates when squaddie has 1 action", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)
            SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded(
                {
                    squaddieTurn: battleSquaddie.squaddieTurn,
                    actionPoints: 2,
                }
            )

            const missionMap = MissionMapService.new({
                terrainTileMap: terrainAllSingleMovement,
            })
            const highlightedDescription: HighlightCoordinateDescription[] =
                MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                    missionMap,
                    currentMapCoordinate: { q: 0, r: 2 },
                    originMapCoordinate: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                    squaddieAllMovementCache: SearchResultsCacheService.new({
                        missionMap,
                        objectRepository,
                    }),
                })

            expect(highlightedDescription).toEqual(
                expectedMovementWith1Action(campaignResources)
            )
        })
        it("highlights correct coordinates when squaddie has multiple actions", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)

            const missionMap = MissionMapService.new({
                terrainTileMap: terrainAllSingleMovement,
            })

            const highlightedDescription: HighlightCoordinateDescription[] =
                MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                    missionMap,
                    currentMapCoordinate: { q: 0, r: 2 },
                    originMapCoordinate: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                    squaddieAllMovementCache: SearchResultsCacheService.new({
                        missionMap,
                        objectRepository,
                    }),
                })

            expect(highlightedDescription).toEqual(
                expectedMovementWith3Actions(campaignResources)
            )
        })
        it("highlights correct coordinates when applying the number of actions override", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)

            const turnWith1Action = SquaddieTurnService.new()
            SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded(
                {
                    squaddieTurn: turnWith1Action,
                    actionPoints: 2,
                }
            )

            const missionMap = MissionMapService.new({
                terrainTileMap: terrainAllSingleMovement,
            })

            const highlightedDescription: HighlightCoordinateDescription[] =
                MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                    missionMap,
                    currentMapCoordinate: { q: 0, r: 2 },
                    originMapCoordinate: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                    squaddieTurnOverride: turnWith1Action,
                    squaddieAllMovementCache: SearchResultsCacheService.new({
                        missionMap,
                        objectRepository,
                    }),
                })

            expect(highlightedDescription).toEqual(
                expectedMovementWith1Action(campaignResources)
            )
        })
        it("highlights correct coordinates when squaddie has to deal with double movement terrain", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)

            const missionMap = MissionMapService.new({
                terrainTileMap: terrainAllDoubleMovement,
            })

            const highlightedDescription: HighlightCoordinateDescription[] =
                MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                    missionMap,
                    currentMapCoordinate: { q: 0, r: 2 },
                    originMapCoordinate: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                    squaddieAllMovementCache: SearchResultsCacheService.new({
                        missionMap,
                        objectRepository,
                    }),
                })

            expect(highlightedDescription).toEqual([
                {
                    coordinates: [{ q: 0, r: 2 }],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                },
                {
                    coordinates: [
                        { q: 0, r: 1 },
                        { q: 0, r: 3 },
                    ],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                },
            ])
        })
        it("highlights correct coordinates with squaddie can ignore double movement terrain", () => {
            createSquaddie(SquaddieAffiliation.PLAYER)
            SquaddieTurnService.setMovementActionPointsSpentAndCannotBeRefunded(
                {
                    squaddieTurn: battleSquaddie.squaddieTurn,
                    actionPoints: 2,
                }
            )
            InBattleAttributesService.addActiveAttributeModifier(
                battleSquaddie.inBattleAttributes,
                AttributeModifierService.new({
                    type: AttributeType.HUSTLE,
                    source: AttributeSource.CIRCUMSTANCE,
                    amount: 1,
                })
            )
            const missionMap = MissionMapService.new({
                terrainTileMap: terrainAllDoubleMovement,
            })
            const highlightedDescription: HighlightCoordinateDescription[] =
                MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                    missionMap,
                    currentMapCoordinate: { q: 0, r: 2 },
                    originMapCoordinate: { q: 0, r: 2 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                    squaddieAllMovementCache: SearchResultsCacheService.new({
                        missionMap,
                        objectRepository,
                    }),
                })

            expect(highlightedDescription).toEqual(
                expectedMovementWith1Action(campaignResources)
            )
        })
    })

    describe("shows attack tile when squaddie cannot move to coordinate but can attack", () => {
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

        it("highlights correct coordinates when squaddie has a ranged weapon", () => {
            const missionMap = MissionMapService.new({
                terrainTileMap: terrainAlternatingPits,
            })
            const highlightedDescription: HighlightCoordinateDescription[] =
                MapHighlightService.highlightAllCoordinatesWithinSquaddieRange({
                    missionMap,
                    currentMapCoordinate: { q: 0, r: 4 },
                    originMapCoordinate: { q: 0, r: 4 },
                    repository: objectRepository,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    campaignResources,
                    squaddieAllMovementCache: SearchResultsCacheService.new({
                        missionMap,
                        objectRepository,
                    }),
                })

            expect(highlightedDescription).toEqual([
                {
                    coordinates: [{ q: 0, r: 4 }],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
                },
                {
                    coordinates: [
                        { q: 0, r: 3 },
                        { q: 0, r: 5 },
                    ],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
                },
                {
                    coordinates: [
                        { q: 0, r: 1 },
                        { q: 0, r: 7 },
                    ],
                    pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
                },
            ])
        })
    })
})
