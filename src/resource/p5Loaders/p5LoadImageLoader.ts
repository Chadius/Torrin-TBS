import p5 from "p5"
import { P5ImageLoader } from "../p5ImageLoader.ts"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer.ts"

export class P5LoadImageLoader implements P5ImageLoader {
    loadImage({
        key,
        url,
        graphics,
    }: {
        key: string
        url: string
        graphics: GraphicsBuffer
    }): Promise<{
        key: string
        image: p5.Image
    }> {
        return new Promise((resolve, reject) => {
            const successCallback = (loadedImage: p5.Image) => {
                resolve({
                    key,
                    image: loadedImage,
                })
            }

            const failureCallback = (error: Event) => {
                reject({
                    key,
                    message: `[P5LoadImageLoader.loadImage]: Failed to load ${url}: ${error}`,
                })
            }

            graphics.loadImage(url, successCallback, failureCallback)
        })
    }
}
