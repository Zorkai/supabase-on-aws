import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
interface PrefixListProps {
    prefixListName: string;
}
export declare class PrefixList extends cr.AwsCustomResource {
    prefixListId: string;
    constructor(scope: Construct, id: string, props: PrefixListProps);
}
export {};
