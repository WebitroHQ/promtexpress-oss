import { alt, contentType, runtime, size } from "./opengraph-image.tsx"
import { fillMetadataSegment } from 'next/dist/lib/metadata/get-metadata-route'

const imageModule = { alt, contentType, runtime, size }

export default async function (props) {
    const { __metadata_id__: _, ...params } = await props.params
    const imageUrl = fillMetadataSegment("/", params, "opengraph-image", false)

    function getImageMetadata(imageMetadata, idParam) {
        const data = {
            alt: imageMetadata.alt,
            type: imageMetadata.contentType || 'image/png',
            url: imageUrl + (idParam ? ('/' + idParam) : '') + '?' + "ea411388b142c0cc",
        }
        const { size } = imageMetadata
        if (size) {
            data.width = size.width; data.height = size.height;
        }
        return data
    }

    return [getImageMetadata(imageModule, '')]
}
