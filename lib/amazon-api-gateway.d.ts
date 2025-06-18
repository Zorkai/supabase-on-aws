import * as apigw from '@aws-cdk/aws-apigatewayv2-alpha';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { BaseFargateService } from './ecs-patterns';
interface ApiGatewayProps {
    vpc: ec2.IVpc;
}
export declare class ApiGateway extends Construct {
    securityGroup: ec2.SecurityGroup;
    vpcLink: apigw.VpcLink;
    api: apigw.HttpApi;
    domainName: string;
    constructor(scope: Construct, id: string, props: ApiGatewayProps);
    addProxyRoute(path: string, service: BaseFargateService): void;
}
export {};
