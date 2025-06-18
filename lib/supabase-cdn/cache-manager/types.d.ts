export type ObjectMetadata = {
    cacheControl: string;
    contentLength: number;
    size: number;
    mimetype: string;
    lastModified?: Date;
    eTag: string;
    contentRange?: string;
    httpStatusCode: number;
};
export interface BasePayload {
    $version: string;
    tenant: {
        ref: string;
        host: string;
    };
}
interface ObjectCreatedEvent extends BasePayload {
    name: string;
    bucketId: string;
    metadata: ObjectMetadata;
}
interface ObjectRemovedEvent extends BasePayload {
    name: string;
    bucketId: string;
}
interface ObjectUpdatedMetadataEvent extends BasePayload {
    name: string;
    bucketId: string;
    metadata: ObjectMetadata;
}
type EventName = 'ObjectCreated:Put' | 'ObjectCreated:Post' | 'ObjectCreated:Copy' | 'ObjectCreated:Move' | 'ObjectRemoved:Delete' | 'ObjectRemoved:Move' | 'ObjectUpdated:Metadata';
export interface WebhookEvent {
    type: string;
    event: {
        $version: string;
        type: EventName;
        payload: ObjectCreatedEvent | ObjectRemovedEvent | ObjectUpdatedMetadataEvent;
        applyTime: number;
    };
    sentAt: string;
    tenant: {
        ref: string;
        host: string;
    };
}
export {};
