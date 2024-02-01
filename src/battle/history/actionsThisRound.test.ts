import {ActionsThisRoundService} from "./actionsThisRound";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {ActionEffectSquaddieTemplateService} from "../../action/template/actionEffectSquaddieTemplate";
import {DamageType, HealingType} from "../../squaddie/squaddieService";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {DecidedActionSquaddieEffectService} from "../../action/decided/decidedActionSquaddieEffect";
import {ProcessedActionSquaddieEffectService} from "../../action/processed/processedActionSquaddieEffect";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {SquaddieTemplate, SquaddieTemplateService} from "../../campaign/squaddieTemplate";
import {SquaddieIdService} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ActionTemplateService} from "../../action/template/actionTemplate";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";

describe('Actions This Round', () => {
    it('can create object with actor Id and starting location', () => {
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: "soldier",
            startingLocation: {q: 0, r: 0},
        });

        expect(actionsThisRound.battleSquaddieId).toEqual("soldier");
        expect(actionsThisRound.startingLocation).toEqual({q: 0, r: 0});
        expect(actionsThisRound.processedActions).toHaveLength(0);
        expect(actionsThisRound.currentActionTemplateId).toBeUndefined();
    });

    describe('sanitize', () => {
        it('will throw an error if there is no battle squaddie id', () => {
            expect(() => {
                ActionsThisRoundService.new({
                    battleSquaddieId: undefined,
                    startingLocation: {q: 0, r: 0},
                });
            }).toThrow("cannot sanitize");
        });
        it('will throw an error if there is no starting location', () => {
            expect(() => {
                ActionsThisRoundService.new({
                    battleSquaddieId: "soldier",
                    startingLocation: undefined,
                });
            }).toThrow("cannot sanitize");
        });
    });

    describe('can calculate multiple attack penalty', () => {
        let repository: ObjectRepository;
        let battleSquaddie: BattleSquaddie;
        let squaddieTemplate: SquaddieTemplate;
        beforeEach(() => {
            repository = ObjectRepositoryService.new();
            squaddieTemplate = SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    templateId: "soldier template",
                    name: "soldier",
                    affiliation: SquaddieAffiliation.PLAYER
                }),
                actionTemplates: [
                    ActionTemplateService.new({
                        id: "attack",
                        name: "attack",
                        actionEffectTemplates: [
                            ActionEffectSquaddieTemplateService.new({
                                maximumRange: 1,
                                damageDescriptions: {[DamageType.BODY]: 2},
                                traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                            })
                        ]
                    })
                ]
            });
            ObjectRepositoryService.addSquaddieTemplate(repository, squaddieTemplate);
            battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "soldier",
                squaddieTemplateId: "soldier template",
            });
            ObjectRepositoryService.addBattleSquaddie(repository, battleSquaddie);
        })

        it('will not apply MAP when there are no processed actions', () => {
            const noActionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(noActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 1 after processing the first attack', () => {
            const attack = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
                processedActions:
                    [
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                })
                            ]
                        }),
                    ],
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(attack)).toEqual({
                penaltyMultiplier: 1,
                multipleAttackPenalty: -3,
            });
        });
        it('will not increase MAP if the action is not an attack', () => {
            const noAttackActionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
                processedActions:
                    [
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            healingDescriptions: {[HealingType.LOST_HIT_POINTS]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({})
                                        })
                                    })
                                })
                            ]
                        }),
                    ],
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(noAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 2 after processing the second attack', () => {
            const attack = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
                processedActions:
                    [
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                })
                            ]
                        }),
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                })
                            ]
                        }),
                    ],
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(attack)).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
        it('will not increase MAP if the attack has the trait that ignores MAP', () => {
            const attack = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
                processedActions:
                    [
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                })
                            ]
                        }),
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({
                                                [Trait.ATTACK]: true,
                                                [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
                                            })
                                        })
                                    })
                                })
                            ]
                        }),
                    ],
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(attack)).toEqual({
                penaltyMultiplier: 1,
                multipleAttackPenalty: -3,
            });
        });
        it('will cap MAP multiplier to maximum', () => {
            const attack = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
                processedActions:
                    [
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                })
                            ]
                        }),
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                })
                            ]
                        }),
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionSquaddieEffectService.new({
                                    results: undefined,
                                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                })
                            ]
                        }),
                    ],
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(attack)).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
    });
});
