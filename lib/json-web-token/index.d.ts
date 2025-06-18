import { Secret, SecretProps } from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
export declare class JwtSecret extends Secret {
    /** Custom resource provider to generate a json web token */
    genTokenProvider: cr.Provider;
    /** Creates a new jwt secret in AWS SecretsManager. */
    constructor(scope: Construct, id: string, props?: SecretProps);
    /** Generate a new token in ParameterStore. */
    genApiKey(id: string, props: ApiKeyProps): ApiKey;
}
interface ApiKeyProps {
    roleName: string;
    issuer?: string;
    expiresIn?: string;
}
declare class ApiKey extends Construct {
    /** Token value */
    value: string;
    /** ParameterStore of the token */
    ssmParameter: ssm.StringParameter;
    /** Json Web Token */
    constructor(scope: JwtSecret, id: string, props: ApiKeyProps);
}
export {};
