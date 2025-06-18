import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export declare class SupabaseWafStack extends cdk.Stack {
    readonly webAclId: string;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
