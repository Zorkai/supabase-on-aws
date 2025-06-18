import * as cdk from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
interface SesSmtpProps {
    region: string;
    email: string;
    workMailEnabled: cdk.CfnCondition;
}
export declare class SesSmtp extends Construct {
    secret: Secret;
    host: string;
    port: number;
    email: string;
    constructor(scope: Construct, id: string, props: SesSmtpProps);
}
export {};
