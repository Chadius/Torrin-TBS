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
import {ProcessedActionEndTurnEffectService} from "../../action/processed/processedActionEndTurnEffect";
import {DecidedActionEndTurnEffectService} from "../../action/decided/decidedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../../action/template/actionEffectEndTurnTemplate";
import {ProcessedActionMovementEffectService} from "../../action/processed/processedActionMovementEffect";
import {
    DecidedActionMovementEffect,
    DecidedActionMovementEffectService
} from "../../action/decided/decidedActionMovementEffect";
import {DecidedAction, DecidedActionService} from "../../action/decided/decidedAction";
import {ActionEffectMovementTemplateService} from "../../action/template/actionEffectMovementTemplate";

describe('Actions This Round', () => {
    it('can create object with actor Id, starting location and a previewTemplateId', () => {
        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: "soldier",
            startingLocation: {q: 0, r: 0},
            previewedActionTemplateId: "consider using this action",
        });

        expect(actionsThisRound.battleSquaddieId).toEqual("soldier");
        expect(actionsThisRound.startingLocation).toEqual({q: 0, r: 0});
        expect(actionsThisRound.processedActions).toHaveLength(0);
        expect(actionsThisRound.previewedActionTemplateId).toEqual("consider using this action");
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
        it('will throw an error if previewed template and processed actions are missing', () => {
            expect(() => {
                ActionsThisRoundService.new({
                    battleSquaddieId: "soldier",
                    startingLocation: {q: 0, r: 0},
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
                previewedActionTemplateId: "previewing the first attack",
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(noActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will not apply MAP if the attack was decided but not processed', () => {
            const attack = ActionsThisRoundService.new({
                battleSquaddieId: "soldier",
                startingLocation: {q: 0, r: 0},
                processedActions:
                    [
                        ProcessedActionService.new({
                            decidedAction: DecidedActionService.new({
                                actionPointCost: 1,
                                battleSquaddieId: "soldier",
                                actionTemplateName: "Attack",
                                actionTemplateId: "id",
                                actionEffects: [
                                    DecidedActionSquaddieEffectService.new({
                                        template: ActionEffectSquaddieTemplateService.new({
                                            maximumRange: 1,
                                            damageDescriptions: {[DamageType.BODY]: 2},
                                            traits: TraitStatusStorageService.newUsingTraitValues({[Trait.ATTACK]: true})
                                        })
                                    })
                                ],
                            }),
                            processedActionEffects: []
                        }),
                    ],
            });
            expect(ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(attack)).toEqual({
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

    describe('getProcessedActionEffectToShow and getProcessedActionToShow', () => {
        it('returns undefined if there is no action', () => {
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(undefined)).toBeUndefined();
            expect(ActionsThisRoundService.getProcessedActionToShow(undefined)).toBeUndefined();
        });

        it('returns undefined if there are no processed actions', () => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                startingLocation: {q: 0, r: 0},
                previewedActionTemplateId: "previewing the first attack",
            });

            expect(ActionsThisRoundService.getProcessedActionEffectToShow(actionsThisRound)).toBeUndefined();
            expect(ActionsThisRoundService.getProcessedActionToShow(actionsThisRound)).toBeUndefined();
        });

        it('returns undefined if there are no processed action effects', () => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                startingLocation: {q: 0, r: 0},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: undefined,
                        processedActionEffects: []
                    })
                ]
            });

            expect(ActionsThisRoundService.getProcessedActionEffectToShow(actionsThisRound)).toBeUndefined();
            expect(ActionsThisRoundService.getProcessedActionToShow(actionsThisRound)).toBeUndefined();
        });

        it('returns the first processed action effect when it has never been called before', () => {
            const endTurnEffect = ProcessedActionEndTurnEffectService.new({
                decidedActionEffect: DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({}),
                }),
            })

            const processedAction = ProcessedActionService.new({
                decidedAction: undefined,
                processedActionEffects: [
                    endTurnEffect
                ]
            });
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                startingLocation: {q: 0, r: 0},
                processedActions: [
                    processedAction
                ]
            });

            expect(ActionsThisRoundService.getProcessedActionEffectToShow(actionsThisRound)).toEqual(endTurnEffect);
            expect(ActionsThisRoundService.getProcessedActionToShow(actionsThisRound)).toEqual(processedAction);
        });

        it('can advance and iterate the next processed action effect to show', () => {
            const moveTurnEffect = ProcessedActionMovementEffectService.new({
                decidedActionEffect: DecidedActionMovementEffectService.new({
                    template: undefined,
                    destination: {q: 0, r: 1},
                }),
            })

            const endTurnEffect = ProcessedActionEndTurnEffectService.new({
                decidedActionEffect: DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({}),
                }),
            })

            const processedAction = ProcessedActionService.new({
                decidedAction: undefined,
                processedActionEffects: [
                    moveTurnEffect,
                    endTurnEffect
                ]
            });
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                startingLocation: {q: 0, r: 0},
                processedActions: [
                    processedAction
                ]
            });

            expect(ActionsThisRoundService.getProcessedActionEffectToShow(actionsThisRound)).toEqual(moveTurnEffect);
            expect(ActionsThisRoundService.getProcessedActionToShow(actionsThisRound)).toEqual(processedAction);
            ActionsThisRoundService.nextProcessedActionEffectToShow(actionsThisRound);
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(actionsThisRound)).toEqual(endTurnEffect);
            expect(ActionsThisRoundService.getProcessedActionToShow(actionsThisRound)).toEqual(processedAction);
        });

        it('will return undefined if it iterates past all actions', () => {
            const endTurnEffect = ProcessedActionEndTurnEffectService.new({
                decidedActionEffect: DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({}),
                }),
            })

            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                startingLocation: {q: 0, r: 0},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction: undefined,
                        processedActionEffects: [
                            endTurnEffect
                        ]
                    })
                ]
            });
            ActionsThisRoundService.nextProcessedActionEffectToShow(actionsThisRound);
            expect(ActionsThisRoundService.getProcessedActionEffectToShow(actionsThisRound)).toBeUndefined();
            expect(ActionsThisRoundService.getProcessedActionToShow(actionsThisRound)).toBeUndefined();
        });
    });

    describe('getDecidedButNotProcessedActionEffect', () => {
        let decidedActionMovementEffect: DecidedActionMovementEffect;
        let decidedAction: DecidedAction;

        beforeEach(() => {
            decidedActionMovementEffect = DecidedActionMovementEffectService.new({
                template: ActionEffectMovementTemplateService.new({}),
            });
            decidedAction = DecidedActionService.new({
                battleSquaddieId: "battleSquaddieId",
                actionTemplateName: "End Turn",
                actionEffects: [
                    decidedActionMovementEffect
                ]
            });
        });

        it('returns undefined objects if there is no actionThisRound', () => {
            expect(ActionsThisRoundService.getDecidedButNotProcessedActionEffect(undefined)).toEqual({
                processedAction: undefined,
                decidedActionEffect: undefined,
            });
        });
        it('returns undefined objects if no decisions have been made', () => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                startingLocation: {q: 0, r: 0},
                previewedActionTemplateId: "previewing the first attack",
            });
            expect(ActionsThisRoundService.getDecidedButNotProcessedActionEffect(actionsThisRound)).toEqual({
                processedAction: undefined,
                decidedActionEffect: undefined,
            });
        });
        it('returns undefined objects if all decisions have been processed', () => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                startingLocation: {q: 0, r: 0},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction,
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect: decidedActionMovementEffect,
                            })
                        ]
                    }),
                    ProcessedActionService.new({
                        decidedAction,
                        processedActionEffects: [
                            ProcessedActionMovementEffectService.new({
                                decidedActionEffect: decidedActionMovementEffect,
                            })
                        ]
                    }),
                ]
            });

            expect(ActionsThisRoundService.getDecidedButNotProcessedActionEffect(actionsThisRound)).toEqual({
                processedAction: undefined,
                decidedActionEffect: undefined,
            });
        });
        it('returns first decision that has not been processed and its containing processed action', () => {
            const decidedButNotProcessedAction = ProcessedActionService.new({
                decidedAction,
                processedActionEffects: []
            });
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                startingLocation: {q: 0, r: 0},
                processedActions: [
                    ProcessedActionService.new({
                        decidedAction,
                        processedActionEffects: []
                    }),
                    decidedButNotProcessedAction,
                ]
            });

            expect(ActionsThisRoundService.getDecidedButNotProcessedActionEffect(actionsThisRound)).toEqual({
                processedAction: decidedButNotProcessedAction,
                decidedActionEffect: decidedActionMovementEffect,
            });
        });
    });
});
