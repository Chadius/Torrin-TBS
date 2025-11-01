import p5 from "p5"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer.ts"

export interface P5ImageLoader {
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
    }>
}
