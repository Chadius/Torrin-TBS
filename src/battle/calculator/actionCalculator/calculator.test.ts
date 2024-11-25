import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MissionMap } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { DamageType, HealingType } from "../../../squaddie/squaddieService"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleSquaddie } from "../../battleSquaddie"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../../missionStatistics/missionStatistics"
import { SquaddieMovementService } from "../../../squaddie/movement"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { BattleStateService } from "../../orchestrator/battleState"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { StreamNumberGenerator } from "../../numberGenerator/stream"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import { ActionCalculator } from "./calculator"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import { GameEngineStateService } from "../../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "../../../action/template/actionEffectTemplate"
import {
    AttributeModifier,
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../squaddie/attributeModifier"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../../history/battleAction/battleAction"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { RollModifierType } from "./rollResult"

describe("calculator", () => {
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let player1DynamicId = "player 1"
    let player1SquaddieTemplateId = "player 1"
    let player1BattleSquaddie: BattleSquaddie
    let enemy1DynamicId = "enemy 1"
    let enemy1StaticId = "enemy 1"
    let enemy1BattleSquaddie: BattleSquaddie
    let ally1DynamicId = "ally 1"
    let ally1StaticId = "ally 1"
    let ally1BattleSquaddie: BattleSquaddie

    let actionAlwaysHitsAndDealsBodyDamage: ActionTemplate
    let actionBodyDamageAmount: number
    let actionNeedsAnAttackRollToDealBodyDamage: ActionTemplate

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 "],
            }),
        })

        actionBodyDamageAmount = 2
        actionAlwaysHitsAndDealsBodyDamage = ActionTemplateService.new({
            id: "deal body damage auto hit",
            name: "deal body damage (Auto Hit)",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 9001,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.BODY]: actionBodyDamageAmount,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionAlwaysHitsAndDealsBodyDamage
        )

        actionNeedsAnAttackRollToDealBodyDamage = ActionTemplateService.new({
            id: "deal body damage",
            name: "deal body damage",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 0,
                maximumRange: 9001,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    damageDescriptions: {
                        [DamageType.BODY]: actionBodyDamageAmount,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionNeedsAnAttackRollToDealBodyDamage
        )
        ;({ battleSquaddie: player1BattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.PLAYER,
                battleId: player1DynamicId,
                templateId: player1SquaddieTemplateId,
                name: "player",
                objectRepository: objectRepository,
                actionTemplateIds: [
                    actionAlwaysHitsAndDealsBodyDamage.id,
                    actionNeedsAnAttackRollToDealBodyDamage.id,
                ],
                attributes: {
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    armorClass: 1,
                    tier: 0,
                },
            }))
        ;({ battleSquaddie: enemy1BattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.ENEMY,
                battleId: enemy1DynamicId,
                templateId: enemy1StaticId,
                name: "enemy",
                objectRepository: objectRepository,
                actionTemplateIds: [
                    actionAlwaysHitsAndDealsBodyDamage.id,
                    actionNeedsAnAttackRollToDealBodyDamage.id,
                ],
                attributes: {
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    armorClass: 7,
                    tier: 0,
                },
            }))
        ;({ battleSquaddie: ally1BattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.ALLY,
                battleId: ally1DynamicId,
                templateId: ally1StaticId,
                name: "ally",
                objectRepository: objectRepository,
                attributes: {
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    armorClass: 0,
                    tier: 0,
                },
                actionTemplateIds: [],
            }))
    })

    const getActingBattleSquaddieIdForDealBodyDamage = ({
        actingBattleSquaddie,
    }: {
        actingBattleSquaddie?: BattleSquaddie
    }): string => {
        return actingBattleSquaddie
            ? actingBattleSquaddie.battleSquaddieId
            : player1BattleSquaddie.battleSquaddieId
    }

    const getGameEngineStateForDealBodyDamage = ({
        missionStatistics,
        numberGenerator,
    }: {
        missionStatistics?: MissionStatistics
        numberGenerator?: NumberGeneratorStrategy
    }) => {
        return GameEngineStateService.new({
            resourceHandler: undefined,
            repository: objectRepository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                numberGenerator,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap,
                    missionStatistics,
                }),
            }),
        })
    }

    const dealBodyDamage = ({
        actingBattleSquaddie,
        validTargetLocation,
        missionStatistics,
        currentlySelectedAction,
        numberGenerator,
    }: {
        currentlySelectedAction: ActionTemplate
        actingBattleSquaddie?: BattleSquaddie
        validTargetLocation?: HexCoordinate
        missionStatistics?: MissionStatistics
        numberGenerator?: NumberGeneratorStrategy
    }) => {
        const battleSquaddieId = getActingBattleSquaddieIdForDealBodyDamage({
            actingBattleSquaddie,
        })

        const gameEngineState = getGameEngineStateForDealBodyDamage({
            numberGenerator,
            missionStatistics,
        })
        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: currentlySelectedAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetLocation: validTargetLocation,
        })

        return ActionCalculator.calculateResults({
            gameEngineState,
            battleActionDecisionStep: actionStep,
            actingBattleSquaddie: actingBattleSquaddie ?? player1BattleSquaddie,
            validTargetLocation: validTargetLocation ?? { q: 0, r: 1 },
        })
    }

    describe("deals damage", () => {
        beforeEach(() => {
            missionMap.addSquaddie(
                player1SquaddieTemplateId,
                player1DynamicId,
                { q: 0, r: 0 }
            )
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {
                q: 0,
                r: 1,
            })
        })

        it("will deal full damage to unarmored foes", () => {
            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
            })

            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.damage.net).toBe(2)
            expect(enemy1Changes.attributesBefore.currentHitPoints).toEqual(5)
            expect(enemy1Changes.attributesAfter.currentHitPoints).toEqual(
                5 - 2
            )
        })

        it("will not require a roll for attacks that always hit", () => {
            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
            })
            expect(results[0].actingContext.actorRoll.occurred).toBeFalsy()
        })

        it("will require a roll for attacks that require rolls", () => {
            const expectedRolls: number[] = [61, 66]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            expect(results[0].actingContext.actorRoll.occurred).toBeTruthy()
            expect(results[0].actingContext.actorRoll.rolls).toEqual([1, 6])
        })

        it("will record the damage dealt by the player to mission statistics", () => {
            const missionStatistics: MissionStatistics =
                MissionStatisticsService.new({})
            MissionStatisticsService.reset(missionStatistics)
            MissionStatisticsService.startRecording(missionStatistics)

            dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                missionStatistics,
            })

            expect(missionStatistics.damageDealtByPlayerTeam).toBe(2)
        })

        it("will record the damage dealt to the player to mission statistics", () => {
            const missionStatistics: MissionStatistics =
                MissionStatisticsService.new({})
            MissionStatisticsService.reset(missionStatistics)
            MissionStatisticsService.startRecording(missionStatistics)

            dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                actingBattleSquaddie: enemy1BattleSquaddie,
                validTargetLocation: { q: 0, r: 0 },
                missionStatistics,
            })

            expect(missionStatistics.damageTakenByPlayerTeam).toBe(2)
        })

        it("will record the damage absorbed by the player to mission statistics", () => {
            const missionStatistics: MissionStatistics =
                MissionStatisticsService.new({})
            MissionStatisticsService.reset(missionStatistics)
            MissionStatisticsService.startRecording(missionStatistics)

            const absorb1Damage = AttributeModifierService.new({
                type: AttributeType.ABSORB,
                amount: 1,
                source: AttributeSource.CIRCUMSTANCE,
            })
            InBattleAttributesService.addActiveAttributeModifier(
                player1BattleSquaddie.inBattleAttributes,
                absorb1Damage
            )

            dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                actingBattleSquaddie: enemy1BattleSquaddie,
                validTargetLocation: { q: 0, r: 0 },
                missionStatistics,
            })

            expect(missionStatistics.damageTakenByPlayerTeam).toBe(1)
            expect(missionStatistics.damageAbsorbedByPlayerTeam).toBe(1)
        })
    })

    describe("healing abilities", () => {
        let healsLostHitPoints: ActionTemplate

        beforeEach(() => {
            missionMap.addSquaddie(
                player1SquaddieTemplateId,
                player1DynamicId,
                { q: 0, r: 0 }
            )
            missionMap.addSquaddie(ally1StaticId, ally1DynamicId, {
                q: 0,
                r: 2,
            })

            healsLostHitPoints = ActionTemplateService.new({
                id: "heals lost hit points",
                name: "heals lost hit points",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 9001,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.HEALING]: true,
                            [Trait.ALWAYS_SUCCEEDS]: true,
                        }),
                        healingDescriptions: {
                            [HealingType.LOST_HIT_POINTS]: 2,
                        },
                    }),
                ],
            })
            objectRepository.squaddieTemplates[
                player1SquaddieTemplateId
            ].actionTemplateIds.push(healsLostHitPoints.id)
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                healsLostHitPoints
            )
        })

        it("will heal allies fully", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: ally1BattleSquaddie.inBattleAttributes,
                damageToTake:
                    ally1BattleSquaddie.inBattleAttributes.armyAttributes
                        .maxHitPoints - 1,
                damageType: DamageType.UNKNOWN,
            })

            const actionStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionStep,
                battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionStep,
                actionTemplateId: healsLostHitPoints.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetLocation: { q: 0, r: 2 },
            })

            const results = ActionCalculator.calculateResults({
                gameEngineState: GameEngineStateService.new({
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                missionMap,
                            }),
                        }
                    ),
                    repository: objectRepository,
                }),
                battleActionDecisionStep: actionStep,
                actingBattleSquaddie: player1BattleSquaddie,
                validTargetLocation: { q: 0, r: 2 },
            })

            const ally1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    ally1BattleSquaddie.battleSquaddieId
            )
            expect(ally1Changes.healingReceived).toBe(2)
            expect(ally1Changes.attributesBefore.currentHitPoints).toEqual(1)
            expect(ally1Changes.attributesAfter.currentHitPoints).toEqual(3)
        })

        it("will record the healing received by a player to mission statistics", () => {
            const missionStatistics: MissionStatistics =
                MissionStatisticsService.new({})
            MissionStatisticsService.reset(missionStatistics)
            MissionStatisticsService.startRecording(missionStatistics)

            InBattleAttributesService.takeDamage({
                inBattleAttributes: player1BattleSquaddie.inBattleAttributes,
                damageToTake:
                    ally1BattleSquaddie.inBattleAttributes.armyAttributes
                        .maxHitPoints - 1,
                damageType: DamageType.UNKNOWN,
            })

            const actionStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionStep,
                battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionStep,
                actionTemplateId: healsLostHitPoints.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetLocation: { q: 0, r: 0 },
            })

            ActionCalculator.calculateResults({
                gameEngineState: GameEngineStateService.new({
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                missionMap,
                                missionStatistics,
                            }),
                        }
                    ),
                    repository: objectRepository,
                }),
                battleActionDecisionStep: actionStep,
                actingBattleSquaddie: player1BattleSquaddie,
                validTargetLocation: { q: 0, r: 0 },
            })

            expect(missionStatistics.healingReceivedByPlayerTeam).toBe(2)
        })
    })

    describe("apply attribute modifiers to the target", () => {
        let raiseShieldAction: ActionTemplate
        let armorCircumstanceModifier: AttributeModifier

        beforeEach(() => {
            missionMap.addSquaddie(
                player1SquaddieTemplateId,
                player1DynamicId,
                { q: 0, r: 0 }
            )
            armorCircumstanceModifier = AttributeModifierService.new({
                type: AttributeType.ARMOR,
                source: AttributeSource.CIRCUMSTANCE,
                amount: 1,
                duration: 1,
            })
            raiseShieldAction = ActionTemplateService.new({
                id: "raise shield",
                name: "Raise Shield",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 0,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ALWAYS_SUCCEEDS]: true,
                            [Trait.TARGET_SELF]: true,
                        }),
                        attributeModifiers: [armorCircumstanceModifier],
                    }),
                ],
            })
            objectRepository.squaddieTemplates[
                player1SquaddieTemplateId
            ].actionTemplateIds.push(raiseShieldAction.id)
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                raiseShieldAction
            )
        })

        it("will apply modifiers", () => {
            const actionStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionStep,
                battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionStep,
                actionTemplateId: raiseShieldAction.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetLocation: { q: 0, r: 0 },
            })

            const results = ActionCalculator.calculateResults({
                gameEngineState: GameEngineStateService.new({
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                missionMap,
                            }),
                        }
                    ),
                    repository: objectRepository,
                }),
                battleActionDecisionStep: actionStep,
                actingBattleSquaddie: player1BattleSquaddie,
                validTargetLocation: { q: 0, r: 0 },
            })

            const player1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    player1BattleSquaddie.battleSquaddieId
            )

            const beforeChanges =
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    player1Changes.attributesBefore
                )
            expect(beforeChanges).toHaveLength(0)

            const afterChanges =
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    player1Changes.attributesAfter
                )
            expect(afterChanges).toEqual([
                {
                    type: AttributeType.ARMOR,
                    amount: 1,
                },
            ])

            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    player1Changes.attributesAfter
                )
            ).toEqual([armorCircumstanceModifier])
        })
    })

    describe("chance to hit", () => {
        beforeEach(() => {
            missionMap.addSquaddie(
                player1SquaddieTemplateId,
                player1DynamicId,
                { q: 0, r: 0 }
            )
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {
                q: 0,
                r: 1,
            })
        })

        it("will hit if the roll hits the defender armor", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7

            const expectedRolls: number[] = [1, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes.damage.net).toBe(actionBodyDamageAmount)
        })

        it("will miss if the roll is less than the defender armor class", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7

            const expectedRolls: number[] = [1, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
            expect(enemy1Changes.damage.net).toBe(0)
        })

        it("will always hit if the action always hits", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7

            const expectedRolls: number[] = [1, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                numberGenerator,
            })

            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes.damage.net).toBe(actionBodyDamageAmount)
        })

        it("knows when multiple attack penalties should apply", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7

            const expectedRolls: number[] = [1, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const action0Step: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: action0Step,
                battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: action0Step,
                actionTemplateId: actionNeedsAnAttackRollToDealBodyDamage.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: action0Step,
                targetLocation: { q: 0, r: 0 },
            })

            const battleActionRecorder = BattleActionRecorderService.new()
            BattleActionRecorderService.addReadyToAnimateBattleAction(
                battleActionRecorder,
                BattleActionService.new({
                    actor: {
                        actorBattleSquaddieId:
                            player1BattleSquaddie.battleSquaddieId,
                    },
                    action: {
                        actionTemplateId:
                            actionNeedsAnAttackRollToDealBodyDamage.id,
                    },
                    effect: { squaddie: [] },
                })
            )
            BattleActionRecorderService.battleActionFinishedAnimating(
                battleActionRecorder
            )

            const results = ActionCalculator.calculateResults({
                gameEngineState: GameEngineStateService.new({
                    repository: objectRepository,
                    resourceHandler: undefined,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            numberGenerator,
                            battleState: BattleStateService.newBattleState({
                                missionId: "test mission",
                                campaignId: "test campaign",
                                missionMap,
                                battleActionRecorder,
                                missionStatistics: MissionStatisticsService.new(
                                    {}
                                ),
                            }),
                        }
                    ),
                }),
                battleActionDecisionStep: action0Step,
                actingBattleSquaddie: player1BattleSquaddie,
                validTargetLocation: { q: 0, r: 1 },
            })

            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
            expect(
                results[0].actingContext.actorRoll.rollModifiers[
                    RollModifierType.MULTIPLE_ATTACK_PENALTY
                ]
            ).toEqual(-3)
        })

        it("will apply the tier bonus to the attacker roll to increase change of hitting", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7

            const { battleSquaddie: playerTier1BattleSquaddie } =
                SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleId: "playerTier1",
                    templateId: "playerTier1",
                    name: "playerTier1",
                    objectRepository: objectRepository,
                    actionTemplateIds: [
                        actionAlwaysHitsAndDealsBodyDamage.id,
                        actionNeedsAnAttackRollToDealBodyDamage.id,
                    ],
                    attributes: {
                        maxHitPoints: 5,
                        movement: SquaddieMovementService.new({
                            movementPerAction: 2,
                        }),
                        armorClass: 1,
                        tier: 1,
                    },
                })

            const expectedRolls: number[] = [1, 5]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                actingBattleSquaddie: playerTier1BattleSquaddie,
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes.damage.net).toBe(actionBodyDamageAmount)
        })

        it("will apply the tier bonus to the defender stats to reduce chance of getting hit", () => {
            const {
                battleSquaddie: enemyBattle,
                squaddieTemplate: enemySquaddieTemplate,
            } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemySquaddieTemplate.attributes.tier = 1
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 7
            enemyBattle.inBattleAttributes.armyAttributes.tier = 1

            const expectedRolls: number[] = [1, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
        })
    })

    describe("critical hit chance", () => {
        beforeEach(() => {
            missionMap.addSquaddie(
                player1SquaddieTemplateId,
                player1DynamicId,
                { q: 0, r: 0 }
            )
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {
                q: 0,
                r: 1,
            })
        })

        it("will critically hit if the roll hits the defender armor by 6 points or more", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 2

            const expectedRolls: number[] = [2, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
            expect(enemy1Changes.damage.net).toBe(actionBodyDamageAmount * 2)
        })

        it("will critically hit if the roll is 6 and 6", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 9001

            const expectedRolls: number[] = [6, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
            expect(enemy1Changes.damage.net).toBe(actionBodyDamageAmount * 2)
        })

        it("will increment the number of critical hits dealt by the player squaddies in the mission statistics", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 9001

            const expectedRolls: number[] = [6, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const missionStatistics: MissionStatistics =
                MissionStatisticsService.new({})
            MissionStatisticsService.reset(missionStatistics)
            MissionStatisticsService.startRecording(missionStatistics)

            dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
                missionStatistics,
            })

            expect(missionStatistics.criticalHitsDealtByPlayerTeam).toBe(1)
        })

        it("will increment the number of critical hits taken by the player squaddies in the mission statistics", () => {
            player1BattleSquaddie.inBattleAttributes.armyAttributes.armorClass = 9001

            const expectedRolls: number[] = [6, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const missionStatistics: MissionStatistics =
                MissionStatisticsService.new({})
            MissionStatisticsService.reset(missionStatistics)
            MissionStatisticsService.startRecording(missionStatistics)

            dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                actingBattleSquaddie: enemy1BattleSquaddie,
                validTargetLocation: { q: 0, r: 0 },
                numberGenerator,
                missionStatistics,
            })

            expect(missionStatistics.criticalHitsTakenByPlayerTeam).toBe(1)
        })

        it("cannot critically hit if the action is forbidden from critically succeeding", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 2

            const expectedRolls: number[] = [6, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            TraitStatusStorageService.setStatus(
                (
                    actionAlwaysHitsAndDealsBodyDamage
                        .actionEffectTemplates[0] as ActionEffectTemplate
                ).traits,
                Trait.CANNOT_CRITICALLY_SUCCEED,
                true
            )
            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                numberGenerator,
            })

            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes.damage.net).toBe(actionBodyDamageAmount)
        })

        it("will critically miss if the roll is 6 points or more under the defender armor", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 10

            const expectedRolls: number[] = [2, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
            expect(enemy1Changes.damage.net).toBe(0)
        })

        it("will critically miss if the roll is 1 and 1", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 9001

            const expectedRolls: number[] = [1, 1]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
            expect(enemy1Changes.damage.net).toBe(0)
        })

        it("cannot critically fail if the action is forbidden from critically failing", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armorClass = 10

            const expectedRolls: number[] = [2, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            TraitStatusStorageService.setStatus(
                (
                    actionNeedsAnAttackRollToDealBodyDamage
                        .actionEffectTemplates[0] as ActionEffectTemplate
                ).traits,
                Trait.CANNOT_CRITICALLY_FAIL,
                true
            )
            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = results[0].squaddieChanges.find(
                (change) =>
                    change.battleSquaddieId ===
                    enemy1BattleSquaddie.battleSquaddieId
            )
            expect(enemy1Changes.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
            expect(enemy1Changes.damage.net).toBe(0)
        })
    })

    describe("create one result per action template", () => {
        let actionHasTwoEffectTemplates: ActionTemplate
        beforeEach(() => {
            actionHasTwoEffectTemplates = ActionTemplateService.new({
                id: "actionHasTwoEffectTemplates",
                name: "actionHasTwoEffectTemplates",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 9001,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                            [Trait.ALWAYS_SUCCEEDS]: true,
                        }),
                        damageDescriptions: {
                            [DamageType.BODY]: 1,
                        },
                    }),
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                            [Trait.ALWAYS_SUCCEEDS]: true,
                        }),
                        damageDescriptions: {
                            [DamageType.BODY]: 2,
                        },
                    }),
                ],
            })
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                actionHasTwoEffectTemplates
            )

            missionMap.addSquaddie(
                player1SquaddieTemplateId,
                player1DynamicId,
                { q: 0, r: 0 }
            )
            missionMap.addSquaddie(enemy1StaticId, enemy1DynamicId, {
                q: 0,
                r: 1,
            })
        })

        it("create one result per action template", () => {
            const results = dealBodyDamage({
                currentlySelectedAction: actionHasTwoEffectTemplates,
            })

            expect(results).toHaveLength(2)

            const enemyChangesForFirstTemplate =
                results[0].squaddieChanges.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemyChangesForFirstTemplate.damage.net).toBe(1)
            expect(
                enemyChangesForFirstTemplate.attributesBefore.currentHitPoints
            ).toEqual(5)
            expect(
                enemyChangesForFirstTemplate.attributesAfter.currentHitPoints
            ).toEqual(5 - 1)
            const enemyChangesForSecondTemplate =
                results[1].squaddieChanges.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemyChangesForSecondTemplate.damage.net).toBe(2)
            expect(
                enemyChangesForSecondTemplate.attributesBefore.currentHitPoints
            ).toEqual(4)
            expect(
                enemyChangesForSecondTemplate.attributesAfter.currentHitPoints
            ).toEqual(4 - 2)
        })
    })
})
