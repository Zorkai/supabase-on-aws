import * as amplify from '@aws-cdk/aws-amplify-alpha';
import * as cdk from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
interface SupabaseStudioProps {
    sourceBranch?: string;
    appRoot?: string;
    supabaseUrl: string;
    dbSecret: ISecret;
    anonKey: StringParameter;
    serviceRoleKey: StringParameter;
}
export declare class SupabaseStudio extends Construct {
    /** App in Amplify Hosting. It is a collection of branches. */
    readonly app: amplify.App;
    /** Production branch */
    readonly prodBranch: amplify.Branch;
    /** URL of production branch */
    readonly prodBranchUrl: string;
    /** Next.js app on Amplify Hosting */
    constructor(scope: Construct, id: string, props: SupabaseStudioProps);
}
export declare class Repository extends codecommit.Repository {
    readonly importFunction: lambda.Function;
    readonly importProvider: cr.Provider;
    /** CodeCommit to sync with GitHub */
    constructor(scope: Construct, id: string, props: codecommit.RepositoryProps);
    importFromUrl(sourceRepoUrlHttp: string, sourceBranch: string, targetBranch?: string): cdk.CustomResource;
}
export {};
