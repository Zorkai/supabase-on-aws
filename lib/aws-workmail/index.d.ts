import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
interface StackProps extends cdk.NestedStackProps {
    organization: OrganizationProps;
}
export declare class WorkMailStack extends cdk.NestedStack {
    organization: Organization;
    /** Nested stack to enable WorkMail */
    constructor(scope: Construct, id: string, props: StackProps);
}
interface OrganizationProps {
    region: string;
    alias: string;
}
export declare class Organization extends Construct {
    /** WorkMail Region */
    region: string;
    /** WorkMail identifier */
    alias: string;
    /** WorkMail domain */
    domain: string;
    /** WorkMail organization ID */
    organizationId: string;
    /** Custom resource provider to create user */
    createUserProvider: cr.Provider;
    /** WorkMail Organization */
    constructor(scope: Construct, id: string, props: OrganizationProps);
    /** Add WorkMail User */
    addUser(username: string, password: string): cdk.CfnResource;
}
export {};
