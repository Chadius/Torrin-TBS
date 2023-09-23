import {RectArea} from "../../ui/rectArea";
import {ResourceLocator, ResourceType} from "../../resource/resourceHandler";
import {CutsceneAction} from "../cutsceneAction";
import {DialogueTextBox} from "./dialogueTextBox";
import {DialogueSpeakerNameBox} from "./dialogueSpeakerNameBox";
import {DialogueSpeakerImage} from "./dialogueSpeakerImage";
import {DialogueAnswerButton} from "./dialogueAnswerButton";
import {GraphicImage, GraphicsContext} from "../../utils/graphics/graphicsContext";

export class DialogueBox implements CutsceneAction {
    id: string;
    screenDimensions: [number, number];
    dialogFinished: boolean;

    startTime: number;
    animationDuration: number;

    answers: string[];
    answerSelected: number;
    answerButtons: DialogueAnswerButton[];

    textBox: DialogueTextBox;
    speakerNameBox: DialogueSpeakerNameBox;
    speakerPortrait: GraphicImage;
    speakerPortraitResourceKey: string;
    speakerImage: DialogueSpeakerImage;

    constructor({
                    id,
                    name,
                    text,
                    portrait,
                    portraitResourceKey,
                    animationDuration,
                    answers,
                    screenDimensions,
                }: {
        id: string;
        name?: string;
        text?: string;
        portrait?: GraphicImage;
        portraitResourceKey?: string;
        animationDuration?: number;
        answers?: string[];
        screenDimensions?: [number, number];
    }) {
        this.id = id;
        this.answers = answers || [];
        this.animationDuration = animationDuration;
        this.speakerPortrait = portrait;
        this.speakerPortraitResourceKey = portraitResourceKey;
        this.screenDimensions = screenDimensions || [0, 0];

        this.answerSelected = -1;
        this.dialogFinished = false;

        this.textBox = new DialogueTextBox({text, screenDimensions});
        this.speakerNameBox = new DialogueSpeakerNameBox({name, screenDimensions});

        this.createUIObjects();
    }

    getId(): string {
        return this.id;
    }

    createUIObjects() {
        const answerButtonPositions: RectArea[] = this.getAnswerButtonPositions();
        this.answerButtons = answerButtonPositions.map((position, index) => new DialogueAnswerButton({
            answer: this.answers[index],
            position: position,
            screenDimensions: this.screenDimensions
        }));

        this.setSpeakerUI();
    }

    setSpeakerUI() {
        if (this.speakerPortrait) {
            this.speakerImage = new DialogueSpeakerImage({
                speakerPortrait: this.speakerPortrait,
                screenDimensions: this.screenDimensions
            });
        }
    }

    getResourceLocators(): ResourceLocator[] {
        return [
            {
                type: ResourceType.IMAGE,
                key: this.speakerPortraitResourceKey
            }
        ]
    }

    setImageResource(image: GraphicImage) {
        this.setPortrait(image);
    }

    setPortrait(portrait: GraphicImage) {
        this.speakerPortrait = portrait;
        this.setSpeakerUI();
    }

    draw(graphicsContext: GraphicsContext) {
        graphicsContext.push();

        this.textBox?.draw(graphicsContext);
        this.speakerNameBox?.draw(graphicsContext);
        this.speakerImage?.draw(graphicsContext);
        this.answerButtons.forEach((answer) => answer.draw(graphicsContext));

        graphicsContext.pop();
    }

    start(): void {
        this.dialogFinished = false;
        this.startTime = Date.now();
    }

    getAnswerButtonPositions(): RectArea[] {
        if (!this.asksUserForAnAnswer()) {
            return [];
        }

        const buttonTop = this.screenDimensions[1] * 0.9;
        const buttonHeight = this.screenDimensions[1] * 0.1;

        if (this.answers.length == 1) {
            return [
                new RectArea({
                    left: 0,
                    top: buttonTop,
                    width: this.screenDimensions[0],
                    height: buttonHeight
                })
            ];
        }

        const BUTTON_GAP_WHITESPACE_PERCENTAGE = 25;
        const BUTTON_GAP_PIXEL_MINIMUM = 50;

        let numberOfGaps = this.answers.length - 1;
        let rawTotalButtonGapSpace = this.screenDimensions[0] * BUTTON_GAP_WHITESPACE_PERCENTAGE / 100;

        let buttonGapWidth = rawTotalButtonGapSpace / numberOfGaps;
        if (buttonGapWidth < BUTTON_GAP_PIXEL_MINIMUM) {
            buttonGapWidth = BUTTON_GAP_PIXEL_MINIMUM;
        }

        let totalButtonGap = buttonGapWidth * (this.answers.length - 1);
        let totalButtonSpace = this.screenDimensions[0] - totalButtonGap;
        let buttonWidth = totalButtonSpace / this.answers.length;

        return this.answers.map((text, index): RectArea => {
            return new RectArea({
                left: (buttonWidth + buttonGapWidth) * index,
                top: buttonTop,
                width: buttonWidth,
                height: buttonHeight
            });
        });
    }

    mouseClicked(mouseX: number, mouseY: number) {
        if (this.asksUserForAnAnswer()) {
            const answerSelected: number | null = this.answerButtons.findIndex((answerButton) => {
                return answerButton.buttonWasClicked(mouseX, mouseY);
            });

            if (answerSelected !== -1) {
                this.dialogFinished = true;
                this.answerSelected = answerSelected;
            }
            return;
        }

        if (this.isAnimating() && !this.asksUserForAnAnswer()) {
            this.dialogFinished = true;
        }
    }

    isTimeExpired(): boolean {
        return Date.now() >= this.startTime + this.animationDuration
    }

    asksUserForAnAnswer(): boolean {
        return this.answers.length > 0;
    }

    isAnimating(): boolean {
        if (this.isTimeExpired() && !this.asksUserForAnAnswer()) {
            return false;
        }

        return !this.dialogFinished;
    }

    isFinished(): boolean {
        return !this.isAnimating() || this.dialogFinished;
    }
}
