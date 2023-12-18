import {ActionResultPerSquaddie} from "../../history/actionResultPerSquaddie";
import {BattleSquaddieRepository} from "../../battleSquaddieRepository";
import {CreateNewSquaddieAndAddToRepository} from "../../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {ActorSprite} from "./actorSprite";
import {ActionTimer} from "./actionTimer";
import {ActionAnimationPhase, SquaddieEmotion} from "./actionAnimationConstants";
import {MockedP5GraphicsContext} from "../../../utils/test/mocks";
import {SquaddieSprite} from "./squaddieSprite";
import {CreateNewSquaddieMovementWithTraits} from "../../../squaddie/movement";

describe('Actor Sprite', () => {
    let resultTookDamage: ActionResultPerSquaddie;
    let squaddieRepository: BattleSquaddieRepository;
    let timer: ActionTimer;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    const battleSquaddieId = "actor0";

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
            name: "actor",
            squaddieRepository,
            templateId: "actor"
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
            actorBattleSquaddieId: battleSquaddieId,
            startingPosition: 0,
            squaddieResult: {
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                resultPerTarget: {},
                targetedBattleSquaddieIds: [],
                actingBattleSquaddieId: battleSquaddieId,
            },
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
            battleSquaddieId,
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
            battleSquaddieId,
            squaddieRepository,
        });

        expect(emotion).toBe(SquaddieEmotion.ATTACK);
        expect(getterSpy).toBeCalled();
    });

    describe('should keep the same emotion in DURING_ACTION, TARGET_REACTS, SHOWING_RESULTS and FINISHED_SHOWING_RESULTS', () => {
        let mapping: { [name: string]: ActionResultPerSquaddie };
        const tests: { name: string }[] = [
            {
                name: 'deals damage',
            }
        ]
        beforeEach(() => {
            mapping = {
                'deals damage': resultTookDamage,
            }
        })
        it.each(tests)(`$name will show the same emotion`, ({
                                                                name,
                                                            }) => {
            const result = mapping[name];
            const sprite = new ActorSprite();
            mockActionTimerPhase(ActionAnimationPhase.DURING_ACTION);
            const duringActionEmotion = sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
            });

            const targetReactsSpy = mockActionTimerPhase(ActionAnimationPhase.TARGET_REACTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
            })).toBe(duringActionEmotion);
            expect(targetReactsSpy).toBeCalled();

            const showingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
            })).toBe(duringActionEmotion);
            expect(showingResultsSpy).toBeCalled();

            const finishedShowingResultsSpy = mockActionTimerPhase(ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
            expect(sprite.getSquaddieEmotion({
                timer,
                battleSquaddieId,
                squaddieRepository,
            })).toBe(duringActionEmotion);
            expect(finishedShowingResultsSpy).toBeCalled();
        });
    });
});
