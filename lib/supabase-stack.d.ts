import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export declare class FargateStack extends cdk.Stack {
    /** ECS Fargate task size mappings */
    readonly taskSizeMapping: cdk.CfnMapping;
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
export declare class SupabaseStack extends FargateStack {
    /** Supabase Stack */
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
