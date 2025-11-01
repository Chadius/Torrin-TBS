import { EnumLike } from "../utils/enum.ts"

export const Resource = {
    IMAGE: "IMAGE",
} as const satisfies Record<string, string>
export type TResource = EnumLike<typeof Resource>
export type ResourceLocator = {
    key: string
    path?: string
    type: TResource
}
