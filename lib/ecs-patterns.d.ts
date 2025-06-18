import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { NetworkLoadBalancedTaskImageOptions } from 'aws-cdk-lib/aws-ecs-patterns';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';
import { AuthProvider } from './supabase-auth-provider';
import { FargateStack } from './supabase-stack';
interface SupabaseTaskImageOptions extends NetworkLoadBalancedTaskImageOptions {
    containerPort: number;
    healthCheck?: ecs.HealthCheck;
    entryPoint?: string[];
    command?: string[];
}
export interface BaseFargateServiceProps {
    serviceName?: string;
    cluster: ecs.ICluster;
    taskImageOptions: SupabaseTaskImageOptions;
    cpuArchitecture?: 'X86_64' | 'ARM64';
    enableServiceConnect?: boolean;
    enableCloudMap?: boolean;
}
export interface AutoScalingFargateServiceProps extends BaseFargateServiceProps {
    minTaskCount?: number;
    maxTaskCount?: number;
    highAvailability?: cdk.CfnCondition;
}
export interface TargetGroupProps {
    healthCheck?: elb.HealthCheck;
}
export declare class BaseFargateService extends Construct {
    /**
     * The URL to connect to an API. The URL contains the protocol, a DNS name, and the port.
     * (e.g. `http://rest.supabase.internal:8000`)
     */
    readonly endpoint: string;
    /**
     * This creates a service using the Fargate launch type on an ECS cluster.
     * @resource — AWS::ECS::Service
     */
    readonly service: ecs.FargateService;
    /**
     * Manage the allowed network connections for constructs with Security Groups.
     */
    readonly connections: ec2.Connections;
    constructor(scope: Construct, id: string, props: BaseFargateServiceProps);
    /** Create a Target Group and link it to the ECS Service. */
    addTargetGroup(props?: TargetGroupProps): cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup;
    addExternalAuthProviders(redirectUri: string, providerCount: number): AuthProvider[];
}
export declare class AutoScalingFargateService extends BaseFargateService {
    readonly taskSize: cdk.CfnParameter;
    constructor(scope: FargateStack, id: string, props: AutoScalingFargateServiceProps);
}
export {};
