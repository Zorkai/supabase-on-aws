import * as cdk from 'aws-cdk-lib';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
export declare class AuthProvider extends Construct {
    readonly id: string;
    readonly name: cdk.CfnParameter;
    readonly clientId: cdk.CfnParameter;
    readonly secret: cdk.CfnParameter;
    readonly clientIdParameter: StringParameter;
    readonly secretParameter: StringParameter;
    readonly enabled: string;
    constructor(scope: Construct, id: string);
}
