import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { Damage, Healing } from "../../../squaddie/squaddieService"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleSquaddie } from "../../battleSquaddie"
import {
    MissionStatistics,
    MissionStatisticsService,
} from "../../missionStatistics/missionStatistics"
import { SquaddieMovementService } from "../../../squaddie/movement"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { BattleStateService } from "../../battleState/battleState"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { StreamNumberGenerator } from "../../numberGenerator/stream"
import { NumberGeneratorStrategy } from "../../numberGenerator/strategy"
import { getResultOrThrowError } from "../../../utils/resultOrError"
import { ActionCalculator } from "./calculator"
import { DegreeOfSuccess } from "./degreeOfSuccess"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../../action/template/actionEffectTemplate"
import {
    AttributeModifier,
    AttributeModifierService,
    AttributeSource,
} from "../../../squaddie/attribute/attributeModifier"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../../actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../../history/battleAction/battleAction"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { RollModifierEnum } from "./rollResult"
import { CalculatorAttack } from "./attack"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    ArmyAttributesService,
    ProficiencyLevel,
} from "../../../squaddie/armyAttributes"
import { CalculatedResult } from "../../history/calculatedResult"
import { Attribute } from "../../../squaddie/attribute/attribute"
import { RandomNumberGenerator } from "../../numberGenerator/random"
import {
    ChallengeModifierEnum,
    ChallengeModifierSetting,
    ChallengeModifierSettingService,
} from "../../challengeModifier/challengeModifierSetting"
import { GameEngineStateService } from "../../../gameEngine/gameEngineState/gameEngineState"

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
        missionMap = MissionMapService.new({
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
                        [Damage.BODY]: actionBodyDamageAmount,
                    },
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
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
                        [Damage.BODY]: actionBodyDamageAmount,
                    },
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
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
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    armor: {
                        proficiencyLevel: ProficiencyLevel.UNTRAINED,
                        base: -5,
                    },
                    tier: 0,
                }),
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
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    armor: {
                        proficiencyLevel: ProficiencyLevel.UNTRAINED,
                        base: 1,
                    },
                    tier: 0,
                }),
            }))
        ;({ battleSquaddie: ally1BattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                affiliation: SquaddieAffiliation.ALLY,
                battleId: ally1DynamicId,
                templateId: ally1StaticId,
                name: "ally",
                objectRepository: objectRepository,
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    armor: {
                        proficiencyLevel: ProficiencyLevel.UNTRAINED,
                        base: -6,
                    },
                    tier: 0,
                }),
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
        validTargetCoordinate,
        missionStatistics,
        currentlySelectedAction,
        numberGenerator,
        challengeModifierSetting,
    }: {
        currentlySelectedAction: ActionTemplate
        actingBattleSquaddie?: BattleSquaddie
        validTargetCoordinate?: HexCoordinate
        missionStatistics?: MissionStatistics
        numberGenerator?: NumberGeneratorStrategy
        challengeModifierSetting?: ChallengeModifierSetting
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
            battleSquaddieId: actingBattleSquaddie
                ? actingBattleSquaddie.battleSquaddieId
                : battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: currentlySelectedAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetCoordinate: validTargetCoordinate ?? { q: 0, r: 1 },
        })
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            actionStep
        return ActionCalculator.calculateAndApplyResults({
            battleActionDecisionStep: actionStep,
            missionMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap,
            objectRepository,
            battleActionRecorder:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
            numberGenerator:
                gameEngineState.battleOrchestratorState.numberGenerator,
            missionStatistics:
                gameEngineState.battleOrchestratorState.battleState
                    .missionStatistics,
            challengeModifierSetting:
                challengeModifierSetting ??
                ChallengeModifierSettingService.new(),
        })
    }

    const forecastBodyDamage = ({
        actingBattleSquaddie,
        targetCoordinates,
        missionStatistics,
        currentlySelectedAction,
        numberGenerator,
    }: {
        currentlySelectedAction: ActionTemplate
        actingBattleSquaddie?: BattleSquaddie
        targetCoordinates?: HexCoordinate[]
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
        if (!targetCoordinates || targetCoordinates?.length === 0) {
            targetCoordinates = [{ q: 0, r: 1 }]
        }

        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetCoordinate: targetCoordinates[0],
        })
        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            actionStep

        return ActionCalculator.forecastResults({
            missionMap,
            battleActionDecisionStep: actionStep,
            objectRepository,
            battleActionRecorder: BattleActionRecorderService.new(),
            numberGenerator: new RandomNumberGenerator(),
        })
    }

    describe("deals damage", () => {
        beforeEach(() => {
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: player1SquaddieTemplateId,
                squaddieTemplateId: player1DynamicId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: enemy1StaticId,
                squaddieTemplateId: enemy1DynamicId,
                originMapCoordinate: { q: 0, r: 1 },
            })
        })

        it("will deal full damage to unarmored foes", () => {
            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
            })

            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.damage.net).toBe(2)
            expect(enemy1Changes!.attributesBefore!.currentHitPoints).toEqual(5)
            expect(enemy1Changes!.attributesAfter!.currentHitPoints).toEqual(
                5 - 2
            )
        })

        it("will not require a roll for attacks that always hit", () => {
            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
            })
            expect(
                results!.changesPerEffect[0]!.actorContext!.actorRoll.occurred
            ).toBeFalsy()
        })

        it("if the action always succeeds, will only forecast success", () => {
            const results = forecastBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
            })
            expect(
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess === DegreeOfSuccess.SUCCESS
                )?.chanceOfDegreeOfSuccess
            ).toBe(36)
            expect(
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess ===
                        DegreeOfSuccess.CRITICAL_SUCCESS
                )
            ).toBeUndefined()
            expect(
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess ===
                        DegreeOfSuccess.CRITICAL_FAILURE
                )
            ).toBeUndefined()
            expect(
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess === DegreeOfSuccess.FAILURE
                )
            ).toBeUndefined()
        })

        it("if the action cannot critically fail, add forecasted chances to failure chance", () => {
            const allDegreesPossible = forecastBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
            })
            expect(
                allDegreesPossible!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess ===
                        DegreeOfSuccess.CRITICAL_FAILURE
                )?.chanceOfDegreeOfSuccess
            ).toBeGreaterThan(0)

            TraitStatusStorageService.setStatus(
                actionNeedsAnAttackRollToDealBodyDamage.actionEffectTemplates[0]
                    .traits,
                Trait.CANNOT_CRITICALLY_FAIL,
                true
            )
            const cannotCriticallyFail = forecastBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
            })
            expect(
                cannotCriticallyFail!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess ===
                        DegreeOfSuccess.CRITICAL_FAILURE
                )
            ).toBeUndefined()
            expect(
                cannotCriticallyFail!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess === DegreeOfSuccess.FAILURE
                )?.chanceOfDegreeOfSuccess
            ).toEqual(
                (allDegreesPossible!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess === DegreeOfSuccess.FAILURE
                )?.chanceOfDegreeOfSuccess ?? 0) +
                    (allDegreesPossible!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.actorDegreeOfSuccess ===
                            DegreeOfSuccess.CRITICAL_FAILURE
                    )?.chanceOfDegreeOfSuccess ?? 0)
            )
        })

        it("if the action cannot critically succeed, add forecasted chances to success chance", () => {
            const allDegreesPossible = forecastBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
            })
            expect(
                allDegreesPossible!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess ===
                        DegreeOfSuccess.CRITICAL_SUCCESS
                )?.chanceOfDegreeOfSuccess
            ).toBeGreaterThan(0)

            TraitStatusStorageService.setStatus(
                actionNeedsAnAttackRollToDealBodyDamage.actionEffectTemplates[0]
                    .traits,
                Trait.CANNOT_CRITICALLY_SUCCEED,
                true
            )
            const cannotCriticallySucceed = forecastBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
            })
            expect(
                cannotCriticallySucceed!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess ===
                        DegreeOfSuccess.CRITICAL_SUCCESS
                )
            ).toBeUndefined()
            expect(
                cannotCriticallySucceed!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess === DegreeOfSuccess.SUCCESS
                )?.chanceOfDegreeOfSuccess
            ).toEqual(
                (allDegreesPossible!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.actorDegreeOfSuccess === DegreeOfSuccess.SUCCESS
                )?.chanceOfDegreeOfSuccess ?? 0) +
                    (allDegreesPossible!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.actorDegreeOfSuccess ===
                            DegreeOfSuccess.CRITICAL_SUCCESS
                    )?.chanceOfDegreeOfSuccess ?? 0)
            )
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
            expect(
                results!.changesPerEffect[0]!.actorContext!.actorRoll.occurred
            ).toBeTruthy()
            expect(
                results!.changesPerEffect[0]!.actorContext!.actorRoll.rolls
            ).toEqual([1, 6])
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

        it("will record the damage taken by the player to mission statistics", () => {
            const missionStatistics: MissionStatistics =
                MissionStatisticsService.new({})
            MissionStatisticsService.reset(missionStatistics)
            MissionStatisticsService.startRecording(missionStatistics)

            dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                actingBattleSquaddie: enemy1BattleSquaddie,
                validTargetCoordinate: { q: 0, r: 0 },
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
                type: Attribute.ABSORB,
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
                validTargetCoordinate: { q: 0, r: 0 },
                missionStatistics,
            })

            expect(missionStatistics.damageTakenByPlayerTeam).toBe(1)
            expect(missionStatistics.damageAbsorbedByPlayerTeam).toBe(1)
        })

        describe("Get forecast", () => {
            let forecast: CalculatedResult | undefined
            beforeEach(() => {
                forecast = forecastBodyDamage({
                    currentlySelectedAction:
                        actionNeedsAnAttackRollToDealBodyDamage,
                })
            })

            it("does not change the target hit points", () => {
                expect(
                    enemy1BattleSquaddie.inBattleAttributes.currentHitPoints
                ).toEqual(
                    enemy1BattleSquaddie.inBattleAttributes.armyAttributes
                        .maxHitPoints
                )
            })

            it("returns the chance for different degrees of success", () => {
                expect(
                    forecast!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.actorDegreeOfSuccess ===
                            DegreeOfSuccess.SUCCESS
                    )
                ).not.toBeUndefined()
            })

            it("will note the attack was fatal if it deals more damage than the target hit points", () => {
                enemy1BattleSquaddie.inBattleAttributes.currentHitPoints = 1
                forecast = forecastBodyDamage({
                    currentlySelectedAction:
                        actionNeedsAnAttackRollToDealBodyDamage,
                })
                const successForecast =
                    forecast!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.actorDegreeOfSuccess ===
                            DegreeOfSuccess.SUCCESS
                    )
                expect(successForecast!.damage.net).toBeGreaterThanOrEqual(
                    enemy1BattleSquaddie.inBattleAttributes.currentHitPoints
                )
                expect(successForecast!.damage.willKo).toBeTruthy()
            })
        })
    })

    describe("healing abilities", () => {
        let healsLostHitPoints: ActionTemplate

        beforeEach(() => {
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: player1SquaddieTemplateId,
                squaddieTemplateId: player1DynamicId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: ally1DynamicId,
                squaddieTemplateId: ally1StaticId,
                originMapCoordinate: { q: 0, r: 2 },
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
                            [Healing.LOST_HIT_POINTS]: 2,
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

        const createPlayerHealsAllyAction = (
            healsLostHitPoints: ActionTemplate
        ) => {
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
                targetCoordinate: { q: 0, r: 2 },
            })
            return actionStep
        }

        it("will heal allies fully", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: ally1BattleSquaddie.inBattleAttributes,
                damageToTake:
                    ally1BattleSquaddie.inBattleAttributes.armyAttributes
                        .maxHitPoints - 1,
                damageType: Damage.UNKNOWN,
            })
            const actionStep = createPlayerHealsAllyAction(healsLostHitPoints)

            const results = ActionCalculator.calculateAndApplyResults({
                battleActionDecisionStep: actionStep,
                missionMap,
                objectRepository,
                battleActionRecorder: BattleActionRecorderService.new(),
                numberGenerator: new RandomNumberGenerator(),
                missionStatistics: MissionStatisticsService.new({}),
                challengeModifierSetting: ChallengeModifierSettingService.new(),
            })

            const ally1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        ally1BattleSquaddie.battleSquaddieId
                )
            expect(ally1Changes!.healingReceived).toBe(2)
            expect(ally1Changes!.attributesBefore!.currentHitPoints).toEqual(1)
            expect(ally1Changes!.attributesAfter!.currentHitPoints).toEqual(3)
        })

        it("will forecast a NONE degree of success", () => {
            InBattleAttributesService.takeDamage({
                inBattleAttributes: ally1BattleSquaddie.inBattleAttributes,
                damageToTake:
                    ally1BattleSquaddie.inBattleAttributes.armyAttributes
                        .maxHitPoints - 1,
                damageType: Damage.UNKNOWN,
            })

            const actionStep = createPlayerHealsAllyAction(healsLostHitPoints)

            const results = ActionCalculator.forecastResults({
                missionMap,
                battleActionDecisionStep: actionStep,
                objectRepository,
                battleActionRecorder: BattleActionRecorderService.new(),
                numberGenerator: new RandomNumberGenerator(),
            })

            const ally1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        ally1BattleSquaddie.battleSquaddieId
                )
            expect(ally1Changes!.healingReceived).toBe(2)
            expect(ally1Changes!.attributesBefore!.currentHitPoints).toEqual(1)
            expect(ally1Changes!.attributesAfter!.currentHitPoints).toEqual(3)
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
                damageType: Damage.UNKNOWN,
            })

            const actionStep = createPlayerHealsAllyAction(healsLostHitPoints)
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetCoordinate: { q: 0, r: 0 },
            })

            ActionCalculator.calculateAndApplyResults({
                battleActionDecisionStep: actionStep,
                missionMap,
                objectRepository,
                battleActionRecorder: BattleActionRecorderService.new(),
                numberGenerator: new RandomNumberGenerator(),
                missionStatistics,
                challengeModifierSetting: ChallengeModifierSettingService.new(),
            })

            expect(missionStatistics.healingReceivedByPlayerTeam).toBe(2)
        })
    })

    describe("apply attribute modifiers to the target", () => {
        let raiseShieldAction: ActionTemplate
        let armorCircumstanceModifier: AttributeModifier

        beforeEach(() => {
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: player1SquaddieTemplateId,
                squaddieTemplateId: player1DynamicId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            armorCircumstanceModifier = AttributeModifierService.new({
                type: Attribute.ARMOR,
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
                        }),
                        squaddieAffiliationRelation: {
                            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: true,
                        },
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
                targetCoordinate: { q: 0, r: 0 },
            })
            const results = ActionCalculator.calculateAndApplyResults({
                battleActionDecisionStep: actionStep,
                missionMap,
                objectRepository,
                battleActionRecorder: BattleActionRecorderService.new(),
                numberGenerator: new RandomNumberGenerator(),
                missionStatistics: MissionStatisticsService.new({}),
                challengeModifierSetting: ChallengeModifierSettingService.new(),
            })

            const player1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        player1BattleSquaddie.battleSquaddieId
                )

            const beforeChanges =
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    player1Changes!.attributesBefore!
                )
            expect(beforeChanges).toHaveLength(0)

            const afterChanges =
                InBattleAttributesService.calculateCurrentAttributeModifiers(
                    player1Changes!.attributesAfter!
                )
            expect(afterChanges).toEqual([
                {
                    type: Attribute.ARMOR,
                    amount: 1,
                },
            ])

            expect(
                InBattleAttributesService.getAllActiveAttributeModifiers(
                    player1Changes!.attributesAfter!
                )
            ).toEqual([armorCircumstanceModifier])
        })
    })

    describe("chance to hit", () => {
        beforeEach(() => {
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: player1SquaddieTemplateId,
                squaddieTemplateId: player1DynamicId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: enemy1StaticId,
                squaddieTemplateId: enemy1DynamicId,
                originMapCoordinate: { q: 0, r: 1 },
            })
        })

        it("will hit if the roll hits the defender armor", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 1,
            }

            const expectedRolls: number[] = [1, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes!.damage.net).toBe(actionBodyDamageAmount)
        })

        it("will miss if the roll is less than the defender armor class", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 1,
            }

            const expectedRolls: number[] = [1, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
            expect(enemy1Changes!.damage.net).toBe(0)
        })

        it("will always hit if the action always hits", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 1,
            }

            const expectedRolls: number[] = [1, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                numberGenerator,
            })

            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes!.damage.net).toBe(actionBodyDamageAmount)
        })

        describe("knows when multiple attack penalties should apply", () => {
            let previousActionStep: BattleActionDecisionStep
            let currentActionStep: BattleActionDecisionStep

            beforeEach(() => {
                const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        enemy1DynamicId
                    )
                )
                enemyBattle.inBattleAttributes.armyAttributes.armor = {
                    proficiencyLevel: ProficiencyLevel.UNTRAINED,
                    base: 1,
                }

                previousActionStep = BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: previousActionStep,
                    battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: previousActionStep,
                    actionTemplateId:
                        actionNeedsAnAttackRollToDealBodyDamage.id,
                })
                BattleActionDecisionStepService.setConfirmedTarget({
                    actionDecisionStep: previousActionStep,
                    targetCoordinate: { q: 0, r: 0 },
                })

                currentActionStep = BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep: currentActionStep,
                    battleSquaddieId: player1BattleSquaddie.battleSquaddieId,
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep: currentActionStep,
                    actionTemplateId:
                        actionNeedsAnAttackRollToDealBodyDamage.id,
                })
                BattleActionDecisionStepService.setConfirmedTarget({
                    actionDecisionStep: currentActionStep,
                    targetCoordinate: { q: 0, r: 1 },
                })
            })

            it("attack misses because of the penalty", () => {
                const expectedRolls: number[] = [1, 6]
                const numberGenerator: StreamNumberGenerator =
                    new StreamNumberGenerator({ results: expectedRolls })
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
                BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                    battleActionRecorder
                )

                const results = ActionCalculator.calculateAndApplyResults({
                    battleActionDecisionStep: currentActionStep,
                    missionMap,
                    objectRepository,
                    battleActionRecorder,
                    numberGenerator,
                    missionStatistics: MissionStatisticsService.new({}),
                    challengeModifierSetting:
                        ChallengeModifierSettingService.new(),
                })

                const enemy1Changes =
                    results!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.battleSquaddieId ===
                            enemy1BattleSquaddie.battleSquaddieId
                    )
                expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                    DegreeOfSuccess.FAILURE
                )
                expect(
                    results!.changesPerEffect[0]!.actorContext!.actorRoll
                        .rollModifiers[RollModifierEnum.MULTIPLE_ATTACK_PENALTY]
                ).toEqual(-3)
            })
            it("reduces the forecasted chance to succeed because of the penalty", () => {
                const forecastForFirstAttack = ActionCalculator.forecastResults(
                    {
                        missionMap,
                        battleActionDecisionStep: currentActionStep,
                        objectRepository,
                        battleActionRecorder: BattleActionRecorderService.new(),
                        numberGenerator: new RandomNumberGenerator(),
                    }
                )

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
                BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                    battleActionRecorder
                )

                const forecastForSecondAttack =
                    ActionCalculator.forecastResults({
                        missionMap,
                        battleActionDecisionStep: currentActionStep,
                        objectRepository,
                        battleActionRecorder,
                        numberGenerator: new RandomNumberGenerator(),
                    })
                expect(
                    forecastForSecondAttack!.changesPerEffect[0]!.actorContext!
                        .actorRoll.rollModifiers[
                        RollModifierEnum.MULTIPLE_ATTACK_PENALTY
                    ]
                ).toBe(-3)

                expect(
                    forecastForFirstAttack!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.actorDegreeOfSuccess ===
                            DegreeOfSuccess.SUCCESS
                    )?.chanceOfDegreeOfSuccess
                ).toBeGreaterThan(
                    forecastForSecondAttack!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.actorDegreeOfSuccess ===
                            DegreeOfSuccess.SUCCESS
                    )?.chanceOfDegreeOfSuccess ?? 9001
                )
            })
        })

        describe("attack proficiency", () => {
            it("will apply the proficiency bonus to the attacker roll to increase change of hitting", () => {
                const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        enemy1DynamicId
                    )
                )
                setArmorClass({
                    battleSquaddie: enemyBattle,
                    desiredArmorClass: 2,
                })

                const { battleSquaddie: playerTier1BattleSquaddie } =
                    SquaddieRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            affiliation: SquaddieAffiliation.PLAYER,
                            battleId: "playerTier1",
                            templateId: "playerTier1",
                            name: "playerTier1",
                            objectRepository: objectRepository,
                            actionTemplateIds: [
                                actionAlwaysHitsAndDealsBodyDamage.id,
                                actionNeedsAnAttackRollToDealBodyDamage.id,
                            ],
                            attributes: ArmyAttributesService.new({
                                maxHitPoints: 5,
                                movement: SquaddieMovementService.new({
                                    movementPerAction: 2,
                                }),
                                ...setAttackBonusVersusArmor(2),
                            }),
                        }
                    )

                const expectedRolls: number[] = [1, 5]
                const numberGenerator: StreamNumberGenerator =
                    new StreamNumberGenerator({ results: expectedRolls })

                const results = dealBodyDamage({
                    actingBattleSquaddie: playerTier1BattleSquaddie,
                    currentlySelectedAction:
                        actionNeedsAnAttackRollToDealBodyDamage,
                    numberGenerator,
                })
                const enemy1Changes =
                    results!.changesPerEffect[0]!.squaddieChanges!.find(
                        (change) =>
                            change.battleSquaddieId ===
                            enemy1BattleSquaddie.battleSquaddieId
                    )
                expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                    DegreeOfSuccess.SUCCESS
                )
                expect(enemy1Changes!.damage.net).toBe(actionBodyDamageAmount)
            })
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
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.NOVICE,
                base: 0,
            }
            enemyBattle.inBattleAttributes.armyAttributes.tier = 1

            const expectedRolls: number[] = [1, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
        })
    })

    describe("critical hit chance", () => {
        beforeEach(() => {
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: player1SquaddieTemplateId,
                squaddieTemplateId: player1DynamicId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: enemy1StaticId,
                squaddieTemplateId: enemy1DynamicId,
                originMapCoordinate: { q: 0, r: 1 },
            })
        })

        it("will critically hit if the roll hits the defender armor by 6 points or more", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: -4,
            }

            const expectedRolls: number[] = [2, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
            expect(enemy1Changes!.damage.net).toBe(actionBodyDamageAmount * 2)
        })

        it("will critically hit if the roll is 6 and 6 and the attack would have hit", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 3,
            }

            const expectedRolls: number[] = [6, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = getChangesForBattleSquaddie(
                results!,
                enemy1BattleSquaddie
            )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_SUCCESS
            )
            expect(enemy1Changes!.damage.net).toBe(actionBodyDamageAmount * 2)
        })

        it("will hit normally if the roll is 6 and 6 and the attack would have missed", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 4,
            }

            const expectedRolls: number[] = [6, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const battleSquaddieId = getActingBattleSquaddieIdForDealBodyDamage(
                {
                    actingBattleSquaddie: player1BattleSquaddie,
                }
            )

            const gameEngineState = getGameEngineStateForDealBodyDamage({
                numberGenerator,
            })

            BattleActionRecorderService.addReadyToAnimateBattleAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder,
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
            BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionRecorder
            )

            const actionStep: BattleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                actionDecisionStep: actionStep,
                battleSquaddieId: battleSquaddieId,
            })
            BattleActionDecisionStepService.addAction({
                actionDecisionStep: actionStep,
                actionTemplateId: actionNeedsAnAttackRollToDealBodyDamage.id,
            })
            BattleActionDecisionStepService.setConfirmedTarget({
                actionDecisionStep: actionStep,
                targetCoordinate: { q: 0, r: 1 },
            })

            expect(
                CalculatorAttack.calculateMultipleAttackPenaltyForActionsThisTurn(
                    gameEngineState
                )
            ).toBe(-3)
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                actionStep
            const results = ActionCalculator.calculateAndApplyResults({
                battleActionDecisionStep: actionStep,
                missionMap,
                objectRepository,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator,
                missionStatistics: MissionStatisticsService.new({}),
                challengeModifierSetting: ChallengeModifierSettingService.new(),
            })

            const enemy1Changes = getChangesForBattleSquaddie(
                results!,
                enemy1BattleSquaddie
            )

            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes!.damage.net).toBe(actionBodyDamageAmount)
        })

        it("will increment the number of critical hits dealt by the player squaddies in the mission statistics", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: -5,
            }

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
            player1BattleSquaddie.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: -5,
            }

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
                validTargetCoordinate: { q: 0, r: 0 },
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
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: -4,
            }

            const expectedRolls: number[] = [6, 6]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            TraitStatusStorageService.setStatus(
                actionAlwaysHitsAndDealsBodyDamage.actionEffectTemplates[0]
                    .traits,
                Trait.CANNOT_CRITICALLY_SUCCEED,
                true
            )
            const results = dealBodyDamage({
                currentlySelectedAction: actionAlwaysHitsAndDealsBodyDamage,
                numberGenerator,
            })

            const enemy1Changes = getChangesForBattleSquaddie(
                results!,
                enemy1BattleSquaddie
            )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.SUCCESS
            )
            expect(enemy1Changes!.damage.net).toBe(actionBodyDamageAmount)
        })

        it("will critically miss if the roll is 6 points or more under the defender armor", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 4,
            }

            const expectedRolls: number[] = [2, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
            expect(enemy1Changes!.damage.net).toBe(0)
        })

        it("will critically miss if the roll is 1 and 1", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 9001,
            }

            const expectedRolls: number[] = [1, 1]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes = getChangesForBattleSquaddie(
                results!,
                enemy1BattleSquaddie
            )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.CRITICAL_FAILURE
            )
            expect(enemy1Changes!.damage.net).toBe(0)
        })

        it("cannot critically fail if the action is forbidden from critically failing", () => {
            const { battleSquaddie: enemyBattle } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    enemy1DynamicId
                )
            )
            enemyBattle.inBattleAttributes.armyAttributes.armor = {
                proficiencyLevel: ProficiencyLevel.UNTRAINED,
                base: 4,
            }

            const expectedRolls: number[] = [2, 2]
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: expectedRolls })

            TraitStatusStorageService.setStatus(
                actionNeedsAnAttackRollToDealBodyDamage.actionEffectTemplates[0]
                    .traits,
                Trait.CANNOT_CRITICALLY_FAIL,
                true
            )
            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
            })
            const enemy1Changes =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemy1Changes!.actorDegreeOfSuccess).toBe(
                DegreeOfSuccess.FAILURE
            )
            expect(enemy1Changes!.damage.net).toBe(0)
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
                            [Damage.BODY]: 1,
                        },
                    }),
                    ActionEffectTemplateService.new({
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.ATTACK]: true,
                            [Trait.ALWAYS_SUCCEEDS]: true,
                        }),
                        damageDescriptions: {
                            [Damage.BODY]: 2,
                        },
                    }),
                ],
            })
            ObjectRepositoryService.addActionTemplate(
                objectRepository,
                actionHasTwoEffectTemplates
            )

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: player1SquaddieTemplateId,
                squaddieTemplateId: player1DynamicId,
                originMapCoordinate: { q: 0, r: 0 },
            })

            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: enemy1StaticId,
                squaddieTemplateId: enemy1DynamicId,
                originMapCoordinate: { q: 0, r: 1 },
            })
        })

        it("create one result per action template", () => {
            const results = dealBodyDamage({
                currentlySelectedAction: actionHasTwoEffectTemplates,
            })

            expect(results!.changesPerEffect).toHaveLength(2)

            const enemyChangesForFirstTemplate =
                results!.changesPerEffect[0]!.squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemyChangesForFirstTemplate!.damage.net).toBe(1)
            expect(
                enemyChangesForFirstTemplate!.attributesBefore!.currentHitPoints
            ).toEqual(5)
            expect(
                enemyChangesForFirstTemplate!.attributesAfter!.currentHitPoints
            ).toEqual(5 - 1)
            const enemyChangesForSecondTemplate =
                results!.changesPerEffect[1].squaddieChanges!.find(
                    (change) =>
                        change.battleSquaddieId ===
                        enemy1BattleSquaddie.battleSquaddieId
                )
            expect(enemyChangesForSecondTemplate!.damage.net).toBe(2)
            expect(
                enemyChangesForSecondTemplate!.attributesBefore!
                    .currentHitPoints
            ).toEqual(4)
            expect(
                enemyChangesForSecondTemplate!.attributesAfter!.currentHitPoints
            ).toEqual(4 - 2)
        })
    })

    describe("Training Wheels challenge modifier", () => {
        let challengeModifierSetting: ChallengeModifierSetting
        let challengeModifierServiceSpy: MockInstance

        beforeEach(() => {
            challengeModifierSetting = ChallengeModifierSettingService.new()
            ChallengeModifierSettingService.setSetting({
                challengeModifierSetting,
                type: ChallengeModifierEnum.TRAINING_WHEELS,
                value: true,
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: player1SquaddieTemplateId,
                squaddieTemplateId: player1DynamicId,
                originMapCoordinate: { q: 0, r: 0 },
            })
            MissionMapService.addSquaddie({
                missionMap,
                battleSquaddieId: enemy1StaticId,
                squaddieTemplateId: enemy1DynamicId,
                originMapCoordinate: { q: 0, r: 1 },
            })
            challengeModifierSetting = ChallengeModifierSettingService.new()
            ChallengeModifierSettingService.setSetting({
                challengeModifierSetting,
                type: ChallengeModifierEnum.TRAINING_WHEELS,
                value: true,
            })
            challengeModifierServiceSpy = vi.spyOn(
                ChallengeModifierSettingService,
                "preemptDegreeOfSuccessCalculation"
            )
        })

        afterEach(() => {
            challengeModifierServiceSpy.mockRestore()
        })

        it("Uses the Training Wheels override when calculating the results", () => {
            const numberGenerator: StreamNumberGenerator =
                new StreamNumberGenerator({ results: [1, 2] })

            const results = dealBodyDamage({
                currentlySelectedAction:
                    actionNeedsAnAttackRollToDealBodyDamage,
                numberGenerator,
                challengeModifierSetting,
            })

            expect(challengeModifierServiceSpy).toHaveBeenCalled()

            const changes = results!.changesPerEffect
            expect(changes).not.toBeUndefined()
            if (changes != undefined) {
                expect(
                    changes[0].squaddieChanges?.[0]!.actorDegreeOfSuccess
                ).toEqual(DegreeOfSuccess.CRITICAL_SUCCESS)
            }
        })
    })
})

const setArmorClass = ({
    battleSquaddie,
    desiredArmorClass,
}: {
    battleSquaddie: BattleSquaddie
    desiredArmorClass: number
}) => {
    battleSquaddie.inBattleAttributes.armyAttributes.armor = {
        proficiencyLevel: ProficiencyLevel.NOVICE,
        base: desiredArmorClass - 1,
    }
}

const setAttackBonusVersusArmor = (desiredAttackBonus: number) => ({
    tier: desiredAttackBonus - 1,
    versusProficiencyLevels: {
        [VersusSquaddieResistance.ARMOR]: ProficiencyLevel.NOVICE,
    },
})

const getChangesForBattleSquaddie = (
    results: CalculatedResult,
    battleSquaddie: BattleSquaddie
) => {
    return results!.changesPerEffect[0]!.squaddieChanges!.find(
        (change) => change.battleSquaddieId === battleSquaddie.battleSquaddieId
    )
}
