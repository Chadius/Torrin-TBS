import {ActivityResult} from "../../history/activityResult";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {CreateNewSquaddieAndAddToRepository} from "../../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {ArmyAttributes} from "../../../squaddie/armyAttributes";
import {ActorSprite} from "./actorSprite";
import {ActionTimer} from "./actionTimer";
import {ActionAnimationPhase, SquaddieEmotion} from "./actionAnimationConstants";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {RectArea} from "../../../ui/rectArea";
import {SquaddieSprite} from "./squaddieSprite";

describe('Actor Sprite', () => {
    let resultTookDamage: ActivityResult;
    let squaddieRepository: BattleSquaddieRepository;
    let timer: ActionTimer;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    const dynamicSquaddieId = "actor0";

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);

        squaddieRepository = new BattleSquaddieRepository();
        CreateNewSquaddieAndAddToRepository({
            affiliation: SquaddieAffiliation.ALLY,
            attributes: new ArmyAttributes({
                maxHitPoints: 5,
            }),
            dynamicId: dynamicSquaddieId,
            name: "actor",
            squaddieRepository,
            staticId: "actor"
        });

        timer = new ActionTimer();
        timer.start();
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });


    it('uses helper function to determine the emotion', () => {
        const sprite = new ActorSprite();
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.BEFORE_ACTION);
        jest.spyOn(SquaddieSprite.prototype, "beginLoadingActorImages").mockReturnValue();
        jest.spyOn(SquaddieSprite.prototype, "createActorImagesWithLoadedData").mockReturnValue({justCreatedImages: false});
        const getSquaddieEmotionSpy = jest.spyOn(sprite, "getSquaddieEmotion").mockReturnValue(SquaddieEmotion.NEUTRAL);

        sprite.start({
            resourceHandler: undefined,
            squaddieRepository,
            actorDynamicSquaddieId: dynamicSquaddieId,
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
        const sprite = new ActorSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            dynamicSquaddieId,
            squaddieRepository,
        });

        expect(emotion).toBe(SquaddieEmotion.NEUTRAL);
        expect(getterSpy).toBeCalled();
    });
    it('starts with a ATTACK emotion if the effect is damaging and the attack just started', () => {
        const getterSpy = mockActionTimerPhase(ActionAnimationPhase.DURING_ACTION);
        const sprite = new ActorSprite();
        const emotion = sprite.getSquaddieEmotion({
            timer,
            dynamicSquaddieId,
            squaddieRepository,
        });

        expect(emotion).toBe(SquaddieEmotion.ATTACK);
        expect(getterSpy).toBeCalled();
    });

    describe('should keep the same emotion in DURING_ACTION, TARGET_REACTS, SHOWING_RESULTS and FINISHED_SHOWING_RESULTS', () => {
        const tests = [
            {
                name: 'deals damage',
                activityResult: resultTookDamage,
            }
        ]
        it.each(tests)(`$name will show the same emotion`, ({
                                                                name,
                                                                activityResult,
                                                            }) => {
            const sprite = new ActorSprite();
            mockActionTimerPhase(ActionAnimationPhase.DURING_ACTION);
            const duringActionEmotion = sprite.getSquaddieEmotion({
                timer,
                dynamicSquaddieId,
                squaddieRepository,
            });

            const targetReactsSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                dynamicSquaddieId,
                squaddieRepository,
            })).toBe(duringActionEmotion);
            expect(targetReactsSpy).toBeCalled();

            const showingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                dynamicSquaddieId,
                squaddieRepository,
            })).toBe(duringActionEmotion);
            expect(showingResultsSpy).toBeCalled();

            const finishedShowingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                dynamicSquaddieId,
                squaddieRepository,
            })).toBe(duringActionEmotion);
            expect(finishedShowingResultsSpy).toBeCalled();
        });
    });
});
