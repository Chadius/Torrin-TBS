import {ActivityResultOnSquaddie} from "../../history/activityResultOnSquaddie";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {CreateNewSquaddieAndAddToRepository} from "../../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {ArmyAttributes} from "../../../squaddie/armyAttributes";
import {TargetSprite} from "./targetSprite";
import {ActionTimer} from "./actionTimer";
import {ActionAnimationPhase, SquaddieEmotion} from "./actionAnimationConstants";
import {getResultOrThrowError} from "../../../utils/ResultOrError";
import * as squaddieService from "../../../squaddie/squaddieService";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {RectArea} from "../../../ui/rectArea";
import {SquaddieSprite} from "./squaddieSprite";

describe('Target Sprite', () => {
    let resultTookDamage: ActivityResultOnSquaddie;
    let resultTookLethalDamage: ActivityResultOnSquaddie;
    let squaddieRepository: BattleSquaddieRepository;
    let timer: ActionTimer;
    const dynamicSquaddieId = "target0";
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);

        squaddieRepository = new BattleSquaddieRepository();
        CreateNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ALLY,
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            }),
            dynamicId: dynamicSquaddieId,
            name: "Target",
            squaddieRepository,
            staticId: "target"
        });

        const {staticSquaddie} = getResultOrThrowError(squaddieRepository.getSquaddieByDynamicId(dynamicSquaddieId));

        resultTookDamage = new ActivityResultOnSquaddie({damageTaken: 1});
        resultTookLethalDamage = new ActivityResultOnSquaddie({damageTaken: staticSquaddie.attributes.maxHitPoints});

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
            activity: undefined,
            resourceHandler: undefined,
            result: resultTookDamage,
            squaddieRepository,
            targetDynamicSquaddieId: dynamicSquaddieId,
            windowArea: new RectArea({top: 0, left: 0, width: 10, height: 20})
        });

        sprite.draw(timer, mockedP5GraphicsContext);

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
            dynamicSquaddieId,
            squaddieRepository,
            activityResult: resultTookDamage,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });
    it('starts with a TARGETED emotion if the effect is damaging and the attack just started', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.DURING_ACTION);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            dynamicSquaddieId,
            squaddieRepository,
            activityResult: resultTookDamage,
        });

        expect(emotion).toBe(SquaddieEmotion.TARGETED);
        expect(getterSpy).toBeCalled();
    });
    it('transitions to DAMAGED when it hits', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            dynamicSquaddieId,
            squaddieRepository,
            activityResult: resultTookDamage,
        });

        expect(emotion).toBe(SquaddieEmotion.DAMAGED);
        expect(getterSpy).toBeCalled();
    });
    it('transitions to DEAD if it kills the target', () => {
        const stillAliveSpy = jest.spyOn(squaddieService, "IsSquaddieAlive").mockReturnValue(false);
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
        const sprite = new TargetSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            dynamicSquaddieId,
            squaddieRepository,
            activityResult: resultTookLethalDamage,
        });

        expect(emotion).toBe(SquaddieEmotion.DEAD);
        expect(getterSpy).toBeCalled();
        expect(stillAliveSpy).toBeCalled();
    });
    describe('should keep the same emotion in TARGET_REACTS, SHOWING_RESULTS and FINISHED_SHOWING_RESULTS', () => {
        const tests = [
            {
                name: 'deals nonlethal damage',
                activityResult: resultTookDamage,
            },
            {
                name: 'deals lethal damage',
                activityResult: resultTookLethalDamage,
            }
        ]
        it.each(tests)(`$name will show the same emotion`, ({
                                                                name,
                                                                activityResult,
                                                            }) => {
            const sprite = new TargetSprite();
            mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
            const targetReactsEmotion = sprite.getSquaddieEmotion({
                timer,
                dynamicSquaddieId,
                squaddieRepository,
                activityResult,
            });

            const showingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                dynamicSquaddieId,
                squaddieRepository,
                activityResult,
            })).toBe(targetReactsEmotion);
            expect(showingResultsSpy).toBeCalled();

            const finishedShowingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                dynamicSquaddieId,
                squaddieRepository,
                activityResult,
            })).toBe(targetReactsEmotion);
            expect(finishedShowingResultsSpy).toBeCalled();
        });
    });
});
