import {ActionResultPerSquaddie, DegreeOfSuccess} from "../../history/actionResultPerSquaddie";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {CreateNewSquaddieAndAddToRepository} from "../../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {TargetSprite} from "./targetSprite";
import {ActionTimer} from "./actionTimer";
import {ActionAnimationPhase, SquaddieEmotion} from "./actionAnimationConstants";
import {getResultOrThrowError} from "../../../utils/ResultOrError";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {SquaddieSprite} from "./squaddieSprite";
import {CreateNewSquaddieMovementWithTraits} from "../../../squaddie/movement";
import {SquaddieActionHandler} from "../../../squaddie/action";

describe('Target Sprite', () => {
    let resultTookDamage: ActionResultPerSquaddie;
    let resultTookLethalDamage: ActionResultPerSquaddie;
    let resultMissed: ActionResultPerSquaddie;
    let resultDealsNoDamage: ActionResultPerSquaddie;
    let squaddieRepository: BattleSquaddieRepository;
    let timer: ActionTimer;
    const battleSquaddieId = "target0";
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);

        squaddieRepository = new BattleSquaddieRepository();
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

        const {squaddieTemplate} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));

        resultTookDamage = {damageTaken: 1, healingReceived: 0, actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS};
        resultTookLethalDamage = {
            damageTaken: squaddieTemplate.attributes.maxHitPoints,
            healingReceived: 0,
            actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
        };
        resultMissed = {damageTaken: 0, healingReceived: 0, actorDegreeOfSuccess: DegreeOfSuccess.FAILURE};
        resultDealsNoDamage = {damageTaken: 0, healingReceived: 0, actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS};

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

        sprite.draw(timer, mockedP5GraphicsContext, SquaddieActionHandler.new({}), resultTookDamage);

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
        });

        expect(emotion).toBe(SquaddieEmotion.TARGETED);
        expect(getterSpy).toBeCalled();
    });
    it('transitions to DAMAGED when it hits', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookDamage,
        });

        expect(emotion).toBe(SquaddieEmotion.DAMAGED);
        expect(getterSpy).toBeCalled();
    });
    it('transitions to DEAD if it kills the target', () => {
        const {battleSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByBattleId(battleSquaddieId));
        battleSquaddie.inBattleAttributes.currentHitPoints = 0;

        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultTookLethalDamage,
        });

        expect(emotion).toBe(SquaddieEmotion.DEAD);
        expect(getterSpy).toBeCalled();
    });
    it('transition to neutral when the attack misses', () => {
        // const stillAliveSpy = jest.spyOn(squaddieService, "IsSquaddieAlive").mockReturnValue(true);
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultMissed,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });
    it('transition to neutral when the attack deals no damage', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            battleSquaddieId,
            squaddieRepository,
            result: resultDealsNoDamage,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });

    describe('should keep the same emotion in TARGET_REACTS, SHOWING_RESULTS and FINISHED_SHOWING_RESULTS', () => {
        let mapping: { [name: string]: ActionResultPerSquaddie };

        const tests: {
            name: string
        }[] = [
            {
                name: 'deals nonlethal damage',
            },
            {
                name: 'deals lethal damage',
            }
        ]

        beforeEach(() => {
            mapping = {
                'deals nonlethal damage': resultTookDamage,
                'deals lethal damage': resultTookLethalDamage,
            }
        })

        it.each(tests)(`$name will show the same emotion`, ({
                                                                name
                                                            }) => {
            const result = mapping[name];
            const sprite = new TargetSprite();
            mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
            const targetReactsEmotion = sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                result,
            });

            const showingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                result,
            })).toBe(targetReactsEmotion);
            expect(showingResultsSpy).toBeCalled();

            const finishedShowingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
                result,
            })).toBe(targetReactsEmotion);
            expect(finishedShowingResultsSpy).toBeCalled();
        });
    });
});
