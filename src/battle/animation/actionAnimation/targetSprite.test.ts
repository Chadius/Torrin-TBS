import {ActionResultPerSquaddie, ActionResultPerSquaddieService} from "../../history/actionResultPerSquaddie";
import {ObjectRepository, ObjectRepositoryHelper} from "../../objectRepository";
import {CreateNewSquaddieAndAddToRepository} from "../../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {TargetSprite} from "./targetSprite";
import {ActionTimer} from "./actionTimer";
import {ActionAnimationPhase, SquaddieEmotion} from "./actionAnimationConstants";
import {getResultOrThrowError} from "../../../utils/ResultOrError";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {SquaddieSprite} from "./squaddieSprite";
import {CreateNewSquaddieMovementWithTraits} from "../../../squaddie/movement";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../../squaddie/action";
import {DamageType, HealingType} from "../../../squaddie/squaddieService";
import {TraitStatusStorageHelper} from "../../../trait/traitStatusStorage";
import {DegreeOfSuccess} from "../../actionCalculator/degreeOfSuccess";

describe('Target Sprite', () => {
    let resultTookDamage: ActionResultPerSquaddie;
    let resultTookLethalDamage: ActionResultPerSquaddie;
    let resultMissed: ActionResultPerSquaddie;
    let resultDealsNoDamage: ActionResultPerSquaddie;
    let resultHealsSquaddie: ActionResultPerSquaddie;

    let hinderingAction: SquaddieSquaddieAction;
    let helpfulAction: SquaddieSquaddieAction;

    let squaddieRepository: ObjectRepository;
    let timer: ActionTimer;
    const battleSquaddieId = "target0";
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);

        squaddieRepository = ObjectRepositoryHelper.new();
        CreateNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ALLY,
            attributes: {
                maxHitPoints: 5,
                movement: CreateNewSquaddieMovementWithTraits({movementPerAction: 2}),
                armorClass: 0,
            },
            battleId: battleSquaddieId,
            name: "Target",
            squaddieRepository,
            templateId: "target"
        });

        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));

        resultTookDamage = ActionResultPerSquaddieService.new({
            damageTaken: 1,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
        });
        resultTookLethalDamage = ActionResultPerSquaddieService.new({
            damageTaken: squaddieTemplate.attributes.maxHitPoints,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
        });
        resultMissed = ActionResultPerSquaddieService.new({
            damageTaken: 0,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.FAILURE
        });
        resultDealsNoDamage = ActionResultPerSquaddieService.new({
            damageTaken: 0,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
        });
        resultHealsSquaddie = ActionResultPerSquaddieService.new({
            damageTaken: 0,
            healingReceived: 1,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
        });

        hinderingAction = SquaddieSquaddieActionService.new({
            id: "hindering",
            name: "hindering",
            damageDescriptions: {
                [DamageType.BODY]: 1,
            },
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                ATTACK: true
            }),
        });

        helpfulAction = SquaddieSquaddieActionService.new({
            id: "helping",
            name: "helping",
            healingDescriptions: {
                [HealingType.LOST_HIT_POINTS]: 1,
            },
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                HEALING: true
            }),
        });

        timer = new ActionTimer();
        timer.start();

        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });


    it('uses helper function to determine the emotion', () => {
        const sprite = new TargetSprite();
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.BEFORE_ACTION);
        jest.spyOn(SquaddieSprite.prototype, "beginLoadingActorImages").mockReturnValue();
        jest.spyOn(SquaddieSprite.prototype, "createActorImagesWithLoadedData").mockReturnValue({justCreatedImages: false});
        const getSquaddieEmotionSpy = jest.spyOn(sprite, "getSquaddieEmotion").mockReturnValue(SquaddieEmotion.NEUTRAL);

        sprite.start({
            action: undefined,
            resourceHandler: undefined,
            result: resultTookDamage,
            squaddieRepository,
            targetBattleSquaddieId: battleSquaddieId,
            startingPosition: 0,
        });

        sprite.draw(timer, mockedP5GraphicsContext, SquaddieSquaddieActionService.new({
            id: "attack",
            name: "attack",
            minimumRange: 0,
            maximumRange: 1,
        }), resultTookDamage);

        expect(getSquaddieEmotionSpy).toBeCalled();
        expect(getterSpy).toBeCalled();
    });

    function mockActionTimerPhase(actionAnimationPhase: ActionAnimationPhase) {
        return jest.spyOn(timer, "currentPhase", "get").mockReturnValue(actionAnimationPhase);
    }

    it('starts with a NEUTRAL emotion if the attack has not started', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.BEFORE_ACTION);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookDamage,
            action: hinderingAction,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });
    it('starts with a TARGETED emotion if the effect is damaging and the attack just started', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.DURING_ACTION);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookDamage,
            action: hinderingAction,
        });

        expect(emotion).toBe(SquaddieEmotion.TARGETED);
        expect(getterSpy).toBeCalled();
    });
    it('transitions to DAMAGED when the attack hits and the squaddie survives', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookDamage,
            action: hinderingAction,
        });

        expect(emotion).toBe(SquaddieEmotion.DAMAGED);
        expect(getterSpy).toBeCalled();
    });
    it('transitions to DEAD if it kills the target', () => {
        const {battleSquaddie} = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepository, battleSquaddieId));
        battleSquaddie.inBattleAttributes.currentHitPoints = 0;

        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookLethalDamage,
            action: hinderingAction,
        });

        expect(emotion).toBe(SquaddieEmotion.DEAD);
        expect(getterSpy).toBeCalled();
    });
    it('transition to NEUTRAL when the attack misses', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultMissed,
            action: hinderingAction,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });
    it('transition to NEUTRAL when the attack deals no damage', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultDealsNoDamage,
            action: hinderingAction,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });

    it('starts with a NEUTRAL emotion if the action is Helpful', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.DURING_ACTION);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultHealsSquaddie,
            action: helpfulAction,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });
    it('transitions to a THANKFUL emotion if the result helps the target', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultHealsSquaddie,
            action: helpfulAction,
        });

        expect(emotion).toBe(SquaddieEmotion.THANKFUL);
        expect(getterSpy).toBeCalled();
    });

    describe('should keep the same emotion in TARGET_REACTS, SHOWING_RESULTS and FINISHED_SHOWING_RESULTS', () => {
        let mapping: {
            [name: string]: {
                result: ActionResultPerSquaddie,
                action: SquaddieSquaddieAction
            }
        };

        const tests: {
            name: string
        }[] = [
            {
                name: 'deals nonlethal damage',
            },
            {
                name: 'deals lethal damage',
            },
            {
                name: 'heals damage',
            },
        ]

        beforeEach(() => {
            mapping = {
                'deals nonlethal damage': {
                    result: resultTookDamage,
                    action: hinderingAction
                },
                'deals lethal damage': {
                    result: resultTookLethalDamage,
                    action: hinderingAction,
                },
                'heals damage': {
                    result: resultHealsSquaddie,
                    action: helpfulAction,
                },
            }
        })

        it.each(tests)(`$name will show the same emotion`, ({
                                                                name
                                                            }) => {
            const result = mapping[name].result;
            const action = mapping[name].action;
            const sprite = new TargetSprite();
            mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
            const targetReactsEmotion = sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                result,
                action,
            });

            const showingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                result,
                action,
            })).toBe(targetReactsEmotion);
            expect(showingResultsSpy).toBeCalled();

            const finishedShowingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                result,
                action,
            })).toBe(targetReactsEmotion);
            expect(finishedShowingResultsSpy).toBeCalled();
        });
    });
});
