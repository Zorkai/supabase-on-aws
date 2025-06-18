import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
interface SupabaseDatabaseProps {
    vpc: ec2.IVpc;
    highAvailability?: cdk.CfnCondition;
}
export declare class SupabaseDatabase extends Construct {
    /** Aurora Cluster */
    cluster: rds.DatabaseCluster;
    /** Database migration */
    migration: cdk.CustomResource;
    /** Custom resource provider to generate user password */
    userPasswordProvider: cr.Provider;
    /** PostgreSQL for Supabase */
    constructor(scope: Construct, id: string, props: SupabaseDatabaseProps);
    /** Generate and set password to database user */
    genUserPassword(username: string): cdk.aws_secretsmanager.Secret;
}
export {};
