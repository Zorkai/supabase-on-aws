"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseCdn = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const cf = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const aws_cloudfront_origins_1 = require("aws-cdk-lib/aws-cloudfront-origins");
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const constructs_1 = require("constructs");
class SupabaseCdn extends constructs_1.Construct {
    /** Construct for CloudFront and WAF */
    constructor(scope, id, props) {
        super(scope, id);
        /** Origin Server */
        const origin = (typeof props.origin == 'string')
            ? new aws_cloudfront_origins_1.HttpOrigin(props.origin, { protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY })
            : new aws_cloudfront_origins_1.LoadBalancerV2Origin(props.origin, { protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY });
        const wafDisabled = new cdk.CfnCondition(this, 'WafDisabled', { expression: cdk.Fn.conditionEquals(props.webAclArn, '') });
        /** Web ACL ID */
        const webAclId = cdk.Fn.conditionIf(wafDisabled.logicalId, cdk.Aws.NO_VALUE, props.webAclArn.valueAsString);
        const cachePolicy = new cf.CachePolicy(this, 'CachePolicy', {
            cachePolicyName: `${cdk.Aws.STACK_NAME}-CachePolicy-${cdk.Aws.REGION}`,
            comment: 'Policy for Supabase API',
            minTtl: cdk.Duration.seconds(0),
            maxTtl: cdk.Duration.seconds(600),
            defaultTtl: cdk.Duration.seconds(1),
            headerBehavior: cf.CacheHeaderBehavior.allowList('apikey', 'authorization', 'host'),
            queryStringBehavior: cf.CacheQueryStringBehavior.all(),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
        });
        const responseHeadersPolicy = new cf.ResponseHeadersPolicy(this, 'ResponseHeadersPolicy', {
            responseHeadersPolicyName: `${cdk.Aws.STACK_NAME}-ResponseHeadersPolicy-${cdk.Aws.REGION}`,
            comment: 'Policy for Supabase API',
            customHeadersBehavior: {
                customHeaders: [
                    { header: 'server', value: 'cloudfront', override: true },
                ],
            },
        });
        this.defaultBehaviorOptions = {
            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cf.AllowedMethods.ALLOW_ALL,
            cachePolicy,
            originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
            responseHeadersPolicy,
        };
        const publicContentBehavior = {
            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD,
            cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED,
            originRequestPolicy: cf.OriginRequestPolicy.ALL_VIEWER,
            responseHeadersPolicy,
            origin,
        };
        this.distribution = new cf.Distribution(this, 'Distribution', {
            webAclId: webAclId.toString(),
            httpVersion: cf.HttpVersion.HTTP2_AND_3,
            enableIpv6: true,
            comment: `Supabase - CDN (${this.node.path}/Distribution)`,
            defaultBehavior: {
                ...this.defaultBehaviorOptions,
                origin,
            },
            additionalBehaviors: {
                'storage/v1/object/public/*': publicContentBehavior,
            },
            errorResponses: [
                { httpStatus: 500, ttl: cdk.Duration.seconds(10) },
                { httpStatus: 501, ttl: cdk.Duration.seconds(10) },
                { httpStatus: 502, ttl: cdk.Duration.seconds(10) },
                { httpStatus: 503, ttl: cdk.Duration.seconds(10) },
                { httpStatus: 504, ttl: cdk.Duration.seconds(10) },
            ],
        });
    }
    //addBehavior(props: BehaviorProps) {
    //  const origin = (typeof props.origin == 'string')
    //    ? new HttpOrigin(props.origin, { protocolPolicy: cf.OriginProtocolPolicy.HTTPS_ONLY })
    //    : new LoadBalancerV2Origin(props.origin, { protocolPolicy: cf.OriginProtocolPolicy.HTTP_ONLY });
    //  this.distribution.addBehavior(props.pathPattern, origin, this.defaultBehaviorOptions);
    //}
    addCacheManager() {
        return new CacheManager(this, 'CacheManager', { distribution: this.distribution });
    }
}
exports.SupabaseCdn = SupabaseCdn;
;
class CacheManager extends constructs_1.Construct {
    /**
     * Webhook receiver for Smart CDN Caching
     * https://supabase.com/docs/guides/storage/cdn#smart-cdn-caching
     */
    constructor(scope, id, props) {
        super(scope, id);
        const distribution = props.distribution;
        this.apiKey = new aws_secretsmanager_1.Secret(this, 'ApiKey', {
            secretName: `${cdk.Aws.STACK_NAME}-CDN-CacheManager-ApiKey`,
            description: 'Supabase - API key for CDN cache manager',
            generateSecretString: {
                excludePunctuation: true,
            },
        });
        const queue = new sqs.Queue(this, 'Queue');
        /** Common settings for Lambda functions */
        const commonProps = {
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                externalModules: [
                    '@aws-sdk/*',
                    '@aws-lambda-powertools/*',
                ],
            },
            layers: [
                lambda.LayerVersion.fromLayerVersionArn(this, 'LambdaPowertools', `arn:aws:lambda:${cdk.Aws.REGION}:094274105915:layer:AWSLambdaPowertoolsTypeScript:25`),
            ],
        };
        /** API handler */
        const apiFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'ApiFunction', {
            ...commonProps,
            description: `${this.node.path}/ApiFunction`,
            entry: path.resolve(__dirname, 'cache-manager/api.ts'),
            environment: {
                QUEUE_URL: queue.queueUrl,
                API_KEY: this.apiKey.secretValue.toString(),
            },
        });
        // Allow API function to send messages to SQS
        queue.grantSendMessages(apiFunction);
        /** SQS consumer */
        const queueConsumer = new aws_lambda_nodejs_1.NodejsFunction(this, 'QueueConsumer', {
            ...commonProps,
            description: `${this.node.path}/QueueConsumer`,
            entry: path.resolve(__dirname, 'cache-manager/queue-consumer.ts'),
            environment: {
                DISTRIBUTION_ID: distribution.distributionId,
            },
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: ['cloudfront:CreateInvalidation'],
                    resources: [`arn:aws:cloudfront::${cdk.Aws.ACCOUNT_ID}:distribution/${distribution.distributionId}`],
                }),
            ],
            events: [
                new aws_lambda_event_sources_1.SqsEventSource(queue, { batchSize: 100, maxBatchingWindow: cdk.Duration.seconds(5) }),
            ],
        });
        /** Function URL */
        const functionUrl = apiFunction.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });
        this.url = functionUrl.url;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc3VwYWJhc2UtY2RuL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBRzdCLGlEQUFtQztBQUNuQywrREFBaUQ7QUFDakQsK0VBQXNGO0FBRXRGLHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQsbUZBQXNFO0FBQ3RFLHFFQUFvRjtBQUNwRix1RUFBd0Q7QUFDeEQseURBQTJDO0FBQzNDLDJDQUF1QztBQVl2QyxNQUFhLFdBQVksU0FBUSxzQkFBUztJQUl4Qyx1Q0FBdUM7SUFDdkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLG9CQUFvQjtRQUNwQixNQUFNLE1BQU0sR0FBRyxDQUFDLE9BQU8sS0FBSyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUM7WUFDOUMsQ0FBQyxDQUFDLElBQUksbUNBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0RixDQUFDLENBQUMsSUFBSSw2Q0FBb0IsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBRWxHLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTNILGlCQUFpQjtRQUNqQixNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFD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Q0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzlELEdBQUcsV0FBVztZQUNkLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBZ0I7WUFDOUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDO1lBQ2pFLFdBQVcsRUFBRTtnQkFDWCxlQUFlLEVBQUUsWUFBWSxDQUFDLGNBQWM7YUFDN0M7WUFDRCxhQUFhLEVBQUU7Z0JBQ2IsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO29CQUN0QixPQUFPLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQztvQkFDMUMsU0FBUyxFQUFFLENBQUMsdUJBQXVCLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxpQkFBaUIsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO2lCQUNyRyxDQUFDO2FBQ0g7WUFDRCxNQUFNLEVBQUU7Z0JBQ04sSUFBSSx5Q0FBYyxDQUFDLEtBQUssRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQzthQUMxRjtTQUNGLENBQUMsQ0FBQztRQUVILG1CQUFtQjtRQUNuQixNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsY0FBYyxDQUFDLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRTlGLElBQUksQ0FBQyxHQUFHLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQztJQUM3QixDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBhcGlndyBmcm9tICdAYXdzLWNkay9hd3MtYXBpZ2F0ZXdheXYyLWFscGhhJztcclxuaW1wb3J0IHsgSHR0cExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMtYWxwaGEnO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjZiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCB7IExvYWRCYWxhbmNlclYyT3JpZ2luLCBIdHRwT3JpZ2luIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XHJcbmltcG9ydCAqIGFzIGVsYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWxhc3RpY2xvYWRiYWxhbmNpbmd2Mic7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTcXNFdmVudFNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtZXZlbnQtc291cmNlcyc7XHJcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uLCBOb2RlanNGdW5jdGlvblByb3BzIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xyXG5pbXBvcnQgeyBTZWNyZXQgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuaW50ZXJmYWNlIFN1cGFiYXNlQ2RuUHJvcHMge1xyXG4gIG9yaWdpbjogc3RyaW5nfGVsYi5JTG9hZEJhbGFuY2VyVjI7XHJcbiAgd2ViQWNsQXJuOiBjZGsuQ2ZuUGFyYW1ldGVyO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQmVoYXZpb3JQcm9wcyB7XHJcbiAgcGF0aFBhdHRlcm46IHN0cmluZztcclxuICBvcmlnaW46IHN0cmluZ3xlbGIuSUxvYWRCYWxhbmNlclYyO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3VwYWJhc2VDZG4gZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIGRpc3RyaWJ1dGlvbjogY2YuRGlzdHJpYnV0aW9uO1xyXG4gIGRlZmF1bHRCZWhhdmlvck9wdGlvbnM6IGNmLkFkZEJlaGF2aW9yT3B0aW9ucztcclxuXHJcbiAgLyoqIENvbnN0cnVjdCBmb3IgQ2xvdWRGcm9udCBhbmQgV0FGICovXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFN1cGFiYXNlQ2RuUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgLyoqIE9yaWdpbiBTZXJ2ZXIgKi9cclxuICAgIGNvbnN0IG9yaWdpbiA9ICh0eXBlb2YgcHJvcHMub3JpZ2luID09ICdzdHJpbmcnKVxyXG4gICAgICA/IG5ldyBIdHRwT3JpZ2luKHByb3BzLm9yaWdpbiwgeyBwcm90b2NvbFBvbGljeTogY2YuT3JpZ2luUHJvdG9jb2xQb2xpY3kuSFRUUFNfT05MWSB9KVxyXG4gICAgICA6IG5ldyBMb2FkQmFsYW5jZXJWMk9yaWdpbihwcm9wcy5vcmlnaW4sIHsgcHJvdG9jb2xQb2xpY3k6IGNmLk9yaWdpblByb3RvY29sUG9saWN5LkhUVFBfT05MWSB9KTtcclxuXHJcbiAgICBjb25zdCB3YWZEaXNhYmxlZCA9IG5ldyBjZGsuQ2ZuQ29uZGl0aW9uKHRoaXMsICdXYWZEaXNhYmxlZCcsIHsgZXhwcmVzc2lvbjogY2RrLkZuLmNvbmRpdGlvbkVxdWFscyhwcm9wcy53ZWJBY2xBcm4sICcnKSB9KTtcclxuXHJcbiAgICAvKiogV2ViIEFDTCBJRCAqL1xyXG4gICAgY29uc3Qgd2ViQWNsSWQgPSBjZGsuRm4uY29uZGl0aW9uSWYod2FmRGlzYWJsZWQubG9naWNhbElkLCBjZGsuQXdzLk5PX1ZBTFVFLCBwcm9wcy53ZWJBY2xBcm4udmFsdWVBc1N0cmluZyk7XHJcblxyXG4gICAgY29uc3QgY2FjaGVQb2xpY3kgPSBuZXcgY2YuQ2FjaGVQb2xpY3kodGhpcywgJ0NhY2hlUG9saWN5Jywge1xyXG4gICAgICBjYWNoZVBvbGljeU5hbWU6IGAke2Nkay5Bd3MuU1RBQ0tfTkFNRX0tQ2FjaGVQb2xpY3ktJHtjZGsuQXdzLlJFR0lPTn1gLFxyXG4gICAgICBjb21tZW50OiAnUG9saWN5IGZvciBTdXBhYmFzZSBBUEknLFxyXG4gICAgICBtaW5UdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxyXG4gICAgICBtYXhUdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwMCksXHJcbiAgICAgIGRlZmF1bHRUdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEpLFxyXG4gICAgICBoZWFkZXJCZWhhdmlvcjogY2YuQ2FjaGVIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoJ2FwaWtleScsICdhdXRob3JpemF0aW9uJywgJ2hvc3QnKSxcclxuICAgICAgcXVlcnlTdHJpbmdCZWhhdmlvcjogY2YuQ2FjaGVRdWVyeVN0cmluZ0JlaGF2aW9yLmFsbCgpLFxyXG4gICAgICBlbmFibGVBY2NlcHRFbmNvZGluZ0d6aXA6IHRydWUsXHJcbiAgICAgIGVuYWJsZUFjY2VwdEVuY29kaW5nQnJvdGxpOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2VIZWFkZXJzUG9saWN5ID0gbmV3IGNmLlJlc3BvbnNlSGVhZGVyc1BvbGljeSh0aGlzLCAnUmVzcG9uc2VIZWFkZXJzUG9saWN5Jywge1xyXG4gICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3lOYW1lOiBgJHtjZGsuQXdzLlNUQUNLX05BTUV9LVJlc3BvbnNlSGVhZGVyc1BvbGljeS0ke2Nkay5Bd3MuUkVHSU9OfWAsXHJcbiAgICAgIGNvbW1lbnQ6ICdQb2xpY3kgZm9yIFN1cGFiYXNlIEFQSScsXHJcbiAgICAgIGN1c3RvbUhlYWRlcnNCZWhhdmlvcjoge1xyXG4gICAgICAgIGN1c3RvbUhlYWRlcnM6IFtcclxuICAgICAgICAgIHsgaGVhZGVyOiAnc2VydmVyJywgdmFsdWU6ICdjbG91ZGZyb250Jywgb3ZlcnJpZGU6IHRydWUgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5kZWZhdWx0QmVoYXZpb3JPcHRpb25zID0ge1xyXG4gICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2YuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgIGFsbG93ZWRNZXRob2RzOiBjZi5BbGxvd2VkTWV0aG9kcy5BTExPV19BTEwsXHJcbiAgICAgIGNhY2hlUG9saWN5LFxyXG4gICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OiBjZi5PcmlnaW5SZXF1ZXN0UG9saWN5LkFMTF9WSUVXRVIsXHJcbiAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcHVibGljQ29udGVudEJlaGF2aW9yOiBjZi5CZWhhdmlvck9wdGlvbnMgPSB7XHJcbiAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjZi5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgYWxsb3dlZE1ldGhvZHM6IGNmLkFsbG93ZWRNZXRob2RzLkFMTE9XX0dFVF9IRUFELFxyXG4gICAgICBjYWNoZVBvbGljeTogY2YuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNmLk9yaWdpblJlcXVlc3RQb2xpY3kuQUxMX1ZJRVdFUixcclxuICAgICAgcmVzcG9uc2VIZWFkZXJzUG9saWN5LFxyXG4gICAgICBvcmlnaW4sXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuZGlzdHJpYnV0aW9uID0gbmV3IGNmLkRpc3RyaWJ1dGlvbih0aGlzLCAnRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICB3ZWJBY2xJZDogd2ViQWNsSWQudG9TdHJpbmcoKSxcclxuICAgICAgaHR0cFZlcnNpb246IGNmLkh0dHBWZXJzaW9uLkhUVFAyX0FORF8zLFxyXG4gICAgICBlbmFibGVJcHY2OiB0cnVlLFxyXG4gICAgICBjb21tZW50OiBgU3VwYWJhc2UgLSBDRE4gKCR7dGhpcy5ub2RlLnBhdGh9L0Rpc3RyaWJ1dGlvbilgLFxyXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcclxuICAgICAgICAuLi50aGlzLmRlZmF1bHRCZWhhdmlvck9wdGlvbnMsXHJcbiAgICAgICAgb3JpZ2luLFxyXG4gICAgICB9LFxyXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XHJcbiAgICAgICAgJ3N0b3JhZ2UvdjEvb2JqZWN0L3B1YmxpYy8qJzogcHVibGljQ29udGVudEJlaGF2aW9yLFxyXG4gICAgICB9LFxyXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xyXG4gICAgICAgIHsgaHR0cFN0YXR1czogNTAwLCB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSB9LFxyXG4gICAgICAgIHsgaHR0cFN0YXR1czogNTAxLCB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSB9LFxyXG4gICAgICAgIHsgaHR0cFN0YXR1czogNTAyLCB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSB9LFxyXG4gICAgICAgIHsgaHR0cFN0YXR1czogNTAzLCB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSB9LFxyXG4gICAgICAgIHsgaHR0cFN0YXR1czogNTA0LCB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gIH1cclxuXHJcbiAgLy9hZGRCZWhhdmlvcihwcm9wczogQmVoYXZpb3JQcm9wcykge1xyXG4gIC8vICBjb25zdCBvcmlnaW4gPSAodHlwZW9mIHByb3BzLm9yaWdpbiA9PSAnc3RyaW5nJylcclxuICAvLyAgICA/IG5ldyBIdHRwT3JpZ2luKHByb3BzLm9yaWdpbiwgeyBwcm90b2NvbFBvbGljeTogY2YuT3JpZ2luUHJvdG9jb2xQb2xpY3kuSFRUUFNfT05MWSB9KVxyXG4gIC8vICAgIDogbmV3IExvYWRCYWxhbmNlclYyT3JpZ2luKHByb3BzLm9yaWdpbiwgeyBwcm90b2NvbFBvbGljeTogY2YuT3JpZ2luUHJvdG9jb2xQb2xpY3kuSFRUUF9PTkxZIH0pO1xyXG4gIC8vICB0aGlzLmRpc3RyaWJ1dGlvbi5hZGRCZWhhdmlvcihwcm9wcy5wYXRoUGF0dGVybiwgb3JpZ2luLCB0aGlzLmRlZmF1bHRCZWhhdmlvck9wdGlvbnMpO1xyXG4gIC8vfVxyXG5cclxuICBhZGRDYWNoZU1hbmFnZXIoKSB7XHJcbiAgICByZXR1cm4gbmV3IENhY2hlTWFuYWdlcih0aGlzLCAnQ2FjaGVNYW5hZ2VyJywgeyBkaXN0cmlidXRpb246IHRoaXMuZGlzdHJpYnV0aW9uIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbmludGVyZmFjZSBDYWNoZU1hbmFnZXJQcm9wcyB7XHJcbiAgZGlzdHJpYnV0aW9uOiBjZi5JRGlzdHJpYnV0aW9uO1xyXG59XHJcblxyXG5jbGFzcyBDYWNoZU1hbmFnZXIgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIC8qKiBBUEkgZW5kcG9pbnQgZm9yIENETiBjYWNoZSBtYW5hZ2VyICovXHJcbiAgdXJsOiBzdHJpbmc7XHJcbiAgLyoqIEJlYXJlciB0b2tlbiBmb3IgQ0ROIGNhY2hlIG1hbmFnZXIgKi9cclxuICBhcGlLZXk6IFNlY3JldDtcclxuXHJcbiAgLyoqXHJcbiAgICogV2ViaG9vayByZWNlaXZlciBmb3IgU21hcnQgQ0ROIENhY2hpbmdcclxuICAgKiBodHRwczovL3N1cGFiYXNlLmNvbS9kb2NzL2d1aWRlcy9zdG9yYWdlL2NkbiNzbWFydC1jZG4tY2FjaGluZ1xyXG4gICAqL1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDYWNoZU1hbmFnZXJQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBwcm9wcy5kaXN0cmlidXRpb247XHJcblxyXG4gICAgdGhpcy5hcGlLZXkgPSBuZXcgU2VjcmV0KHRoaXMsICdBcGlLZXknLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6IGAke2Nkay5Bd3MuU1RBQ0tfTkFNRX0tQ0ROLUNhY2hlTWFuYWdlci1BcGlLZXlgLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1cGFiYXNlIC0gQVBJIGtleSBmb3IgQ0ROIGNhY2hlIG1hbmFnZXInLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIGV4Y2x1ZGVQdW5jdHVhdGlvbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnUXVldWUnKTtcclxuXHJcbiAgICAvKiogQ29tbW9uIHNldHRpbmdzIGZvciBMYW1iZGEgZnVuY3Rpb25zICovXHJcbiAgICBjb25zdCBjb21tb25Qcm9wczogUGFydGlhbDxOb2RlanNGdW5jdGlvblByb3BzPiA9IHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGFyY2hpdGVjdHVyZTogbGFtYmRhLkFyY2hpdGVjdHVyZS5BUk1fNjQsXHJcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFtcclxuICAgICAgICAgICdAYXdzLXNkay8qJyxcclxuICAgICAgICAgICdAYXdzLWxhbWJkYS1wb3dlcnRvb2xzLyonLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGxheWVyczogW1xyXG4gICAgICAgIGxhbWJkYS5MYXllclZlcnNpb24uZnJvbUxheWVyVmVyc2lvbkFybih0aGlzLCAnTGFtYmRhUG93ZXJ0b29scycsIGBhcm46YXdzOmxhbWJkYToke2Nkay5Bd3MuUkVHSU9OfTowOTQyNzQxMDU5MTU6bGF5ZXI6QVdTTGFtYmRhUG93ZXJ0b29sc1R5cGVTY3JpcHQ6MjVgKSxcclxuICAgICAgXSxcclxuICAgIH07XHJcblxyXG4gICAgLyoqIEFQSSBoYW5kbGVyICovXHJcbiAgICBjb25zdCBhcGlGdW5jdGlvbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnQXBpRnVuY3Rpb24nLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYCR7dGhpcy5ub2RlLnBhdGh9L0FwaUZ1bmN0aW9uYCxcclxuICAgICAgZW50cnk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjYWNoZS1tYW5hZ2VyL2FwaS50cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFFVRVVFX1VSTDogcXVldWUucXVldWVVcmwsXHJcbiAgICAgICAgQVBJX0tFWTogdGhpcy5hcGlLZXkuc2VjcmV0VmFsdWUudG9TdHJpbmcoKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsbG93IEFQSSBmdW5jdGlvbiB0byBzZW5kIG1lc3NhZ2VzIHRvIFNRU1xyXG4gICAgcXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMoYXBpRnVuY3Rpb24pO1xyXG5cclxuICAgIC8qKiBTUVMgY29uc3VtZXIgKi9cclxuICAgIGNvbnN0IHF1ZXVlQ29uc3VtZXIgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1F1ZXVlQ29uc3VtZXInLCB7XHJcbiAgICAgIC4uLmNvbW1vblByb3BzLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYCR7dGhpcy5ub2RlLnBhdGh9L1F1ZXVlQ29uc3VtZXJgLFxyXG4gICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NhY2hlLW1hbmFnZXIvcXVldWUtY29uc3VtZXIudHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBESVNUUklCVVRJT05fSUQ6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcclxuICAgICAgfSxcclxuICAgICAgaW5pdGlhbFBvbGljeTogW1xyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIGFjdGlvbnM6IFsnY2xvdWRmcm9udDpDcmVhdGVJbnZhbGlkYXRpb24nXSxcclxuICAgICAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmNsb3VkZnJvbnQ6OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpkaXN0cmlidXRpb24vJHtkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWR9YF0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIF0sXHJcbiAgICAgIGV2ZW50czogW1xyXG4gICAgICAgIG5ldyBTcXNFdmVudFNvdXJjZShxdWV1ZSwgeyBiYXRjaFNpemU6IDEwMCwgbWF4QmF0Y2hpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpIH0pLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIEZ1bmN0aW9uIFVSTCAqL1xyXG4gICAgY29uc3QgZnVuY3Rpb25VcmwgPSBhcGlGdW5jdGlvbi5hZGRGdW5jdGlvblVybCh7IGF1dGhUeXBlOiBsYW1iZGEuRnVuY3Rpb25VcmxBdXRoVHlwZS5OT05FIH0pO1xyXG5cclxuICAgIHRoaXMudXJsID0gZnVuY3Rpb25VcmwudXJsO1xyXG4gIH1cclxufSJdfQ==