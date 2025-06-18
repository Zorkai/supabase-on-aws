import * as cdk from 'aws-cdk-lib';
import * as cf from 'aws-cdk-lib/aws-cloudfront';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
interface SupabaseCdnProps {
    origin: string | elb.ILoadBalancerV2;
    webAclArn: cdk.CfnParameter;
}
export declare class SupabaseCdn extends Construct {
    distribution: cf.Distribution;
    defaultBehaviorOptions: cf.AddBehaviorOptions;
    /** Construct for CloudFront and WAF */
    constructor(scope: Construct, id: string, props: SupabaseCdnProps);
    addCacheManager(): CacheManager;
}
interface CacheManagerProps {
    distribution: cf.IDistribution;
}
declare class CacheManager extends Construct {
    /** API endpoint for CDN cache manager */
    url: string;
    /** Bearer token for CDN cache manager */
    apiKey: Secret;
    /**
     * Webhook receiver for Smart CDN Caching
     * https://supabase.com/docs/guides/storage/cdn#smart-cdn-caching
     */
    constructor(scope: Construct, id: string, props: CacheManagerProps);
}
export {};
