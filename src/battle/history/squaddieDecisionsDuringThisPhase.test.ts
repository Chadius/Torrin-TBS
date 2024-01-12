import {TargetingShape} from "../targeting/targetingShapeGenerator";
import {DamageType} from "../../squaddie/squaddieService";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {ActionEffectType} from "../../decision/actionEffect";
import {SquaddieActionsForThisRoundService, SquaddieDecisionsDuringThisPhase} from "./squaddieDecisionsDuringThisPhase";
import {ActionEffectMovement, ActionEffectMovementService} from "../../decision/actionEffectMovement";
import {DecisionService} from "../../decision/decision";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";

describe('squaddie decisions for this phase', () => {
    let attackActionEffectTemplate: ActionEffectSquaddieTemplate;
    let notAnAttackActionEffectTemplate: ActionEffectSquaddieTemplate;
    let attackActionEffectTemplateWithoutMAP: ActionEffectSquaddieTemplate;

    beforeEach(() => {
        attackActionEffectTemplate = ActionEffectSquaddieTemplateService.new({
            id: "attackAction",
            name: "Attack Action",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        });
        notAnAttackActionEffectTemplate = ActionEffectSquaddieTemplateService.new({
            id: "notAnAttackAction",
            name: "Not An Attack Action",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: false,
            })
        });
        attackActionEffectTemplateWithoutMAP = ActionEffectSquaddieTemplateService.new({
            id: "attackActionWithoutMAP",
            name: "Attack Action without MAP",
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
                [Trait.NO_MULTIPLE_ATTACK_PENALTY]: true,
            })
        });
    });

    it('can create new object from squaddie data', () => {
        const squaddieActionData: ActionEffectSquaddieTemplate = {
            id: "attackId",
            name: "cool attack",
            minimumRange: 0,
            maximumRange: 1,
            targetingShape: TargetingShape.SNAKE,
            damageDescriptions: {[DamageType.MIND]: 1},
            healingDescriptions: {},
            traits: {booleanTraits: {[Trait.ATTACK]: true}},
            actionPointCost: 1,
        };

        const actionsForThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "template id",
            battleSquaddieId: "battle id",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectMovementService.new({
                            destination: {q: 0, r: 3},
                            numberOfActionPointsSpent: 1,
                        })
                    ]
                }),
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            template: squaddieActionData,
                            numberOfActionPointsSpent: 1,
                            targetLocation: {q: 0, r: 2},
                        })
                    ]
                }),
                DecisionService.new({
                    actionEffects: [
                        ActionEffectEndTurnService.new()
                    ]
                }),
            ],
        });

        const newActionForThisRound: SquaddieDecisionsDuringThisPhase = {...actionsForThisRound};
        expect(newActionForThisRound.battleSquaddieId).toStrictEqual(actionsForThisRound.battleSquaddieId);
        expect(newActionForThisRound.squaddieTemplateId).toStrictEqual(actionsForThisRound.squaddieTemplateId);
        expect(newActionForThisRound.startingLocation).toStrictEqual(actionsForThisRound.startingLocation);
        expect(newActionForThisRound.decisions).toStrictEqual(actionsForThisRound.decisions);
    });

    it('can add starting location', () => {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: undefined,
        });

        SquaddieActionsForThisRoundService.addStartingLocation(instruction, {q: 0, r: 0});
        expect(instruction.startingLocation).toStrictEqual({q: 0, r: 0});
    });

    it('will throw an error if a starting location is added a second time', () => {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });

        const shouldThrowError = () => {
            SquaddieActionsForThisRoundService.addStartingLocation(instruction, {q: 0, r: 0});
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("already has starting location (0, 0)");
    });

    it('can add movement action and its results', () => {
        const instruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
        });
        SquaddieActionsForThisRoundService.addDecision(instruction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectMovementService.new({
                        destination: {
                            q: 1,
                            r: 2,
                        },
                        numberOfActionPointsSpent: 2,
                    })
                ]
            })
        );

        const actionsAfterOneMovement = instruction.decisions;
        expect(actionsAfterOneMovement).toHaveLength(1);

        expect(actionsAfterOneMovement[0].actionEffects[0].type).toBe(ActionEffectType.MOVEMENT);
        const moveAction: ActionEffectMovement = actionsAfterOneMovement[0].actionEffects[0] as ActionEffectMovement;
        expect(moveAction.destination).toStrictEqual({q: 1, r: 2});
        expect(moveAction.numberOfActionPointsSpent).toBe(2);

        SquaddieActionsForThisRoundService.addDecision(instruction,
            DecisionService.new({
                actionEffects: [
                    ActionEffectMovementService.new({
                        destination: {
                            q: 2,
                            r: 2,
                        },
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }));

        expect(instruction.decisions).toHaveLength(2);
    });

    describe('can calculate multiple attack penalty', () => {
        it('will not apply MAP when there are no actions', () => {
            const noActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                startingLocation: {q: 0, r: 0},
            })

            expect(SquaddieActionsForThisRoundService.currentMultipleAttackPenalty(noActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will not increase MAP if the action is not an attack', () => {
            const noAttackActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: notAnAttackActionEffectTemplate
                            })
                        ]
                    }),
                ],
                startingLocation: {q: 0, r: 0},
            })

            expect(SquaddieActionsForThisRoundService.currentMultipleAttackPenalty(noAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 0 for executing the first attack', () => {
            const oneAttackActionThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                ],
                startingLocation: {q: 0, r: 0},
            })

            expect(SquaddieActionsForThisRoundService.currentMultipleAttackPenalty(oneAttackActionThisRound)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will not increase MAP if the attack has the trait', () => {
            const oneAttackActionThisRoundWithoutMAP: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplateWithoutMAP,
                            })
                        ]
                    }),
                ],
                startingLocation: {q: 0, r: 0},
            })

            expect(SquaddieActionsForThisRoundService.currentMultipleAttackPenalty(oneAttackActionThisRoundWithoutMAP)).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 1 for executing the second attack', () => {
            const twoAttackActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                ],
                startingLocation: {q: 0, r: 0},
            })

            expect(SquaddieActionsForThisRoundService.currentMultipleAttackPenalty(twoAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 1,
                multipleAttackPenalty: -3,
            });
        });
        it('will set MAP multiplier to 2 for executing the third attack', () => {
            const threeAttackActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                ],
                startingLocation: {q: 0, r: 0},
            })

            expect(SquaddieActionsForThisRoundService.currentMultipleAttackPenalty(threeAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
        it('will set MAP multiplier to 2 for executing more than 3 attacks', () => {
            const threeAttackActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                ],
                startingLocation: {q: 0, r: 0},
            })

            expect(SquaddieActionsForThisRoundService.currentMultipleAttackPenalty(threeAttackActionsThisRound)).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });

        it('will set MAP multiplier to 0 for previewing the first attack', () => {
            const oneAttackActionThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                startingLocation: {q: 0, r: 0},
            });

            expect(SquaddieActionsForThisRoundService.previewMultipleAttackPenalty(
                oneAttackActionThisRound,
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            numberOfActionPointsSpent: 1,
                            targetLocation: {q: 0, r: 0},
                            template: attackActionEffectTemplate,
                        })
                    ]
                })
            )).toEqual({
                penaltyMultiplier: 0,
                multipleAttackPenalty: 0,
            });
        });
        it('will set MAP multiplier to 1 for previewing the second attack', () => {
            const twoAttackActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                ],

                startingLocation: {q: 0, r: 0},
            });

            expect(SquaddieActionsForThisRoundService.previewMultipleAttackPenalty(
                twoAttackActionsThisRound,
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            numberOfActionPointsSpent: 1,
                            targetLocation: {q: 0, r: 0},
                            template: attackActionEffectTemplate,
                        })
                    ]
                })
            )).toEqual({
                penaltyMultiplier: 1,
                multipleAttackPenalty: -3,
            });
        });
        it('will set MAP multiplier to 2 for previewing the third attack', () => {
            const threeAttackActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                ],
                startingLocation: {q: 0, r: 0},
            });

            expect(SquaddieActionsForThisRoundService.previewMultipleAttackPenalty(
                threeAttackActionsThisRound,
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            numberOfActionPointsSpent: 1,
                            targetLocation: {q: 0, r: 0},
                            template: attackActionEffectTemplate,
                        })
                    ]
                })
            )).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
        it('will set MAP multiplier to 2 for previewing more than 3 attacks', () => {
            const threeAttackActionsThisRound: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
                battleSquaddieId: "battle squaddie",
                squaddieTemplateId: "squaddie template",
                startingLocation: {q: 0, r: 0},
                decisions: [
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,

                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                    DecisionService.new({
                        actionEffects: [
                            ActionEffectSquaddieService.new({
                                numberOfActionPointsSpent: 1,
                                targetLocation: {q: 0, r: 0},
                                template: attackActionEffectTemplate,
                            })
                        ]
                    }),
                ],
            })

            expect(SquaddieActionsForThisRoundService.previewMultipleAttackPenalty(
                threeAttackActionsThisRound,
                DecisionService.new({
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            numberOfActionPointsSpent: 1,
                            targetLocation: {q: 0, r: 0},
                            template: attackActionEffectTemplate,
                        })
                    ]
                })
            )).toEqual({
                penaltyMultiplier: 2,
                multipleAttackPenalty: -6,
            });
        });
    });

    it('knows when one of its decisions will end the turn', () => {
        const noDecisionsWIllNotEndTurn: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            decisions: []
        });

        expect(SquaddieActionsForThisRoundService.willAnyDecisionEndTurn(noDecisionsWIllNotEndTurn)).toBeFalsy();

        const willEndTheTurn: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new static squaddie",
            battleSquaddieId: "new dynamic squaddie",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectEndTurnService.new()
                    ]
                })
            ]
        });

        expect(SquaddieActionsForThisRoundService.willAnyDecisionEndTurn(willEndTheTurn)).toBeTruthy();
    });
});
