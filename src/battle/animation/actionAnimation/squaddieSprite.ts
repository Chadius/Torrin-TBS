import {RectArea} from "../../../ui/rectArea";
import p5 from "p5";
import {SquaddieEmotion} from "./actionAnimationConstants";
import {ScreenDimensions} from "../../../utils/graphicsConfig";
import {ResourceHandler} from "../../../resource/resourceHandler";
import {ImageUI} from "../../../ui/imageUI";
import {getResultOrThrowError} from "../../../utils/ResultOrError";

export class SquaddieSprite {
    constructor({resourceHandler, actionSpritesResourceKeysByEmotion}: {
        resourceHandler: ResourceHandler,
        actionSpritesResourceKeysByEmotion: { [key in SquaddieEmotion]?: string }
    }) {
        this._resourceHandler = resourceHandler;
        this._actionSpritesResourceKeysByEmotion = actionSpritesResourceKeysByEmotion;
        this._actionSpritesByEmotion = {};
    }

    private readonly _actionSpritesByEmotion: { [key in SquaddieEmotion]?: ImageUI };

    get actionSpritesByEmotion(): { [key in SquaddieEmotion]?: ImageUI } {
        return this._actionSpritesByEmotion;
    }

    private readonly _actionSpritesResourceKeysByEmotion: { [key in SquaddieEmotion]?: string };

    get actionSpritesResourceKeysByEmotion(): { [key in SquaddieEmotion]?: string } {
        return this._actionSpritesResourceKeysByEmotion;
    }

    private _createdImages: boolean;

    get createdImages(): boolean {
        return this._createdImages;
    }

    private readonly _resourceHandler: ResourceHandler;

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler;
    }

    public beginLoadingActorImages() {
        this.resourceHandler.loadResources(Object.values(this.actionSpritesResourceKeysByEmotion));
    }

    public createActorImagesWithLoadedData(): { justCreatedImages: boolean } {
        if (this.resourceHandler.areAllResourcesLoaded(Object.values(this.actionSpritesResourceKeysByEmotion)) !== true) {
            return {justCreatedImages: false};
        }
        if (this.createdImages) {
            return {justCreatedImages: false};
        }

        for (let emotionStr in this.actionSpritesResourceKeysByEmotion) {
            const emotion = emotionStr as SquaddieEmotion;
            const resourceKey = this.actionSpritesResourceKeysByEmotion[emotion];
            const image = getResultOrThrowError(this.resourceHandler.getResource(resourceKey));
            this.actionSpritesByEmotion[emotion] = new ImageUI({
                graphic: image,
                area: new RectArea({
                    left: 0,
                    top: 0,
                    width: image.width,
                    height: image.height,
                })
            })
        }

        this._createdImages = true;
        return {justCreatedImages: true};
    }

    public getSpriteBasedOnEmotion(emotion: SquaddieEmotion, graphicsContext: p5): ImageUI {
        if (emotion in this.actionSpritesByEmotion) {
            return this.actionSpritesByEmotion[emotion];
        }

        if (SquaddieEmotion.NEUTRAL in this.actionSpritesByEmotion) {
            return this.actionSpritesByEmotion[SquaddieEmotion.NEUTRAL];
        }

        return this.defaultEmptyImage(graphicsContext);
    }

    private defaultEmptyImage(graphicsContext: p5): ImageUI {
        const emptyImage: p5.Image = graphicsContext.createImage(1, 1);
        emptyImage.loadPixels();

        return new ImageUI({
            area: new RectArea({
                left: 0,
                top: ScreenDimensions.SCREEN_HEIGHT * 0.33,
                width: emptyImage.width,
                height: emptyImage.height,
            }),
            graphic: emptyImage,
        })
    }
}
