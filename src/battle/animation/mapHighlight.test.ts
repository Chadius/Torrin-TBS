import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
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
import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { ArmyAttributesService } from "../../squaddie/armyAttributes"
import { SquaddieMovementService } from "../../squaddie/movement"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { MapHighlightService } from "./mapHighlight"
import { MissionMapService } from "../../missionMap/missionMap"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionRange,
    TargetConstraintsService,
} from "../../action/targetConstraints"
import {
    AttributeModifierService,
    AttributeSource,
} from "../../squaddie/attribute/attributeModifier"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import { beforeEach, describe, expect, it } from "vitest"
import { Attribute } from "../../squaddie/attribute/attribute"
import { SearchResultsCacheService } from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import {
    HighlightCoordinateDescription,
    HighlightCoordinateDescriptionService,
} from "../../hexMap/highlightCoordinateDescription"
import { CoordinateGeneratorShape } from "../targeting/coordinateGenerator"
import { Healing } from "../../squaddie/squaddieService"

describe("map highlight generator", () => {
    let terrainAllSingleMovement: TerrainTileMap
    let terrainAllDoubleMovement: TerrainTileMap
    let terrainAlternatingPits: TerrainTileMap
    let objectRepository: ObjectRepository

    let meleeAndRangedAction: ActionTemplate
    let healingAction: ActionTemplate

    beforeEach(() => {
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
                range: ActionRange.REACH,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: false,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: false,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
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

        healingAction = ActionTemplateService.new({
            id: "healingAction",
            name: "healingAction",
            targetConstraints: TargetConstraintsService.new({
                range: ActionRange.REACH,
                coordinateGeneratorShape: CoordinateGeneratorShape.BLOOM,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: false,
                    },
                    healingDescriptions: {
                        [Healing.LOST_HIT_POINTS]: 2,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            healingAction
        )
    })

    describe("shows movement for squaddie with no actions", () => {
        let squaddieWithMovement1: SquaddieTemplate
        let battleSquaddie: BattleSquaddie

        const createSquaddie = (affiliation: TSquaddieAffiliation) => {
            squaddieWithMovement1 = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    squaddieTemplateId: "templateId",
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
        const expectedMovementWith1Action =
            (): HighlightCoordinateDescription => ({
                coordinates: [
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                    { q: 0, r: 3 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            })

        const expectedMovementWith3Actions =
            (): HighlightCoordinateDescription => ({
                coordinates: [
                    { q: 0, r: 0 },
                    { q: 0, r: 1 },
                    { q: 0, r: 2 },
                    { q: 0, r: 3 },
                    { q: 0, r: 4 },
                    { q: 0, r: 5 },
                ],
                pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
            })

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
                    squaddieAllMovementCache: SearchResultsCacheService.new(),
                })

            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    expectedMovementWith1Action()
                )
            ).toBe(true)
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
                    squaddieAllMovementCache: SearchResultsCacheService.new(),
                })

            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    expectedMovementWith3Actions()
                )
            ).toBe(true)
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
                    squaddieTurnOverride: turnWith1Action,
                    squaddieAllMovementCache: SearchResultsCacheService.new(),
                })

            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    expectedMovementWith1Action()
                )
            ).toBe(true)
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
                    squaddieAllMovementCache: SearchResultsCacheService.new(),
                })

            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    {
                        coordinates: [
                            { q: 0, r: 2 },
                            { q: 0, r: 1 },
                            { q: 0, r: 3 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    }
                )
            ).toBe(true)
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
                    type: Attribute.HUSTLE,
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
                    squaddieAllMovementCache: SearchResultsCacheService.new(),
                })

            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    expectedMovementWith1Action()
                )
            ).toBe(true)
        })
    })

    describe("shows targeted tiles when squaddie cannot move to coordinate but can reach with actions", () => {
        const addSquaddie = ({
            squaddieTemplateId,
            name,
            affiliation,
            battleSquaddieId,
            actionTemplateIds,
        }: {
            squaddieTemplateId: string
            name: string
            affiliation: TSquaddieAffiliation
            battleSquaddieId: string
            actionTemplateIds: string[]
        }) => {
            let squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    squaddieTemplateId,
                    name,
                    affiliation,
                }),
                attributes: ArmyAttributesService.new({
                    movement: SquaddieMovementService.new({
                        movementPerAction: 1,
                    }),
                }),
                actionTemplateIds,
            })
            ObjectRepositoryService.addSquaddieTemplate(
                objectRepository,
                squaddieTemplate
            )

            let battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId,
                squaddieTemplate,
            })
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
                battleSquaddie
            )
        }

        const generateHighlightedDescription = (battleSquaddieId: string) => {
            const missionMap = MissionMapService.new({
                terrainTileMap: terrainAlternatingPits,
            })
            return MapHighlightService.highlightAllCoordinatesWithinSquaddieRange(
                {
                    missionMap,
                    currentMapCoordinate: { q: 0, r: 4 },
                    originMapCoordinate: { q: 0, r: 4 },
                    repository: objectRepository,
                    battleSquaddieId,
                    squaddieAllMovementCache: SearchResultsCacheService.new(),
                }
            )
        }

        it("highlights correct coordinates when uncontrollable squaddie can only attack", () => {
            addSquaddie({
                squaddieTemplateId: "uncontrollableOneMovementAttackOnly",
                name: "Uncontrollable One Movement Attack Only",
                affiliation: SquaddieAffiliation.UNKNOWN,
                battleSquaddieId: "uncontrollableOneMovementAttackOnly",
                actionTemplateIds: [meleeAndRangedAction.id],
            })

            const highlightedDescription = generateHighlightedDescription(
                "uncontrollableOneMovementAttackOnly"
            )
            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    {
                        coordinates: [
                            { q: 0, r: 4 },
                            { q: 0, r: 3 },
                            { q: 0, r: 5 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
                    }
                )
            ).toBe(true)
            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[1],
                    {
                        coordinates: [
                            { q: 0, r: 1 },
                            { q: 0, r: 7 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.PURPLE,
                    }
                )
            ).toBe(true)
        })

        it("highlights correct coordinates when player controllable squaddie can only attack", () => {
            addSquaddie({
                squaddieTemplateId: "playerControllableOneMovementAttackOnly",
                name: "Player Controllable One Movement Attack Only",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieId:
                    "playerControllableBattleSquaddieWithAttacksOnly",
                actionTemplateIds: [meleeAndRangedAction.id],
            })

            const highlightedDescription = generateHighlightedDescription(
                "playerControllableBattleSquaddieWithAttacksOnly"
            )

            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    {
                        coordinates: [
                            { q: 0, r: 4 },
                            { q: 0, r: 3 },
                            { q: 0, r: 5 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    }
                )
            ).toBe(true)
            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[1],
                    {
                        coordinates: [
                            { q: 0, r: 1 },
                            { q: 0, r: 7 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                    }
                )
            ).toBe(true)
        })
        it("highlights correct coordinates when player controllable squaddie can only heal", () => {
            addSquaddie({
                squaddieTemplateId: "playerControllableOneMovementHealingOnly",
                name: "Player Controllable One Movement Healing Only",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieId:
                    "playerControllableBattleSquaddieWithHealingOnly",
                actionTemplateIds: [healingAction.id],
            })

            const highlightedDescription = generateHighlightedDescription(
                "playerControllableBattleSquaddieWithHealingOnly"
            )

            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[0],
                    {
                        coordinates: [
                            { q: 0, r: 4 },
                            { q: 0, r: 3 },
                            { q: 0, r: 5 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.BLUE,
                    }
                )
            ).toBe(true)
            expect(
                HighlightCoordinateDescriptionService.areEqual(
                    highlightedDescription[1],
                    {
                        coordinates: [
                            { q: 0, r: 1 },
                            { q: 0, r: 7 },
                        ],
                        pulseColor: HIGHLIGHT_PULSE_COLOR.GREEN,
                    }
                )
            ).toBe(true)
        })
    })
})
