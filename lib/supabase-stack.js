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
exports.SupabaseStack = exports.FargateStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const aws_ec2_1 = require("aws-cdk-lib/aws-ec2");
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const elb = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const amazon_ses_smtp_1 = require("./amazon-ses-smtp");
const aws_prefix_list_1 = require("./aws-prefix-list");
const ecs_force_deploy_job_1 = require("./ecs-force-deploy-job");
const ecs_patterns_1 = require("./ecs-patterns");
const json_web_token_1 = require("./json-web-token");
const supabase_cdn_1 = require("./supabase-cdn");
const supabase_db_1 = require("./supabase-db");
const supabase_studio_1 = require("./supabase-studio");
class FargateStack extends cdk.Stack {
    constructor(scope, id, props = {}) {
        super(scope, id, props);
        this.taskSizeMapping = new cdk.CfnMapping(this, 'TaskSize', {
            mapping: {
                'none': { cpu: 256, memory: 512 },
                'micro': { cpu: 256, memory: 512 },
                'small': { cpu: 512, memory: 1024 },
                'medium': { cpu: 1024, memory: 2048 },
                'large': { cpu: 2048, memory: 4096 },
                'xlarge': { cpu: 4096, memory: 8192 },
                '2xlarge': { cpu: 8192, memory: 16384 },
                '4xlarge': { cpu: 16384, memory: 32768 },
            },
        });
    }
}
exports.FargateStack = FargateStack;
class SupabaseStack extends FargateStack {
    /** Supabase Stack */
    constructor(scope, id, props = {}) {
        super(scope, id, props);
        const disableSignup = new cdk.CfnParameter(this, 'DisableSignup', {
            description: 'When signup is disabled the only way to create new users is through invites. Defaults to false, all signups enabled.',
            type: 'String',
            default: 'false',
            allowedValues: ['true', 'false'],
        });
        const siteUrl = new cdk.CfnParameter(this, 'SiteUrl', {
            description: 'The base URL your site is located at. Currently used in combination with other settings to construct URLs used in emails.',
            type: 'String',
            default: 'http://localhost:3000',
        });
        const redirectUrls = new cdk.CfnParameter(this, 'RedirectUrls', {
            description: 'URLs that auth providers are permitted to redirect to post authentication',
            type: 'String',
            default: '',
        });
        const jwtExpiryLimit = new cdk.CfnParameter(this, 'JwtExpiryLimit', {
            description: 'How long tokens are valid for. Defaults to 3600 (1 hour), maximum 604,800 seconds (one week).',
            type: 'Number',
            default: 3600,
            minValue: 300,
            maxValue: 604800,
        });
        const passwordMinLength = new cdk.CfnParameter(this, 'PasswordMinLength', {
            description: 'When signup is disabled the only way to create new users is through invites. Defaults to false, all signups enabled.',
            type: 'Number',
            default: '8',
            minValue: 8,
            maxValue: 128,
        });
        const senderEmail = new cdk.CfnParameter(this, 'Email', {
            description: 'This is the email address the emails are sent from. If Amazon WorkMail is enabled, it set "noreply@supabase-<account_id>.awsapps.com"',
            type: 'String',
            default: 'noreply@example.com',
            allowedPattern: '^[\\x20-\\x45]?[\\w-\\+]+(\\.[\\w]+)*@[\\w-]+(\\.[\\w]+)*(\\.[a-z]{2,})$',
            constraintDescription: 'must be a valid email address',
        });
        const senderName = new cdk.CfnParameter(this, 'SenderName', {
            description: 'The From email sender name for all emails sent.',
            type: 'String',
            default: 'Supabase',
        });
        const authImageUri = new cdk.CfnParameter(this, 'AuthImageUri', {
            type: 'String',
            default: 'public.ecr.aws/supabase/gotrue:v2.110.0',
            description: 'https://gallery.ecr.aws/supabase/gotrue',
        });
        const restImageUri = new cdk.CfnParameter(this, 'RestImageUri', {
            type: 'String',
            default: 'public.ecr.aws/supabase/postgrest:v11.2.0',
            description: 'https://gallery.ecr.aws/supabase/postgrest',
        });
        const realtimeImageUri = new cdk.CfnParameter(this, 'RealtimeImageUri', {
            type: 'String',
            default: 'public.ecr.aws/supabase/realtime:v2.25.27',
            description: 'https://gallery.ecr.aws/supabase/realtime',
        });
        const storageImageUri = new cdk.CfnParameter(this, 'StorageImageUri', {
            type: 'String',
            default: 'public.ecr.aws/supabase/storage-api:v0.43.11',
            description: 'https://gallery.ecr.aws/supabase/storage-api',
        });
        const imgproxyImageUri = new cdk.CfnParameter(this, 'ImgproxyImageUri', {
            type: 'String',
            default: 'public.ecr.aws/supabase/imgproxy:v1.2.0',
            description: 'https://gallery.ecr.aws/supabase/imgproxy',
        });
        const postgresMetaImageUri = new cdk.CfnParameter(this, 'PostgresMetaImageUri', {
            type: 'String',
            default: 'public.ecr.aws/supabase/postgres-meta:v0.74.2',
            description: 'https://gallery.ecr.aws/supabase/postgres-meta',
        });
        /** The flag for High Availability */
        const enableHighAvailability = new cdk.CfnParameter(this, 'EnableHighAvailability', {
            description: 'Enable auto-scaling and clustering (Multi-AZ).',
            type: 'String',
            default: 'false',
            allowedValues: ['true', 'false'],
        });
        /** CFn condition for High Availability */
        const highAvailability = new cdk.CfnCondition(this, 'HighAvailability', { expression: cdk.Fn.conditionEquals(enableHighAvailability, 'true') });
        /** Web ACL for CloudFront */
        const webAclArn = new cdk.CfnParameter(this, 'WebAclArn', {
            description: 'Web ACL for CloudFront.',
            type: 'String',
            default: '',
            allowedPattern: '^arn:aws:wafv2:us-east-1:[0-9]{12}:global/webacl/[\\w-]+/[\\w]{8}-[\\w]{4}-[\\w]{4}-[\\w]{4}-[\\w]{12}$|',
        });
        /** The minimum number of aurora capacity units */
        const minACU = new cdk.CfnParameter(this, 'MinACU', {
            description: 'The minimum number of Aurora capacity units (ACU) for a DB instance in an Aurora Serverless v2 cluster.',
            type: 'Number',
            default: 0.5,
            minValue: 0.5,
            maxValue: 128,
        });
        /** The maximum number of aurora capacity units */
        const maxACU = new cdk.CfnParameter(this, 'MaxACU', {
            description: 'The maximum number of Aurora capacity units (ACU) for a DB instance in an Aurora Serverless v2 cluster.',
            type: 'Number',
            default: 32,
            minValue: 0.5,
            maxValue: 128,
        });
        /** The region name for Amazon SES */
        const sesRegion = new cdk.CfnParameter(this, 'SesRegion', {
            description: 'Amazon SES used for SMTP server. If you want to use Amazon WorkMail, need to set us-east-1, us-west-2 or eu-west-1.',
            type: 'String',
            default: 'us-west-2',
            allowedValues: ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ap-south-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-southeast-1', 'ap-southeast-2', 'ca-central-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'sa-east-1'],
        });
        /** The flag for Amazon WorkMail */
        const enableWorkMail = new cdk.CfnParameter(this, 'EnableWorkMail', {
            description: 'Enable test e-mail domain "xxx.awsapps.com" with Amazon WorkMail.',
            type: 'String',
            default: 'false',
            allowedValues: ['true', 'false'],
        });
        /** CFn condition for Amazon WorkMail */
        const workMailEnabled = new cdk.CfnCondition(this, 'WorkMailEnabled', { expression: cdk.Fn.conditionEquals(enableWorkMail, 'true') });
        /** CFn rule for Amazon WorkMail region */
        new cdk.CfnRule(this, 'CheckWorkMailRegion', {
            ruleCondition: workMailEnabled.expression,
            assertions: [{
                    assert: cdk.Fn.conditionContains(['us-east-1', 'us-west-2', 'eu-west-1'], sesRegion.valueAsString),
                    assertDescription: 'Amazon WorkMail is supported only in us-east-1, us-west-2 or eu-west-1. Please change Amazon SES Region.',
                }],
        });
        /** VPC for Containers and Database */
        const vpc = new aws_ec2_1.Vpc(this, 'VPC', { natGateways: 1 });
        /** Namespace name for CloudMap and ECS Service Connect */
        const namespaceName = 'supabase.internal';
        /** ECS Cluster for Supabase components */
        const cluster = new ecs.Cluster(this, 'Cluster', {
            enableFargateCapacityProviders: true,
            containerInsights: false,
            defaultCloudMapNamespace: {
                name: namespaceName,
                useForServiceConnect: true,
            },
            vpc,
        });
        /** PostgreSQL Database with Secrets */
        const db = new supabase_db_1.SupabaseDatabase(this, 'Database', {
            vpc,
            highAvailability,
        });
        /** SMTP Credentials */
        const smtp = new amazon_ses_smtp_1.SesSmtp(this, 'Smtp', {
            region: sesRegion.valueAsString,
            email: senderEmail.valueAsString,
            workMailEnabled: workMailEnabled,
        });
        // Overwrite ACU
        db.cluster.node.defaultChild.serverlessV2ScalingConfiguration = {
            minCapacity: minACU.valueAsNumber,
            maxCapacity: maxACU.valueAsNumber,
        };
        /** Secret of supabase_admin user */
        const supabaseAdminSecret = db.cluster.secret;
        /** Secret of supabase_auth_admin user */
        const supabaseAuthAdminSecret = db.genUserPassword('supabase_auth_admin');
        /** Secret of supabase_storage_admin user */
        const supabaseStorageAdminSecret = db.genUserPassword('supabase_storage_admin');
        /** Secret of authenticator user */
        const authenticatorSecret = db.genUserPassword('authenticator');
        /** Secret of dashboard user  */
        const dashboardUserSecret = db.genUserPassword('dashboard_user');
        /** Secret of postgres user */
        const postgresSecret = db.genUserPassword('postgres');
        /**
         * JWT Secret
         *
         * Used to decode your JWTs. You can also use this to mint your own JWTs.
         */
        const jwtSecret = new json_web_token_1.JwtSecret(this, 'JwtSecret');
        /**
         * Anonymous Key
         *
         * This key is safe to use in a browser if you have enabled Row Level Security for your tables and configured policies.
         */
        const anonKey = jwtSecret.genApiKey('AnonKey', { roleName: 'anon', issuer: 'supabase', expiresIn: '10y' });
        /**
         * Service Role Key
         *
         * This key has the ability to bypass Row Level Security. Never share it publicly.
         */
        const serviceRoleKey = jwtSecret.genApiKey('ServiceRoleKey', { roleName: 'service_role', issuer: 'supabase', expiresIn: '10y' });
        /** The load balancer for Kong Gateway */
        const loadBalancer = new elb.ApplicationLoadBalancer(this, 'LoadBalancer', { internetFacing: true, vpc });
        /** CloudFront Prefix List */
        const cfPrefixList = new aws_prefix_list_1.PrefixList(this, 'CloudFrontPrefixList', { prefixListName: 'com.amazonaws.global.cloudfront.origin-facing' });
        // Allow only CloudFront to connect the load balancer.
        loadBalancer.connections.allowFrom(aws_ec2_1.Peer.prefixList(cfPrefixList.prefixListId), aws_ec2_1.Port.tcp(80), 'CloudFront');
        /** CloudFront */
        const cdn = new supabase_cdn_1.SupabaseCdn(this, 'Cdn', {
            origin: loadBalancer,
            webAclArn,
        });
        /**
         * Supabase API URL
         *
         * e.g. https://xxx.cloudfront.net
         */
        const apiExternalUrl = `https://${cdn.distribution.domainName}`;
        /** API Gateway for Supabase */
        const kong = new ecs_patterns_1.AutoScalingFargateService(this, 'Kong', {
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry('public.ecr.aws/u3p7q2r8/kong:latest'),
                //image: ecs.ContainerImage.fromAsset('./containers/kong', { platform: Platform.LINUX_ARM64 }),
                containerPort: 8000,
                healthCheck: {
                    command: ['CMD', 'kong', 'health'],
                    interval: cdk.Duration.seconds(5),
                    timeout: cdk.Duration.seconds(5),
                    retries: 3,
                },
                environment: {
                    KONG_DNS_ORDER: 'LAST,A,CNAME',
                    KONG_PLUGINS: 'request-transformer,cors,key-auth,acl,basic-auth,opentelemetry',
                    KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: '160k',
                    KONG_NGINX_PROXY_PROXY_BUFFERS: '64 160k',
                    // for HealthCheck
                    KONG_STATUS_LISTEN: '0.0.0.0:8100',
                    // for OpenTelemetry
                    //KONG_OPENTELEMETRY_ENABLED: 'true',
                    //KONG_OPENTELEMETRY_TRACING: 'all',
                    //KONG_OPENTELEMETRY_TRACING_SAMPLING_RATE: '1.0',
                },
                secrets: {
                    SUPABASE_ANON_KEY: ecs.Secret.fromSsmParameter(anonKey.ssmParameter),
                    SUPABASE_SERVICE_KEY: ecs.Secret.fromSsmParameter(serviceRoleKey.ssmParameter),
                },
            },
            highAvailability,
        });
        /** TargetGroup for kong-gateway */
        const kongTargetGroup = kong.addTargetGroup({
            healthCheck: {
                port: '8100',
                path: '/status',
                timeout: cdk.Duration.seconds(2),
                interval: cdk.Duration.seconds(5),
            },
        });
        /** Listner for kong-gateway */
        const listener = loadBalancer.addListener('Listener', {
            port: 80,
            defaultTargetGroups: [kongTargetGroup],
            open: false,
        });
        // Allow the load balancer to connect kong-gateway.
        kong.connections.allowFrom(loadBalancer, aws_ec2_1.Port.tcp(8100), 'ALB healthcheck');
        /** GoTrue - Authentication and User Management by Supabase */
        const auth = new ecs_patterns_1.AutoScalingFargateService(this, 'Auth', {
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry(authImageUri.valueAsString),
                containerPort: 9999,
                healthCheck: {
                    command: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:9999/health'],
                    interval: cdk.Duration.seconds(5),
                    timeout: cdk.Duration.seconds(5),
                    retries: 3,
                },
                environment: {
                    GOTRUE_API_HOST: '0.0.0.0',
                    GOTRUE_API_PORT: '9999',
                    API_EXTERNAL_URL: apiExternalUrl,
                    GOTRUE_DB_DRIVER: 'postgres',
                    GOTRUE_SITE_URL: siteUrl.valueAsString,
                    GOTRUE_URI_ALLOW_LIST: redirectUrls.valueAsString,
                    GOTRUE_DISABLE_SIGNUP: disableSignup.valueAsString,
                    GOTRUE_JWT_ADMIN_ROLES: 'service_role',
                    GOTRUE_JWT_AUD: 'authenticated',
                    GOTRUE_JWT_DEFAULT_GROUP_NAME: 'authenticated',
                    GOTRUE_JWT_EXP: jwtExpiryLimit.valueAsString,
                    GOTRUE_EXTERNAL_EMAIL_ENABLED: 'true',
                    GOTRUE_MAILER_AUTOCONFIRM: 'false',
                    //GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED: 'true',
                    //GOTRUE_SMTP_MAX_FREQUENCY: '1s',
                    GOTRUE_SMTP_ADMIN_EMAIL: smtp.email,
                    GOTRUE_SMTP_HOST: smtp.host,
                    GOTRUE_SMTP_PORT: smtp.port.toString(),
                    GOTRUE_SMTP_SENDER_NAME: senderName.valueAsString,
                    GOTRUE_MAILER_URLPATHS_INVITE: '/auth/v1/verify',
                    GOTRUE_MAILER_URLPATHS_CONFIRMATION: '/auth/v1/verify',
                    GOTRUE_MAILER_URLPATHS_RECOVERY: '/auth/v1/verify',
                    GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: '/auth/v1/verify',
                    GOTRUE_EXTERNAL_PHONE_ENABLED: 'false',
                    GOTRUE_SMS_AUTOCONFIRM: 'true',
                    GOTRUE_RATE_LIMIT_EMAIL_SENT: '3600',
                    GOTRUE_PASSWORD_MIN_LENGTH: passwordMinLength.valueAsString,
                    //GOTRUE_TRACING_ENABLED: 'true',
                    //OTEL_SERVICE_NAME: 'gotrue',
                    //OTEL_EXPORTER_OTLP_PROTOCOL: 'grpc',
                    //OTEL_EXPORTER_OTLP_ENDPOINT: `http://${jaeger.dnsName}:4317`,
                },
                secrets: {
                    GOTRUE_DB_DATABASE_URL: ecs.Secret.fromSecretsManager(supabaseAuthAdminSecret, 'uri'),
                    GOTRUE_JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
                    GOTRUE_SMTP_USER: ecs.Secret.fromSecretsManager(smtp.secret, 'username'),
                    GOTRUE_SMTP_PASS: ecs.Secret.fromSecretsManager(smtp.secret, 'password'),
                },
            },
            highAvailability,
        });
        const authProviders = auth.addExternalAuthProviders(`${apiExternalUrl}/auth/v1/callback`, 3);
        /** RESTful API for any PostgreSQL Database */
        const rest = new ecs_patterns_1.AutoScalingFargateService(this, 'Rest', {
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry(restImageUri.valueAsString),
                containerPort: 3000,
                environment: {
                    PGRST_DB_SCHEMAS: 'public,storage,graphql_public',
                    PGRST_DB_ANON_ROLE: 'anon',
                    PGRST_DB_USE_LEGACY_GUCS: 'false',
                    PGRST_APP_SETTINGS_JWT_EXP: jwtExpiryLimit.valueAsString,
                },
                secrets: {
                    PGRST_DB_URI: ecs.Secret.fromSecretsManager(authenticatorSecret, 'uri'),
                    PGRST_JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
                    PGRST_APP_SETTINGS_JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
                },
            },
            highAvailability,
        });
        /** GraphQL API for any PostgreSQL Database */
        //const gql = new AutoScalingFargateService(this, 'GraphQL', {
        //  cluster,
        //  taskImageOptions: {
        //    image: ecs.ContainerImage.fromRegistry('public.ecr.aws/u3p7q2r8/postgraphile:latest'),
        //    //image: ecs.ContainerImage.fromAsset('./containers/postgraphile', { platform: Platform.LINUX_ARM64 }),
        //    containerPort: 5000,
        //    healthCheck: {
        //      command: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:5000/health'],
        //      interval: cdk.Duration.seconds(5),
        //      timeout: cdk.Duration.seconds(5),
        //      retries: 3,
        //    },
        //    environment: {
        //      PG_GRAPHIQL: 'false',
        //      PG_ENHANCE_GRAPHIQL: 'false',
        //      PG_IGNORE_RBAC: 'false',
        //    },
        //    secrets: {
        //      DATABASE_URL: ecs.Secret.fromSecretsManager(authenticatorSecret, 'uri'),
        //      JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
        //    },
        //  },
        //  highAvailability,
        //});
        /**  Secret used by the server to sign cookies. Recommended: 64 characters. */
        const cookieSigningSecret = new aws_secretsmanager_1.Secret(this, 'CookieSigningSecret', {
            secretName: `${cdk.Aws.STACK_NAME}-Realtime-CookieSigning-Secret`,
            description: 'Supabase - Cookie Signing Secret for Realtime',
            generateSecretString: {
                passwordLength: 64,
                excludePunctuation: true,
            },
        });
        /** Websocket API */
        const realtime = new ecs_patterns_1.AutoScalingFargateService(this, 'Realtime', {
            serviceName: 'realtime-dev',
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry(realtimeImageUri.valueAsString),
                containerPort: 4000,
                environment: {
                    PORT: '4000',
                    DB_HOST: db.cluster.clusterEndpoint.hostname,
                    DB_PORT: db.cluster.clusterEndpoint.port.toString(),
                    DB_AFTER_CONNECT_QUERY: 'SET search_path TO realtime',
                    DB_ENC_KEY: 'supabaserealtime',
                    FLY_ALLOC_ID: 'fly123',
                    FLY_APP_NAME: 'realtime',
                    ERL_AFLAGS: '-proto_dist inet_tcp',
                    ENABLE_TAILSCALE: 'false',
                    DNS_NODES: `realtime-dev.${namespaceName}`,
                },
                secrets: {
                    DB_USER: ecs.Secret.fromSecretsManager(supabaseAdminSecret, 'username'),
                    DB_PASSWORD: ecs.Secret.fromSecretsManager(supabaseAdminSecret, 'password'),
                    DB_NAME: ecs.Secret.fromSecretsManager(supabaseAdminSecret, 'dbname'),
                    API_JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
                    SECRET_KEY_BASE: ecs.Secret.fromSecretsManager(cookieSigningSecret),
                },
                entryPoint: ['/usr/bin/tini', '-s', '-g', '--'],
                command: ['sh', '-c', '/app/bin/migrate && /app/bin/realtime eval "Realtime.Release.seeds(Realtime.Repo)" && /app/bin/server'],
            },
            highAvailability,
        });
        // Wait until the database migration is complete.
        realtime.service.node.addDependency(db.migration.node.defaultChild);
        // Allow each container to connect others in cluster
        realtime.connections.allowInternally(aws_ec2_1.Port.allTraffic());
        /** Supabase Storage Backend */
        const bucket = new s3.Bucket(this, 'Bucket', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        });
        /** API & Queue of Cache Manager */
        const cacheManager = cdn.addCacheManager();
        /** Image Transformer for Storage */
        const imgproxy = new ecs_patterns_1.AutoScalingFargateService(this, 'Imgproxy', {
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry(imgproxyImageUri.valueAsString),
                containerPort: 5001,
                healthCheck: {
                    command: ['CMD', 'imgproxy', 'health'],
                    interval: cdk.Duration.seconds(5),
                    timeout: cdk.Duration.seconds(5),
                    retries: 3,
                },
                environment: {
                    IMGPROXY_BIND: ':5001',
                    IMGPROXY_LOCAL_FILESYSTEM_ROOT: '/',
                    IMGPROXY_USE_ETAG: 'true',
                    IMGPROXY_ENABLE_WEBP_DETECTION: 'true',
                },
            },
            highAvailability,
        });
        /** S3 compatible object storage API that stores metadata in Postgres */
        const storage = new ecs_patterns_1.AutoScalingFargateService(this, 'Storage', {
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry(storageImageUri.valueAsString),
                containerPort: 5000,
                healthCheck: {
                    command: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:5000/status'],
                    interval: cdk.Duration.seconds(5),
                    timeout: cdk.Duration.seconds(5),
                    retries: 3,
                },
                environment: {
                    POSTGREST_URL: `${rest.endpoint}`,
                    PGOPTIONS: '-c search_path=storage,public',
                    FILE_SIZE_LIMIT: '52428800',
                    STORAGE_BACKEND: 's3',
                    TENANT_ID: 'stub',
                    IS_MULTITENANT: 'false',
                    // TODO: https://github.com/supabase/storage-api/issues/55
                    REGION: cdk.Aws.REGION,
                    GLOBAL_S3_BUCKET: bucket.bucketName,
                    ENABLE_IMAGE_TRANSFORMATION: 'true',
                    IMGPROXY_URL: imgproxy.endpoint,
                    // Smart CDN Caching
                    WEBHOOK_URL: cacheManager.url,
                    ENABLE_QUEUE_EVENTS: 'false',
                },
                secrets: {
                    ANON_KEY: ecs.Secret.fromSsmParameter(anonKey.ssmParameter),
                    SERVICE_KEY: ecs.Secret.fromSsmParameter(serviceRoleKey.ssmParameter),
                    PGRST_JWT_SECRET: ecs.Secret.fromSecretsManager(jwtSecret),
                    DATABASE_URL: ecs.Secret.fromSecretsManager(supabaseStorageAdminSecret, 'uri'),
                    WEBHOOK_API_KEY: ecs.Secret.fromSecretsManager(cacheManager.apiKey),
                },
            },
            highAvailability,
        });
        // Allow storage-api to read and write to the bucket
        bucket.grantReadWrite(storage.service.taskDefinition.taskRole);
        /** A RESTful API for managing your Postgres. Fetch tables, add roles, and run queries */
        const meta = new ecs_patterns_1.AutoScalingFargateService(this, 'Meta', {
            cluster,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry(postgresMetaImageUri.valueAsString),
                containerPort: 8080,
                environment: {
                    PG_META_PORT: '8080',
                    PG_META_DB_HOST: db.cluster.clusterEndpoint.hostname,
                    PG_META_DB_PORT: db.cluster.clusterEndpoint.port.toString(),
                },
                secrets: {
                    PG_META_DB_NAME: ecs.Secret.fromSecretsManager(supabaseAdminSecret, 'dbname'),
                    PG_META_DB_USER: ecs.Secret.fromSecretsManager(supabaseAdminSecret, 'username'),
                    PG_META_DB_PASSWORD: ecs.Secret.fromSecretsManager(supabaseAdminSecret, 'password'),
                },
            },
            highAvailability,
        });
        // Wait until the database migration is complete.
        meta.service.node.addDependency(db.migration.node.defaultChild);
        // Add environment variables to kong-gateway
        kong.service.taskDefinition.defaultContainer.addEnvironment('SUPABASE_AUTH_URL', `${auth.endpoint}/`);
        kong.service.taskDefinition.defaultContainer.addEnvironment('SUPABASE_REST_URL', `${rest.endpoint}/`);
        //kong.service.taskDefinition.defaultContainer!.addEnvironment('SUPABASE_GRAPHQL_URL', `${gql.endpoint}/graphql`);
        kong.service.taskDefinition.defaultContainer.addEnvironment('SUPABASE_REALTIME_URL', `${realtime.endpoint}/socket/`);
        kong.service.taskDefinition.defaultContainer.addEnvironment('SUPABASE_STORAGE_URL', `${storage.endpoint}/`);
        kong.service.taskDefinition.defaultContainer.addEnvironment('SUPABASE_META_HOST', `${meta.endpoint}/`);
        // Allow kong-gateway to connect other services
        kong.connections.allowToDefaultPort(auth);
        kong.connections.allowToDefaultPort(rest);
        //kong.connections.allowToDefaultPort(gql);
        kong.connections.allowToDefaultPort(realtime);
        kong.connections.allowToDefaultPort(storage);
        kong.connections.allowToDefaultPort(meta);
        auth.connections.allowToDefaultPort(rest);
        storage.connections.allowToDefaultPort(rest);
        storage.connections.allowToDefaultPort(imgproxy);
        // Allow some services to connect the database
        auth.connections.allowToDefaultPort(db.cluster);
        rest.connections.allowToDefaultPort(db.cluster);
        //gql.connections.allowToDefaultPort(db.cluster);
        realtime.connections.allowToDefaultPort(db.cluster);
        storage.connections.allowToDefaultPort(db.cluster);
        meta.connections.allowToDefaultPort(db.cluster);
        const forceDeployJob = new ecs_force_deploy_job_1.ForceDeployJob(this, 'ForceDeployJob', { cluster });
        // for DB secret rotation
        //forceDeployJob.addTrigger({
        //  rule: db.secretRotationSucceeded,
        //});
        // for Auth provider settings changed
        forceDeployJob.addTrigger({
            input: { services: [auth.service.serviceArn] },
            rule: new events.Rule(this, 'AuthParameterChanged', {
                description: 'Supabase - Auth parameter changed',
                eventPattern: {
                    source: ['aws.ssm'],
                    detailType: ['Parameter Store Change'],
                    detail: {
                        name: [{ prefix: `/${cdk.Aws.STACK_NAME}/${auth.node.id}/` }],
                        operation: ['Update'],
                    },
                },
            }),
        });
        /** Supabase Studio Version */
        const studioBranch = new cdk.CfnParameter(this, 'StudioBranch', {
            type: 'String',
            default: 'v0.23.09',
            description: 'Branch or tag - https://github.com/supabase/supabase/tags',
        });
        /** Supabase Studio */
        const studio = new supabase_studio_1.SupabaseStudio(this, 'Studio', {
            sourceBranch: studioBranch.valueAsString,
            supabaseUrl: apiExternalUrl,
            dbSecret: dashboardUserSecret,
            anonKey: anonKey.ssmParameter,
            serviceRoleKey: serviceRoleKey.ssmParameter,
        });
        new cdk.CfnOutput(this, 'StudioUrl', {
            value: studio.prodBranchUrl,
            description: 'The dashboard for Supabase projects.',
        });
        new cdk.CfnOutput(this, 'SupabaseUrl', {
            value: apiExternalUrl,
            description: 'A RESTful endpoint for querying and managing your database.',
            exportName: `${cdk.Aws.STACK_NAME}Url`,
        });
        new cdk.CfnOutput(this, 'SupabasAnonKey', {
            value: anonKey.value,
            description: 'This key is safe to use in a browser if you have enabled Row Level Security for your tables and configured policies.',
            exportName: `${cdk.Aws.STACK_NAME}AnonKey`,
        });
        /**
         * CloudFormation Interface
         * @resource AWS::CloudFormation::Interface
         */
        const cfnInterface = {
            ParameterGroups: [
                {
                    Label: { default: 'Supabase - Auth Settings' },
                    Parameters: [
                        disableSignup.logicalId,
                        siteUrl.logicalId,
                        redirectUrls.logicalId,
                        jwtExpiryLimit.logicalId,
                        passwordMinLength.logicalId,
                    ],
                },
                {
                    Label: { default: 'Supabase - SMTP Settings' },
                    Parameters: [
                        senderEmail.logicalId,
                        senderName.logicalId,
                        sesRegion.logicalId,
                        enableWorkMail.logicalId,
                    ],
                },
                {
                    Label: { default: 'Supabase - Versions (Container Images)' },
                    Parameters: [
                        authImageUri.logicalId,
                        restImageUri.logicalId,
                        realtimeImageUri.logicalId,
                        storageImageUri.logicalId,
                        imgproxyImageUri.logicalId,
                        postgresMetaImageUri.logicalId,
                        studioBranch.logicalId,
                    ],
                },
                {
                    Label: { default: 'Infrastructure Settings' },
                    Parameters: [
                        enableHighAvailability.logicalId,
                        webAclArn.logicalId,
                    ],
                },
                {
                    Label: { default: 'Infrastructure Settings - Database' },
                    Parameters: [
                        minACU.logicalId,
                        maxACU.logicalId,
                    ],
                },
                {
                    Label: { default: 'Infrastructure Settings - Containers' },
                    Parameters: [
                        kong.taskSize.logicalId,
                        auth.taskSize.logicalId,
                        rest.taskSize.logicalId,
                        //gql.taskSize.logicalId,
                        realtime.taskSize.logicalId,
                        storage.taskSize.logicalId,
                        imgproxy.taskSize.logicalId,
                        meta.taskSize.logicalId,
                    ],
                },
            ],
            ParameterLabels: {
                [disableSignup.logicalId]: { default: 'Disable User Signups' },
                [siteUrl.logicalId]: { default: 'Site URL' },
                [redirectUrls.logicalId]: { default: 'Redirect URLs' },
                [jwtExpiryLimit.logicalId]: { default: 'JWT expiry limit' },
                [passwordMinLength.logicalId]: { default: 'Min password length' },
                [senderEmail.logicalId]: { default: 'Sender Email Address' },
                [senderName.logicalId]: { default: 'Sender Name' },
                [sesRegion.logicalId]: { default: 'Amazon SES Region' },
                [enableWorkMail.logicalId]: { default: 'Enable Test E-mail Domain (via Amazon WorkMail)' },
                [authImageUri.logicalId]: { default: 'Image URI - GoTrue' },
                [restImageUri.logicalId]: { default: 'Image URI - PostgREST' },
                [realtimeImageUri.logicalId]: { default: 'Image URI - Realtime' },
                [storageImageUri.logicalId]: { default: 'Image URI - Storage' },
                [imgproxyImageUri.logicalId]: { default: 'Image URI - imgproxy' },
                [postgresMetaImageUri.logicalId]: { default: 'Image URI - postgres-meta' },
                [enableHighAvailability.logicalId]: { default: 'High Availability (HA)' },
                [webAclArn.logicalId]: { default: 'Web ACL ARN (AWS WAF)' },
                [minACU.logicalId]: { default: 'Minimum ACUs' },
                [maxACU.logicalId]: { default: 'Maximum ACUs' },
                [kong.taskSize.logicalId]: { default: 'Task Size - Kong' },
                [auth.taskSize.logicalId]: { default: 'Task Size - GoTrue' },
                [rest.taskSize.logicalId]: { default: 'Task Size - PostgREST' },
                //[gql.taskSize.logicalId]: { default: 'Task Size - PostGraphile' },
                [realtime.taskSize.logicalId]: { default: 'Task Size - Realtime' },
                [storage.taskSize.logicalId]: { default: 'Task Size - Storage' },
                [imgproxy.taskSize.logicalId]: { default: 'Task Size - imgproxy' },
                [meta.taskSize.logicalId]: { default: 'Task Size - postgres-meta' },
                [studioBranch.logicalId]: { default: 'Supabase Studio Branch' },
            },
        };
        for (let i = 0; i < authProviders.length; i++) {
            const provider = authProviders[i];
            cfnInterface.ParameterGroups.push({
                Label: { default: `External Auth Provider ${i + 1}` },
                Parameters: [
                    provider.name.logicalId,
                    provider.clientId.logicalId,
                    provider.secret.logicalId,
                ],
            });
            cfnInterface.ParameterLabels[provider.name.logicalId] = { default: 'Provider Name' };
            cfnInterface.ParameterLabels[provider.clientId.logicalId] = { default: 'Client ID' };
            cfnInterface.ParameterLabels[provider.secret.logicalId] = { default: 'Client Secret' };
        }
        // for CloudFormation
        this.templateOptions.description = 'Self-hosted Supabase';
        this.templateOptions.metadata = { 'AWS::CloudFormation::Interface': cfnInterface };
    }
}
exports.SupabaseStack = SupabaseStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwYWJhc2Utc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvc3VwYWJhc2Utc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsaURBQXNEO0FBRXRELHlEQUEyQztBQUMzQyw0RUFBOEQ7QUFDOUQsK0RBQWlEO0FBRWpELHVEQUF5QztBQUN6Qyx1RUFBd0Q7QUFFeEQsdURBQTRDO0FBQzVDLHVEQUErQztBQUMvQyxpRUFBd0Q7QUFDeEQsaURBQTJEO0FBQzNELHFEQUE2QztBQUM3QyxpREFBNkM7QUFDN0MsK0NBQWlEO0FBQ2pELHVEQUFtRDtBQUVuRCxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQUl6QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLFFBQXdCLEVBQUU7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUMxRCxPQUFPLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2dCQUNqQyxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQ2xDLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtnQkFDbkMsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFO2dCQUNyQyxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUU7Z0JBQ3BDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSxJQUFJ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RSxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsQ0FBQyxHQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNuRCxVQUFVLEVBQUU7b0JBQ1YsUUFBUSxDQUFDLElBQUksQ0FBQyxTQUFTO29CQUN2QixRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVM7b0JBQzNCLFFBQVEsQ0FBQyxNQUFNLENBQUMsU0FBUztpQkFDMUI7YUFDRixDQUFDLENBQUM7WUFDSCxZQUFZLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUM7WUFDckYsWUFBWSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDO1lBQ3JGLFlBQVksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsQ0FBQztTQUN4RjtRQUVELHFCQUFxQjtRQUNyQixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsR0FBRyxzQkFBc0IsQ0FBQztRQUMxRCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsR0FBRyxFQUFFLGdDQUFnQyxFQUFFLFlBQVksRUFBRSxDQUFDO0lBRXJGLENBQUM7Q0FDRjtBQWp2QkQsc0NBaXZCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IFZwYywgUG9ydCwgUGVlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG5pbXBvcnQgeyBQbGF0Zm9ybSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3ItYXNzZXRzJztcclxuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xyXG5pbXBvcnQgKiBhcyBlbGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xyXG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cyc7XHJcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0IHsgU2VjcmV0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IFNlc1NtdHAgfSBmcm9tICcuL2FtYXpvbi1zZXMtc210cCc7XHJcbmltcG9ydCB7IFByZWZpeExpc3QgfSBmcm9tICcuL2F3cy1wcmVmaXgtbGlzdCc7XHJcbmltcG9ydCB7IEZvcmNlRGVwbG95Sm9iIH0gZnJvbSAnLi9lY3MtZm9yY2UtZGVwbG95LWpvYic7XHJcbmltcG9ydCB7IEF1dG9TY2FsaW5nRmFyZ2F0ZVNlcnZpY2UgfSBmcm9tICcuL2Vjcy1wYXR0ZXJucyc7XHJcbmltcG9ydCB7IEp3dFNlY3JldCB9IGZyb20gJy4vanNvbi13ZWItdG9rZW4nO1xyXG5pbXBvcnQgeyBTdXBhYmFzZUNkbiB9IGZyb20gJy4vc3VwYWJhc2UtY2RuJztcclxuaW1wb3J0IHsgU3VwYWJhc2VEYXRhYmFzZSB9IGZyb20gJy4vc3VwYWJhc2UtZGInO1xyXG5pbXBvcnQgeyBTdXBhYmFzZVN0dWRpbyB9IGZyb20gJy4vc3VwYWJhc2Utc3R1ZGlvJztcclxuXHJcbmV4cG9ydCBjbGFzcyBGYXJnYXRlU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIC8qKiBFQ1MgRmFyZ2F0ZSB0YXNrIHNpemUgbWFwcGluZ3MgKi9cclxuICByZWFkb25seSB0YXNrU2l6ZU1hcHBpbmc6IGNkay5DZm5NYXBwaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogY2RrLlN0YWNrUHJvcHMgPSB7fSkge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgdGhpcy50YXNrU2l6ZU1hcHBpbmcgPSBuZXcgY2RrLkNmbk1hcHBpbmcodGhpcywgJ1Rhc2tTaXplJywge1xyXG4gICAgICBtYXBwaW5nOiB7XHJcbiAgICAgICAgJ25vbmUnOiB7IGNwdTogMjU2LCBtZW1vcnk6IDUxMiB9LCAvLyBEaXNhYmxlIEVDUyBTZXJ2aWNlXHJcbiAgICAgICAgJ21pY3JvJzogeyBjcHU6IDI1NiwgbWVtb3J5OiA1MTIgfSxcclxuICAgICAgICAnc21hbGwnOiB7IGNwdTogNTEyLCBtZW1vcnk6IDEwMjQgfSxcclxuICAgICAgICAnbWVkaXVtJzogeyBjcHU6IDEwMjQsIG1lbW9yeTogMjA0OCB9LFxyXG4gICAgICAgICdsYXJnZSc6IHsgY3B1OiAyMDQ4LCBtZW1vcnk6IDQwOTYgfSxcclxuICAgICAgICAneGxhcmdlJzogeyBjcHU6IDQwOTYsIG1lbW9yeTogODE5MiB9LFxyXG4gICAgICAgICcyeGxhcmdlJzogeyBjcHU6IDgxOTIsIG1lbW9yeTogMTYzODQgfSxcclxuICAgICAgICAnNHhsYXJnZSc6IHsgY3B1OiAxNjM4NCwgbWVtb3J5OiAzMjc2OCB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3VwYWJhc2VTdGFjayBleHRlbmRzIEZhcmdhdGVTdGFjayB7XHJcblxyXG4gIC8qKiBTdXBhYmFzZSBTdGFjayAqL1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBjZGsuU3RhY2tQcm9wcyA9IHt9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCBkaXNhYmxlU2lnbnVwID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ0Rpc2FibGVTaWdudXAnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2hlbiBzaWdudXAgaXMgZGlzYWJsZWQgdGhlIG9ubHkgd2F5IHRvIGNyZWF0ZSBuZXcgdXNlcnMgaXMgdGhyb3VnaCBpbnZpdGVzLiBEZWZhdWx0cyB0byBmYWxzZSwgYWxsIHNpZ251cHMgZW5hYmxlZC4nLFxyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVmYXVsdDogJ2ZhbHNlJyxcclxuICAgICAgYWxsb3dlZFZhbHVlczogWyd0cnVlJywgJ2ZhbHNlJ10sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzaXRlVXJsID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1NpdGVVcmwnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGJhc2UgVVJMIHlvdXIgc2l0ZSBpcyBsb2NhdGVkIGF0LiBDdXJyZW50bHkgdXNlZCBpbiBjb21iaW5hdGlvbiB3aXRoIG90aGVyIHNldHRpbmdzIHRvIGNvbnN0cnVjdCBVUkxzIHVzZWQgaW4gZW1haWxzLicsXHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlZGlyZWN0VXJscyA9IG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdSZWRpcmVjdFVybHMnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVVJMcyB0aGF0IGF1dGggcHJvdmlkZXJzIGFyZSBwZXJtaXR0ZWQgdG8gcmVkaXJlY3QgdG8gcG9zdCBhdXRoZW50aWNhdGlvbicsXHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAnJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGp3dEV4cGlyeUxpbWl0ID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ0p3dEV4cGlyeUxpbWl0Jywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ0hvdyBsb25nIHRva2VucyBhcmUgdmFsaWQgZm9yLiBEZWZhdWx0cyB0byAzNjAwICgxIGhvdXIpLCBtYXhpbXVtIDYwNCw4MDAgc2Vjb25kcyAob25lIHdlZWspLicsXHJcbiAgICAgIHR5cGU6ICdOdW1iZXInLFxyXG4gICAgICBkZWZhdWx0OiAzNjAwLFxyXG4gICAgICBtaW5WYWx1ZTogMzAwLFxyXG4gICAgICBtYXhWYWx1ZTogNjA0ODAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcGFzc3dvcmRNaW5MZW5ndGggPSBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnUGFzc3dvcmRNaW5MZW5ndGgnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2hlbiBzaWdudXAgaXMgZGlzYWJsZWQgdGhlIG9ubHkgd2F5IHRvIGNyZWF0ZSBuZXcgdXNlcnMgaXMgdGhyb3VnaCBpbnZpdGVzLiBEZWZhdWx0cyB0byBmYWxzZSwgYWxsIHNpZ251cHMgZW5hYmxlZC4nLFxyXG4gICAgICB0eXBlOiAnTnVtYmVyJyxcclxuICAgICAgZGVmYXVsdDogJzgnLFxyXG4gICAgICBtaW5WYWx1ZTogOCxcclxuICAgICAgbWF4VmFsdWU6IDEyOCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHNlbmRlckVtYWlsID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ0VtYWlsJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RoaXMgaXMgdGhlIGVtYWlsIGFkZHJlc3MgdGhlIGVtYWlscyBhcmUgc2VudCBmcm9tLiBJZiBBbWF6b24gV29ya01haWwgaXMgZW5hYmxlZCwgaXQgc2V0IFwibm9yZXBseUBzdXBhYmFzZS08YWNjb3VudF9pZD4uYXdzYXBwcy5jb21cIicsXHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAnbm9yZXBseUBleGFtcGxlLmNvbScsXHJcbiAgICAgIGFsbG93ZWRQYXR0ZXJuOiAnXltcXFxceDIwLVxcXFx4NDVdP1tcXFxcdy1cXFxcK10rKFxcXFwuW1xcXFx3XSspKkBbXFxcXHctXSsoXFxcXC5bXFxcXHddKykqKFxcXFwuW2Etel17Mix9KSQnLFxyXG4gICAgICBjb25zdHJhaW50RGVzY3JpcHRpb246ICdtdXN0IGJlIGEgdmFsaWQgZW1haWwgYWRkcmVzcycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzZW5kZXJOYW1lID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1NlbmRlck5hbWUnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIEZyb20gZW1haWwgc2VuZGVyIG5hbWUgZm9yIGFsbCBlbWFpbHMgc2VudC4nLFxyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVmYXVsdDogJ1N1cGFiYXNlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGF1dGhJbWFnZVVyaSA9IG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdBdXRoSW1hZ2VVcmknLCB7XHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAncHVibGljLmVjci5hd3Mvc3VwYWJhc2UvZ290cnVlOnYyLjExMC4wJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdodHRwczovL2dhbGxlcnkuZWNyLmF3cy9zdXBhYmFzZS9nb3RydWUnLFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCByZXN0SW1hZ2VVcmkgPSBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnUmVzdEltYWdlVXJpJywge1xyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVmYXVsdDogJ3B1YmxpYy5lY3IuYXdzL3N1cGFiYXNlL3Bvc3RncmVzdDp2MTEuMi4wJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdodHRwczovL2dhbGxlcnkuZWNyLmF3cy9zdXBhYmFzZS9wb3N0Z3Jlc3QnLFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCByZWFsdGltZUltYWdlVXJpID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1JlYWx0aW1lSW1hZ2VVcmknLCB7XHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAncHVibGljLmVjci5hd3Mvc3VwYWJhc2UvcmVhbHRpbWU6djIuMjUuMjcnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ2h0dHBzOi8vZ2FsbGVyeS5lY3IuYXdzL3N1cGFiYXNlL3JlYWx0aW1lJyxcclxuICAgIH0pO1xyXG4gICAgY29uc3Qgc3RvcmFnZUltYWdlVXJpID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1N0b3JhZ2VJbWFnZVVyaScsIHtcclxuICAgICAgdHlwZTogJ1N0cmluZycsXHJcbiAgICAgIGRlZmF1bHQ6ICdwdWJsaWMuZWNyLmF3cy9zdXBhYmFzZS9zdG9yYWdlLWFwaTp2MC40My4xMScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnaHR0cHM6Ly9nYWxsZXJ5LmVjci5hd3Mvc3VwYWJhc2Uvc3RvcmFnZS1hcGknLFxyXG4gICAgfSk7XHJcbiAgICBjb25zdCBpbWdwcm94eUltYWdlVXJpID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ0ltZ3Byb3h5SW1hZ2VVcmknLCB7XHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAncHVibGljLmVjci5hd3Mvc3VwYWJhc2UvaW1ncHJveHk6djEuMi4wJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdodHRwczovL2dhbGxlcnkuZWNyLmF3cy9zdXBhYmFzZS9pbWdwcm94eScsXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IHBvc3RncmVzTWV0YUltYWdlVXJpID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1Bvc3RncmVzTWV0YUltYWdlVXJpJywge1xyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVmYXVsdDogJ3B1YmxpYy5lY3IuYXdzL3N1cGFiYXNlL3Bvc3RncmVzLW1ldGE6djAuNzQuMicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnaHR0cHM6Ly9nYWxsZXJ5LmVjci5hd3Mvc3VwYWJhc2UvcG9zdGdyZXMtbWV0YScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKiogVGhlIGZsYWcgZm9yIEhpZ2ggQXZhaWxhYmlsaXR5ICovXHJcbiAgICBjb25zdCBlbmFibGVIaWdoQXZhaWxhYmlsaXR5ID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ0VuYWJsZUhpZ2hBdmFpbGFiaWxpdHknLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRW5hYmxlIGF1dG8tc2NhbGluZyBhbmQgY2x1c3RlcmluZyAoTXVsdGktQVopLicsXHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAnZmFsc2UnLFxyXG4gICAgICBhbGxvd2VkVmFsdWVzOiBbJ3RydWUnLCAnZmFsc2UnXSxcclxuICAgIH0pO1xyXG4gICAgLyoqIENGbiBjb25kaXRpb24gZm9yIEhpZ2ggQXZhaWxhYmlsaXR5ICovXHJcbiAgICBjb25zdCBoaWdoQXZhaWxhYmlsaXR5ID0gbmV3IGNkay5DZm5Db25kaXRpb24odGhpcywgJ0hpZ2hBdmFpbGFiaWxpdHknLCB7IGV4cHJlc3Npb246IGNkay5Gbi5jb25kaXRpb25FcXVhbHMoZW5hYmxlSGlnaEF2YWlsYWJpbGl0eSwgJ3RydWUnKSB9KTtcclxuXHJcbiAgICAvKiogV2ViIEFDTCBmb3IgQ2xvdWRGcm9udCAqL1xyXG4gICAgY29uc3Qgd2ViQWNsQXJuID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1dlYkFjbEFybicsIHtcclxuICAgICAgZGVzY3JpcHRpb246ICdXZWIgQUNMIGZvciBDbG91ZEZyb250LicsXHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAnJyxcclxuICAgICAgYWxsb3dlZFBhdHRlcm46ICdeYXJuOmF3czp3YWZ2Mjp1cy1lYXN0LTE6WzAtOV17MTJ9Omdsb2JhbC93ZWJhY2wvW1xcXFx3LV0rL1tcXFxcd117OH0tW1xcXFx3XXs0fS1bXFxcXHddezR9LVtcXFxcd117NH0tW1xcXFx3XXsxMn0kfCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKiogVGhlIG1pbmltdW0gbnVtYmVyIG9mIGF1cm9yYSBjYXBhY2l0eSB1bml0cyAqL1xyXG4gICAgY29uc3QgbWluQUNVID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ01pbkFDVScsIHtcclxuICAgICAgZGVzY3JpcHRpb246ICdUaGUgbWluaW11bSBudW1iZXIgb2YgQXVyb3JhIGNhcGFjaXR5IHVuaXRzIChBQ1UpIGZvciBhIERCIGluc3RhbmNlIGluIGFuIEF1cm9yYSBTZXJ2ZXJsZXNzIHYyIGNsdXN0ZXIuJyxcclxuICAgICAgdHlwZTogJ051bWJlcicsXHJcbiAgICAgIGRlZmF1bHQ6IDAuNSxcclxuICAgICAgbWluVmFsdWU6IDAuNSxcclxuICAgICAgbWF4VmFsdWU6IDEyOCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBUaGUgbWF4aW11bSBudW1iZXIgb2YgYXVyb3JhIGNhcGFjaXR5IHVuaXRzICovXHJcbiAgICBjb25zdCBtYXhBQ1UgPSBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnTWF4QUNVJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RoZSBtYXhpbXVtIG51bWJlciBvZiBBdXJvcmEgY2FwYWNpdHkgdW5pdHMgKEFDVSkgZm9yIGEgREIgaW5zdGFuY2UgaW4gYW4gQXVyb3JhIFNlcnZlcmxlc3MgdjIgY2x1c3Rlci4nLFxyXG4gICAgICB0eXBlOiAnTnVtYmVyJyxcclxuICAgICAgZGVmYXVsdDogMzIsXHJcbiAgICAgIG1pblZhbHVlOiAwLjUsXHJcbiAgICAgIG1heFZhbHVlOiAxMjgsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKiogVGhlIHJlZ2lvbiBuYW1lIGZvciBBbWF6b24gU0VTICovXHJcbiAgICBjb25zdCBzZXNSZWdpb24gPSBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnU2VzUmVnaW9uJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FtYXpvbiBTRVMgdXNlZCBmb3IgU01UUCBzZXJ2ZXIuIElmIHlvdSB3YW50IHRvIHVzZSBBbWF6b24gV29ya01haWwsIG5lZWQgdG8gc2V0IHVzLWVhc3QtMSwgdXMtd2VzdC0yIG9yIGV1LXdlc3QtMS4nLFxyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVmYXVsdDogJ3VzLXdlc3QtMicsXHJcbiAgICAgIGFsbG93ZWRWYWx1ZXM6IFsndXMtZWFzdC0xJywgJ3VzLWVhc3QtMicsICd1cy13ZXN0LTEnLCAndXMtd2VzdC0yJywgJ2FwLXNvdXRoLTEnLCAnYXAtbm9ydGhlYXN0LTEnLCAnYXAtbm9ydGhlYXN0LTInLCAnYXAtbm9ydGhlYXN0LTMnLCAnYXAtc291dGhlYXN0LTEnLCAnYXAtc291dGhlYXN0LTInLCAnY2EtY2VudHJhbC0xJywgJ2V1LWNlbnRyYWwtMScsICdldS13ZXN0LTEnLCAnZXUtd2VzdC0yJywgJ2V1LXdlc3QtMycsICdldS1ub3J0aC0xJywgJ3NhLWVhc3QtMSddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIFRoZSBmbGFnIGZvciBBbWF6b24gV29ya01haWwgKi9cclxuICAgIGNvbnN0IGVuYWJsZVdvcmtNYWlsID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ0VuYWJsZVdvcmtNYWlsJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ0VuYWJsZSB0ZXN0IGUtbWFpbCBkb21haW4gXCJ4eHguYXdzYXBwcy5jb21cIiB3aXRoIEFtYXpvbiBXb3JrTWFpbC4nLFxyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVmYXVsdDogJ2ZhbHNlJyxcclxuICAgICAgYWxsb3dlZFZhbHVlczogWyd0cnVlJywgJ2ZhbHNlJ10sXHJcbiAgICB9KTtcclxuICAgIC8qKiBDRm4gY29uZGl0aW9uIGZvciBBbWF6b24gV29ya01haWwgKi9cclxuICAgIGNvbnN0IHdvcmtNYWlsRW5hYmxlZCA9IG5ldyBjZGsuQ2ZuQ29uZGl0aW9uKHRoaXMsICdXb3JrTWFpbEVuYWJsZWQnLCB7IGV4cHJlc3Npb246IGNkay5Gbi5jb25kaXRpb25FcXVhbHMoZW5hYmxlV29ya01haWwsICd0cnVlJykgfSk7XHJcblxyXG4gICAgLyoqIENGbiBydWxlIGZvciBBbWF6b24gV29ya01haWwgcmVnaW9uICovXHJcbiAgICBuZXcgY2RrLkNmblJ1bGUodGhpcywgJ0NoZWNrV29ya01haWxSZWdpb24nLCB7XHJcbiAgICAgIHJ1bGVDb25kaXRpb246IHdvcmtNYWlsRW5hYmxlZC5leHByZXNzaW9uLFxyXG4gICAgICBhc3NlcnRpb25zOiBbe1xyXG4gICAgICAgIGFzc2VydDogY2RrLkZuLmNvbmRpdGlvbkNvbnRhaW5zKFsndXMtZWFzdC0xJywgJ3VzLXdlc3QtMicsICdldS13ZXN0LTEnXSwgc2VzUmVnaW9uLnZhbHVlQXNTdHJpbmcpLFxyXG4gICAgICAgIGFzc2VydERlc2NyaXB0aW9uOiAnQW1hem9uIFdvcmtNYWlsIGlzIHN1cHBvcnRlZCBvbmx5IGluIHVzLWVhc3QtMSwgdXMtd2VzdC0yIG9yIGV1LXdlc3QtMS4gUGxlYXNlIGNoYW5nZSBBbWF6b24gU0VTIFJlZ2lvbi4nLFxyXG4gICAgICB9XSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBWUEMgZm9yIENvbnRhaW5lcnMgYW5kIERhdGFiYXNlICovXHJcbiAgICBjb25zdCB2cGMgPSBuZXcgVnBjKHRoaXMsICdWUEMnLCB7IG5hdEdhdGV3YXlzOiAxIH0pO1xyXG5cclxuICAgIC8qKiBOYW1lc3BhY2UgbmFtZSBmb3IgQ2xvdWRNYXAgYW5kIEVDUyBTZXJ2aWNlIENvbm5lY3QgKi9cclxuICAgIGNvbnN0IG5hbWVzcGFjZU5hbWUgPSAnc3VwYWJhc2UuaW50ZXJuYWwnO1xyXG5cclxuICAgIC8qKiBFQ1MgQ2x1c3RlciBmb3IgU3VwYWJhc2UgY29tcG9uZW50cyAqL1xyXG4gICAgY29uc3QgY2x1c3RlciA9IG5ldyBlY3MuQ2x1c3Rlcih0aGlzLCAnQ2x1c3RlcicsIHtcclxuICAgICAgZW5hYmxlRmFyZ2F0ZUNhcGFjaXR5UHJvdmlkZXJzOiB0cnVlLFxyXG4gICAgICBjb250YWluZXJJbnNpZ2h0czogZmFsc2UsXHJcbiAgICAgIGRlZmF1bHRDbG91ZE1hcE5hbWVzcGFjZToge1xyXG4gICAgICAgIG5hbWU6IG5hbWVzcGFjZU5hbWUsXHJcbiAgICAgICAgdXNlRm9yU2VydmljZUNvbm5lY3Q6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHZwYyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBQb3N0Z3JlU1FMIERhdGFiYXNlIHdpdGggU2VjcmV0cyAqL1xyXG4gICAgY29uc3QgZGIgPSBuZXcgU3VwYWJhc2VEYXRhYmFzZSh0aGlzLCAnRGF0YWJhc2UnLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgaGlnaEF2YWlsYWJpbGl0eSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBTTVRQIENyZWRlbnRpYWxzICovXHJcbiAgICBjb25zdCBzbXRwID0gbmV3IFNlc1NtdHAodGhpcywgJ1NtdHAnLCB7XHJcbiAgICAgIHJlZ2lvbjogc2VzUmVnaW9uLnZhbHVlQXNTdHJpbmcsXHJcbiAgICAgIGVtYWlsOiBzZW5kZXJFbWFpbC52YWx1ZUFzU3RyaW5nLFxyXG4gICAgICB3b3JrTWFpbEVuYWJsZWQ6IHdvcmtNYWlsRW5hYmxlZCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE92ZXJ3cml0ZSBBQ1VcclxuICAgIChkYi5jbHVzdGVyLm5vZGUuZGVmYXVsdENoaWxkIGFzIHJkcy5DZm5EQkNsdXN0ZXIpLnNlcnZlcmxlc3NWMlNjYWxpbmdDb25maWd1cmF0aW9uID0ge1xyXG4gICAgICBtaW5DYXBhY2l0eTogbWluQUNVLnZhbHVlQXNOdW1iZXIsXHJcbiAgICAgIG1heENhcGFjaXR5OiBtYXhBQ1UudmFsdWVBc051bWJlcixcclxuICAgIH07XHJcblxyXG4gICAgLyoqIFNlY3JldCBvZiBzdXBhYmFzZV9hZG1pbiB1c2VyICovXHJcbiAgICBjb25zdCBzdXBhYmFzZUFkbWluU2VjcmV0ID0gZGIuY2x1c3Rlci5zZWNyZXQhO1xyXG4gICAgLyoqIFNlY3JldCBvZiBzdXBhYmFzZV9hdXRoX2FkbWluIHVzZXIgKi9cclxuICAgIGNvbnN0IHN1cGFiYXNlQXV0aEFkbWluU2VjcmV0ID0gZGIuZ2VuVXNlclBhc3N3b3JkKCdzdXBhYmFzZV9hdXRoX2FkbWluJyk7XHJcbiAgICAvKiogU2VjcmV0IG9mIHN1cGFiYXNlX3N0b3JhZ2VfYWRtaW4gdXNlciAqL1xyXG4gICAgY29uc3Qgc3VwYWJhc2VTdG9yYWdlQWRtaW5TZWNyZXQgPSBkYi5nZW5Vc2VyUGFzc3dvcmQoJ3N1cGFiYXNlX3N0b3JhZ2VfYWRtaW4nKTtcclxuICAgIC8qKiBTZWNyZXQgb2YgYXV0aGVudGljYXRvciB1c2VyICovXHJcbiAgICBjb25zdCBhdXRoZW50aWNhdG9yU2VjcmV0ID0gZGIuZ2VuVXNlclBhc3N3b3JkKCdhdXRoZW50aWNhdG9yJyk7XHJcbiAgICAvKiogU2VjcmV0IG9mIGRhc2hib2FyZCB1c2VyICAqL1xyXG4gICAgY29uc3QgZGFzaGJvYXJkVXNlclNlY3JldCA9IGRiLmdlblVzZXJQYXNzd29yZCgnZGFzaGJvYXJkX3VzZXInKTtcclxuICAgIC8qKiBTZWNyZXQgb2YgcG9zdGdyZXMgdXNlciAqL1xyXG4gICAgY29uc3QgcG9zdGdyZXNTZWNyZXQgPSBkYi5nZW5Vc2VyUGFzc3dvcmQoJ3Bvc3RncmVzJyk7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBKV1QgU2VjcmV0XHJcbiAgICAgKlxyXG4gICAgICogVXNlZCB0byBkZWNvZGUgeW91ciBKV1RzLiBZb3UgY2FuIGFsc28gdXNlIHRoaXMgdG8gbWludCB5b3VyIG93biBKV1RzLlxyXG4gICAgICovXHJcbiAgICBjb25zdCBqd3RTZWNyZXQgPSBuZXcgSnd0U2VjcmV0KHRoaXMsICdKd3RTZWNyZXQnKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEFub255bW91cyBLZXlcclxuICAgICAqXHJcbiAgICAgKiBUaGlzIGtleSBpcyBzYWZlIHRvIHVzZSBpbiBhIGJyb3dzZXIgaWYgeW91IGhhdmUgZW5hYmxlZCBSb3cgTGV2ZWwgU2VjdXJpdHkgZm9yIHlvdXIgdGFibGVzIGFuZCBjb25maWd1cmVkIHBvbGljaWVzLlxyXG4gICAgICovXHJcbiAgICBjb25zdCBhbm9uS2V5ID0gand0U2VjcmV0LmdlbkFwaUtleSgnQW5vbktleScsIHsgcm9sZU5hbWU6ICdhbm9uJywgaXNzdWVyOiAnc3VwYWJhc2UnLCBleHBpcmVzSW46ICcxMHknIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU2VydmljZSBSb2xlIEtleVxyXG4gICAgICpcclxuICAgICAqIFRoaXMga2V5IGhhcyB0aGUgYWJpbGl0eSB0byBieXBhc3MgUm93IExldmVsIFNlY3VyaXR5LiBOZXZlciBzaGFyZSBpdCBwdWJsaWNseS5cclxuICAgICAqL1xyXG4gICAgY29uc3Qgc2VydmljZVJvbGVLZXkgPSBqd3RTZWNyZXQuZ2VuQXBpS2V5KCdTZXJ2aWNlUm9sZUtleScsIHsgcm9sZU5hbWU6ICdzZXJ2aWNlX3JvbGUnLCBpc3N1ZXI6ICdzdXBhYmFzZScsIGV4cGlyZXNJbjogJzEweScgfSk7XHJcblxyXG4gICAgLyoqIFRoZSBsb2FkIGJhbGFuY2VyIGZvciBLb25nIEdhdGV3YXkgKi9cclxuICAgIGNvbnN0IGxvYWRCYWxhbmNlciA9IG5ldyBlbGIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ0xvYWRCYWxhbmNlcicsIHsgaW50ZXJuZXRGYWNpbmc6IHRydWUsIHZwYyB9KTtcclxuXHJcbiAgICAvKiogQ2xvdWRGcm9udCBQcmVmaXggTGlzdCAqL1xyXG4gICAgY29uc3QgY2ZQcmVmaXhMaXN0ID0gbmV3IFByZWZpeExpc3QodGhpcywgJ0Nsb3VkRnJvbnRQcmVmaXhMaXN0JywgeyBwcmVmaXhMaXN0TmFtZTogJ2NvbS5hbWF6b25hd3MuZ2xvYmFsLmNsb3VkZnJvbnQub3JpZ2luLWZhY2luZycgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgb25seSBDbG91ZEZyb250IHRvIGNvbm5lY3QgdGhlIGxvYWQgYmFsYW5jZXIuXHJcbiAgICBsb2FkQmFsYW5jZXIuY29ubmVjdGlvbnMuYWxsb3dGcm9tKFBlZXIucHJlZml4TGlzdChjZlByZWZpeExpc3QucHJlZml4TGlzdElkKSwgUG9ydC50Y3AoODApLCAnQ2xvdWRGcm9udCcpO1xyXG5cclxuICAgIC8qKiBDbG91ZEZyb250ICovXHJcbiAgICBjb25zdCBjZG4gPSBuZXcgU3VwYWJhc2VDZG4odGhpcywgJ0NkbicsIHtcclxuICAgICAgb3JpZ2luOiBsb2FkQmFsYW5jZXIsXHJcbiAgICAgIHdlYkFjbEFybixcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogU3VwYWJhc2UgQVBJIFVSTFxyXG4gICAgICpcclxuICAgICAqIGUuZy4gaHR0cHM6Ly94eHguY2xvdWRmcm9udC5uZXRcclxuICAgICAqL1xyXG4gICAgY29uc3QgYXBpRXh0ZXJuYWxVcmwgPSBgaHR0cHM6Ly8ke2Nkbi5kaXN0cmlidXRpb24uZG9tYWluTmFtZX1gO1xyXG5cclxuICAgIC8qKiBBUEkgR2F0ZXdheSBmb3IgU3VwYWJhc2UgKi9cclxuICAgIGNvbnN0IGtvbmcgPSBuZXcgQXV0b1NjYWxpbmdGYXJnYXRlU2VydmljZSh0aGlzLCAnS29uZycsIHtcclxuICAgICAgY2x1c3RlcixcclxuICAgICAgdGFza0ltYWdlT3B0aW9uczoge1xyXG4gICAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCdwdWJsaWMuZWNyLmF3cy91M3A3cTJyOC9rb25nOmxhdGVzdCcpLFxyXG4gICAgICAgIC8vaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tQXNzZXQoJy4vY29udGFpbmVycy9rb25nJywgeyBwbGF0Zm9ybTogUGxhdGZvcm0uTElOVVhfQVJNNjQgfSksXHJcbiAgICAgICAgY29udGFpbmVyUG9ydDogODAwMCxcclxuICAgICAgICBoZWFsdGhDaGVjazoge1xyXG4gICAgICAgICAgY29tbWFuZDogWydDTUQnLCAna29uZycsICdoZWFsdGgnXSxcclxuICAgICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcclxuICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICAgICAgcmV0cmllczogMyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICBLT05HX0ROU19PUkRFUjogJ0xBU1QsQSxDTkFNRScsXHJcbiAgICAgICAgICBLT05HX1BMVUdJTlM6ICdyZXF1ZXN0LXRyYW5zZm9ybWVyLGNvcnMsa2V5LWF1dGgsYWNsLGJhc2ljLWF1dGgsb3BlbnRlbGVtZXRyeScsXHJcbiAgICAgICAgICBLT05HX05HSU5YX1BST1hZX1BST1hZX0JVRkZFUl9TSVpFOiAnMTYwaycsXHJcbiAgICAgICAgICBLT05HX05HSU5YX1BST1hZX1BST1hZX0JVRkZFUlM6ICc2NCAxNjBrJyxcclxuICAgICAgICAgIC8vIGZvciBIZWFsdGhDaGVja1xyXG4gICAgICAgICAgS09OR19TVEFUVVNfTElTVEVOOiAnMC4wLjAuMDo4MTAwJyxcclxuICAgICAgICAgIC8vIGZvciBPcGVuVGVsZW1ldHJ5XHJcbiAgICAgICAgICAvL0tPTkdfT1BFTlRFTEVNRVRSWV9FTkFCTEVEOiAndHJ1ZScsXHJcbiAgICAgICAgICAvL0tPTkdfT1BFTlRFTEVNRVRSWV9UUkFDSU5HOiAnYWxsJyxcclxuICAgICAgICAgIC8vS09OR19PUEVOVEVMRU1FVFJZX1RSQUNJTkdfU0FNUExJTkdfUkFURTogJzEuMCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWNyZXRzOiB7XHJcbiAgICAgICAgICBTVVBBQkFTRV9BTk9OX0tFWTogZWNzLlNlY3JldC5mcm9tU3NtUGFyYW1ldGVyKGFub25LZXkuc3NtUGFyYW1ldGVyKSxcclxuICAgICAgICAgIFNVUEFCQVNFX1NFUlZJQ0VfS0VZOiBlY3MuU2VjcmV0LmZyb21Tc21QYXJhbWV0ZXIoc2VydmljZVJvbGVLZXkuc3NtUGFyYW1ldGVyKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICBoaWdoQXZhaWxhYmlsaXR5LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIFRhcmdldEdyb3VwIGZvciBrb25nLWdhdGV3YXkgKi9cclxuICAgIGNvbnN0IGtvbmdUYXJnZXRHcm91cCA9IGtvbmcuYWRkVGFyZ2V0R3JvdXAoe1xyXG4gICAgICBoZWFsdGhDaGVjazoge1xyXG4gICAgICAgIHBvcnQ6ICc4MTAwJyxcclxuICAgICAgICBwYXRoOiAnL3N0YXR1cycsXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMiksXHJcbiAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIExpc3RuZXIgZm9yIGtvbmctZ2F0ZXdheSAqL1xyXG4gICAgY29uc3QgbGlzdGVuZXIgPSBsb2FkQmFsYW5jZXIuYWRkTGlzdGVuZXIoJ0xpc3RlbmVyJywge1xyXG4gICAgICBwb3J0OiA4MCxcclxuICAgICAgZGVmYXVsdFRhcmdldEdyb3VwczogW2tvbmdUYXJnZXRHcm91cF0sXHJcbiAgICAgIG9wZW46IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgdGhlIGxvYWQgYmFsYW5jZXIgdG8gY29ubmVjdCBrb25nLWdhdGV3YXkuXHJcbiAgICBrb25nLmNvbm5lY3Rpb25zLmFsbG93RnJvbShsb2FkQmFsYW5jZXIsIFBvcnQudGNwKDgxMDApLCAnQUxCIGhlYWx0aGNoZWNrJyk7XHJcblxyXG4gICAgLyoqIEdvVHJ1ZSAtIEF1dGhlbnRpY2F0aW9uIGFuZCBVc2VyIE1hbmFnZW1lbnQgYnkgU3VwYWJhc2UgKi9cclxuICAgIGNvbnN0IGF1dGggPSBuZXcgQXV0b1NjYWxpbmdGYXJnYXRlU2VydmljZSh0aGlzLCAnQXV0aCcsIHtcclxuICAgICAgY2x1c3RlcixcclxuICAgICAgdGFza0ltYWdlT3B0aW9uczoge1xyXG4gICAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KGF1dGhJbWFnZVVyaS52YWx1ZUFzU3RyaW5nKSxcclxuICAgICAgICBjb250YWluZXJQb3J0OiA5OTk5LFxyXG4gICAgICAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAgICAgICBjb21tYW5kOiBbJ0NNRCcsICd3Z2V0JywgJy0tbm8tdmVyYm9zZScsICctLXRyaWVzPTEnLCAnLS1zcGlkZXInLCAnaHR0cDovL2xvY2FsaG9zdDo5OTk5L2hlYWx0aCddLFxyXG4gICAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgICAgICByZXRyaWVzOiAzLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgIEdPVFJVRV9BUElfSE9TVDogJzAuMC4wLjAnLFxyXG4gICAgICAgICAgR09UUlVFX0FQSV9QT1JUOiAnOTk5OScsXHJcbiAgICAgICAgICBBUElfRVhURVJOQUxfVVJMOiBhcGlFeHRlcm5hbFVybCxcclxuXHJcbiAgICAgICAgICBHT1RSVUVfREJfRFJJVkVSOiAncG9zdGdyZXMnLFxyXG5cclxuICAgICAgICAgIEdPVFJVRV9TSVRFX1VSTDogc2l0ZVVybC52YWx1ZUFzU3RyaW5nLFxyXG4gICAgICAgICAgR09UUlVFX1VSSV9BTExPV19MSVNUOiByZWRpcmVjdFVybHMudmFsdWVBc1N0cmluZyxcclxuICAgICAgICAgIEdPVFJVRV9ESVNBQkxFX1NJR05VUDogZGlzYWJsZVNpZ251cC52YWx1ZUFzU3RyaW5nLFxyXG5cclxuICAgICAgICAgIEdPVFJVRV9KV1RfQURNSU5fUk9MRVM6ICdzZXJ2aWNlX3JvbGUnLFxyXG4gICAgICAgICAgR09UUlVFX0pXVF9BVUQ6ICdhdXRoZW50aWNhdGVkJyxcclxuICAgICAgICAgIEdPVFJVRV9KV1RfREVGQVVMVF9HUk9VUF9OQU1FOiAnYXV0aGVudGljYXRlZCcsXHJcbiAgICAgICAgICBHT1RSVUVfSldUX0VYUDogand0RXhwaXJ5TGltaXQudmFsdWVBc1N0cmluZyxcclxuXHJcbiAgICAgICAgICBHT1RSVUVfRVhURVJOQUxfRU1BSUxfRU5BQkxFRDogJ3RydWUnLFxyXG4gICAgICAgICAgR09UUlVFX01BSUxFUl9BVVRPQ09ORklSTTogJ2ZhbHNlJyxcclxuICAgICAgICAgIC8vR09UUlVFX01BSUxFUl9TRUNVUkVfRU1BSUxfQ0hBTkdFX0VOQUJMRUQ6ICd0cnVlJyxcclxuICAgICAgICAgIC8vR09UUlVFX1NNVFBfTUFYX0ZSRVFVRU5DWTogJzFzJyxcclxuICAgICAgICAgIEdPVFJVRV9TTVRQX0FETUlOX0VNQUlMOiBzbXRwLmVtYWlsLFxyXG4gICAgICAgICAgR09UUlVFX1NNVFBfSE9TVDogc210cC5ob3N0LFxyXG4gICAgICAgICAgR09UUlVFX1NNVFBfUE9SVDogc210cC5wb3J0LnRvU3RyaW5nKCksXHJcbiAgICAgICAgICBHT1RSVUVfU01UUF9TRU5ERVJfTkFNRTogc2VuZGVyTmFtZS52YWx1ZUFzU3RyaW5nLFxyXG4gICAgICAgICAgR09UUlVFX01BSUxFUl9VUkxQQVRIU19JTlZJVEU6ICcvYXV0aC92MS92ZXJpZnknLFxyXG4gICAgICAgICAgR09UUlVFX01BSUxFUl9VUkxQQVRIU19DT05GSVJNQVRJT046ICcvYXV0aC92MS92ZXJpZnknLFxyXG4gICAgICAgICAgR09UUlVFX01BSUxFUl9VUkxQQVRIU19SRUNPVkVSWTogJy9hdXRoL3YxL3ZlcmlmeScsXHJcbiAgICAgICAgICBHT1RSVUVfTUFJTEVSX1VSTFBBVEhTX0VNQUlMX0NIQU5HRTogJy9hdXRoL3YxL3ZlcmlmeScsXHJcblxyXG4gICAgICAgICAgR09UUlVFX0VYVEVSTkFMX1BIT05FX0VOQUJMRUQ6ICdmYWxzZScsIC8vIEFtYXpvbiBTTlMgbm90IHN1cHBvcnRlZFxyXG4gICAgICAgICAgR09UUlVFX1NNU19BVVRPQ09ORklSTTogJ3RydWUnLFxyXG5cclxuICAgICAgICAgIEdPVFJVRV9SQVRFX0xJTUlUX0VNQUlMX1NFTlQ6ICczNjAwJywgLy8gU0VTIExpbWl0OiAxbXNnL3NcclxuICAgICAgICAgIEdPVFJVRV9QQVNTV09SRF9NSU5fTEVOR1RIOiBwYXNzd29yZE1pbkxlbmd0aC52YWx1ZUFzU3RyaW5nLFxyXG5cclxuICAgICAgICAgIC8vR09UUlVFX1RSQUNJTkdfRU5BQkxFRDogJ3RydWUnLFxyXG4gICAgICAgICAgLy9PVEVMX1NFUlZJQ0VfTkFNRTogJ2dvdHJ1ZScsXHJcbiAgICAgICAgICAvL09URUxfRVhQT1JURVJfT1RMUF9QUk9UT0NPTDogJ2dycGMnLFxyXG4gICAgICAgICAgLy9PVEVMX0VYUE9SVEVSX09UTFBfRU5EUE9JTlQ6IGBodHRwOi8vJHtqYWVnZXIuZG5zTmFtZX06NDMxN2AsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWNyZXRzOiB7XHJcbiAgICAgICAgICBHT1RSVUVfREJfREFUQUJBU0VfVVJMOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihzdXBhYmFzZUF1dGhBZG1pblNlY3JldCwgJ3VyaScpLFxyXG4gICAgICAgICAgR09UUlVFX0pXVF9TRUNSRVQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKGp3dFNlY3JldCksXHJcbiAgICAgICAgICBHT1RSVUVfU01UUF9VU0VSOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihzbXRwLnNlY3JldCwgJ3VzZXJuYW1lJyksXHJcbiAgICAgICAgICBHT1RSVUVfU01UUF9QQVNTOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihzbXRwLnNlY3JldCwgJ3Bhc3N3b3JkJyksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgaGlnaEF2YWlsYWJpbGl0eSxcclxuICAgIH0pO1xyXG4gICAgY29uc3QgYXV0aFByb3ZpZGVycyA9IGF1dGguYWRkRXh0ZXJuYWxBdXRoUHJvdmlkZXJzKGAke2FwaUV4dGVybmFsVXJsfS9hdXRoL3YxL2NhbGxiYWNrYCwgMyk7XHJcblxyXG4gICAgLyoqIFJFU1RmdWwgQVBJIGZvciBhbnkgUG9zdGdyZVNRTCBEYXRhYmFzZSAqL1xyXG4gICAgY29uc3QgcmVzdCA9IG5ldyBBdXRvU2NhbGluZ0ZhcmdhdGVTZXJ2aWNlKHRoaXMsICdSZXN0Jywge1xyXG4gICAgICBjbHVzdGVyLFxyXG4gICAgICB0YXNrSW1hZ2VPcHRpb25zOiB7XHJcbiAgICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkocmVzdEltYWdlVXJpLnZhbHVlQXNTdHJpbmcpLFxyXG4gICAgICAgIGNvbnRhaW5lclBvcnQ6IDMwMDAsXHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgIFBHUlNUX0RCX1NDSEVNQVM6ICdwdWJsaWMsc3RvcmFnZSxncmFwaHFsX3B1YmxpYycsXHJcbiAgICAgICAgICBQR1JTVF9EQl9BTk9OX1JPTEU6ICdhbm9uJyxcclxuICAgICAgICAgIFBHUlNUX0RCX1VTRV9MRUdBQ1lfR1VDUzogJ2ZhbHNlJyxcclxuICAgICAgICAgIFBHUlNUX0FQUF9TRVRUSU5HU19KV1RfRVhQOiBqd3RFeHBpcnlMaW1pdC52YWx1ZUFzU3RyaW5nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2VjcmV0czoge1xyXG4gICAgICAgICAgUEdSU1RfREJfVVJJOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihhdXRoZW50aWNhdG9yU2VjcmV0LCAndXJpJyksXHJcbiAgICAgICAgICBQR1JTVF9KV1RfU0VDUkVUOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihqd3RTZWNyZXQpLFxyXG4gICAgICAgICAgUEdSU1RfQVBQX1NFVFRJTkdTX0pXVF9TRUNSRVQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKGp3dFNlY3JldCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgaGlnaEF2YWlsYWJpbGl0eSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBHcmFwaFFMIEFQSSBmb3IgYW55IFBvc3RncmVTUUwgRGF0YWJhc2UgKi9cclxuICAgIC8vY29uc3QgZ3FsID0gbmV3IEF1dG9TY2FsaW5nRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ0dyYXBoUUwnLCB7XHJcbiAgICAvLyAgY2x1c3RlcixcclxuICAgIC8vICB0YXNrSW1hZ2VPcHRpb25zOiB7XHJcbiAgICAvLyAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgncHVibGljLmVjci5hd3MvdTNwN3EycjgvcG9zdGdyYXBoaWxlOmxhdGVzdCcpLFxyXG4gICAgLy8gICAgLy9pbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21Bc3NldCgnLi9jb250YWluZXJzL3Bvc3RncmFwaGlsZScsIHsgcGxhdGZvcm06IFBsYXRmb3JtLkxJTlVYX0FSTTY0IH0pLFxyXG4gICAgLy8gICAgY29udGFpbmVyUG9ydDogNTAwMCxcclxuICAgIC8vICAgIGhlYWx0aENoZWNrOiB7XHJcbiAgICAvLyAgICAgIGNvbW1hbmQ6IFsnQ01EJywgJ3dnZXQnLCAnLS1uby12ZXJib3NlJywgJy0tdHJpZXM9MScsICctLXNwaWRlcicsICdodHRwOi8vbG9jYWxob3N0OjUwMDAvaGVhbHRoJ10sXHJcbiAgICAvLyAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcclxuICAgIC8vICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAvLyAgICAgIHJldHJpZXM6IDMsXHJcbiAgICAvLyAgICB9LFxyXG4gICAgLy8gICAgZW52aXJvbm1lbnQ6IHtcclxuICAgIC8vICAgICAgUEdfR1JBUEhJUUw6ICdmYWxzZScsXHJcbiAgICAvLyAgICAgIFBHX0VOSEFOQ0VfR1JBUEhJUUw6ICdmYWxzZScsXHJcbiAgICAvLyAgICAgIFBHX0lHTk9SRV9SQkFDOiAnZmFsc2UnLFxyXG4gICAgLy8gICAgfSxcclxuICAgIC8vICAgIHNlY3JldHM6IHtcclxuICAgIC8vICAgICAgREFUQUJBU0VfVVJMOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihhdXRoZW50aWNhdG9yU2VjcmV0LCAndXJpJyksXHJcbiAgICAvLyAgICAgIEpXVF9TRUNSRVQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKGp3dFNlY3JldCksXHJcbiAgICAvLyAgICB9LFxyXG4gICAgLy8gIH0sXHJcbiAgICAvLyAgaGlnaEF2YWlsYWJpbGl0eSxcclxuICAgIC8vfSk7XHJcblxyXG4gICAgLyoqICBTZWNyZXQgdXNlZCBieSB0aGUgc2VydmVyIHRvIHNpZ24gY29va2llcy4gUmVjb21tZW5kZWQ6IDY0IGNoYXJhY3RlcnMuICovXHJcbiAgICBjb25zdCBjb29raWVTaWduaW5nU2VjcmV0ID0gbmV3IFNlY3JldCh0aGlzLCAnQ29va2llU2lnbmluZ1NlY3JldCcsIHtcclxuICAgICAgc2VjcmV0TmFtZTogYCR7Y2RrLkF3cy5TVEFDS19OQU1FfS1SZWFsdGltZS1Db29raWVTaWduaW5nLVNlY3JldGAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3VwYWJhc2UgLSBDb29raWUgU2lnbmluZyBTZWNyZXQgZm9yIFJlYWx0aW1lJyxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcclxuICAgICAgICBwYXNzd29yZExlbmd0aDogNjQsXHJcbiAgICAgICAgZXhjbHVkZVB1bmN0dWF0aW9uOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIFdlYnNvY2tldCBBUEkgKi9cclxuICAgIGNvbnN0IHJlYWx0aW1lID0gbmV3IEF1dG9TY2FsaW5nRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ1JlYWx0aW1lJywge1xyXG4gICAgICBzZXJ2aWNlTmFtZTogJ3JlYWx0aW1lLWRldicsIC8vIFRoZSBzdWItZG9tYWluIGlzIHVzZWQgYXMgdGVuYXRfaWQuICg8dGVuYXRfaWQ+LnN1cGFiYXNlLmludGVybmFsKVxyXG4gICAgICBjbHVzdGVyLFxyXG4gICAgICB0YXNrSW1hZ2VPcHRpb25zOiB7XHJcbiAgICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tUmVnaXN0cnkocmVhbHRpbWVJbWFnZVVyaS52YWx1ZUFzU3RyaW5nKSxcclxuICAgICAgICBjb250YWluZXJQb3J0OiA0MDAwLFxyXG4gICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICBQT1JUOiAnNDAwMCcsXHJcbiAgICAgICAgICBEQl9IT1NUOiBkYi5jbHVzdGVyLmNsdXN0ZXJFbmRwb2ludC5ob3N0bmFtZSxcclxuICAgICAgICAgIERCX1BPUlQ6IGRiLmNsdXN0ZXIuY2x1c3RlckVuZHBvaW50LnBvcnQudG9TdHJpbmcoKSxcclxuICAgICAgICAgIERCX0FGVEVSX0NPTk5FQ1RfUVVFUlk6ICdTRVQgc2VhcmNoX3BhdGggVE8gcmVhbHRpbWUnLFxyXG4gICAgICAgICAgREJfRU5DX0tFWTogJ3N1cGFiYXNlcmVhbHRpbWUnLFxyXG4gICAgICAgICAgRkxZX0FMTE9DX0lEOiAnZmx5MTIzJyxcclxuICAgICAgICAgIEZMWV9BUFBfTkFNRTogJ3JlYWx0aW1lJyxcclxuICAgICAgICAgIEVSTF9BRkxBR1M6ICctcHJvdG9fZGlzdCBpbmV0X3RjcCcsIC8vIElQdjRcclxuICAgICAgICAgIEVOQUJMRV9UQUlMU0NBTEU6ICdmYWxzZScsXHJcbiAgICAgICAgICBETlNfTk9ERVM6IGByZWFsdGltZS1kZXYuJHtuYW1lc3BhY2VOYW1lfWAsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZWNyZXRzOiB7XHJcbiAgICAgICAgICBEQl9VU0VSOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihzdXBhYmFzZUFkbWluU2VjcmV0LCAndXNlcm5hbWUnKSxcclxuICAgICAgICAgIERCX1BBU1NXT1JEOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihzdXBhYmFzZUFkbWluU2VjcmV0LCAncGFzc3dvcmQnKSxcclxuICAgICAgICAgIERCX05BTUU6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKHN1cGFiYXNlQWRtaW5TZWNyZXQsICdkYm5hbWUnKSxcclxuICAgICAgICAgIEFQSV9KV1RfU0VDUkVUOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihqd3RTZWNyZXQpLFxyXG4gICAgICAgICAgU0VDUkVUX0tFWV9CQVNFOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihjb29raWVTaWduaW5nU2VjcmV0KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudHJ5UG9pbnQ6IFsnL3Vzci9iaW4vdGluaScsICctcycsICctZycsICctLSddLCAvLyBpZ25vcmUgL2FwcC9saW1pdHMuc2hcclxuICAgICAgICBjb21tYW5kOiBbJ3NoJywgJy1jJywgJy9hcHAvYmluL21pZ3JhdGUgJiYgL2FwcC9iaW4vcmVhbHRpbWUgZXZhbCBcIlJlYWx0aW1lLlJlbGVhc2Uuc2VlZHMoUmVhbHRpbWUuUmVwbylcIiAmJiAvYXBwL2Jpbi9zZXJ2ZXInXSxcclxuICAgICAgfSxcclxuICAgICAgaGlnaEF2YWlsYWJpbGl0eSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdhaXQgdW50aWwgdGhlIGRhdGFiYXNlIG1pZ3JhdGlvbiBpcyBjb21wbGV0ZS5cclxuICAgIHJlYWx0aW1lLnNlcnZpY2Uubm9kZS5hZGREZXBlbmRlbmN5KGRiLm1pZ3JhdGlvbi5ub2RlLmRlZmF1bHRDaGlsZCEpO1xyXG5cclxuICAgIC8vIEFsbG93IGVhY2ggY29udGFpbmVyIHRvIGNvbm5lY3Qgb3RoZXJzIGluIGNsdXN0ZXJcclxuICAgIHJlYWx0aW1lLmNvbm5lY3Rpb25zLmFsbG93SW50ZXJuYWxseShQb3J0LmFsbFRyYWZmaWMoKSk7XHJcblxyXG4gICAgLyoqIFN1cGFiYXNlIFN0b3JhZ2UgQmFja2VuZCAqL1xyXG4gICAgY29uc3QgYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnQnVja2V0Jywge1xyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKiogQVBJICYgUXVldWUgb2YgQ2FjaGUgTWFuYWdlciAqL1xyXG4gICAgY29uc3QgY2FjaGVNYW5hZ2VyID0gY2RuLmFkZENhY2hlTWFuYWdlcigpO1xyXG5cclxuICAgIC8qKiBJbWFnZSBUcmFuc2Zvcm1lciBmb3IgU3RvcmFnZSAqL1xyXG4gICAgY29uc3QgaW1ncHJveHkgPSBuZXcgQXV0b1NjYWxpbmdGYXJnYXRlU2VydmljZSh0aGlzLCAnSW1ncHJveHknLCB7XHJcbiAgICAgIGNsdXN0ZXIsXHJcbiAgICAgIHRhc2tJbWFnZU9wdGlvbnM6IHtcclxuICAgICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShpbWdwcm94eUltYWdlVXJpLnZhbHVlQXNTdHJpbmcpLFxyXG4gICAgICAgIGNvbnRhaW5lclBvcnQ6IDUwMDEsXHJcbiAgICAgICAgaGVhbHRoQ2hlY2s6IHtcclxuICAgICAgICAgIGNvbW1hbmQ6IFsnQ01EJywgJ2ltZ3Byb3h5JywgJ2hlYWx0aCddLFxyXG4gICAgICAgICAgaW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgICAgICByZXRyaWVzOiAzLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgIElNR1BST1hZX0JJTkQ6ICc6NTAwMScsXHJcbiAgICAgICAgICBJTUdQUk9YWV9MT0NBTF9GSUxFU1lTVEVNX1JPT1Q6ICcvJyxcclxuICAgICAgICAgIElNR1BST1hZX1VTRV9FVEFHOiAndHJ1ZScsXHJcbiAgICAgICAgICBJTUdQUk9YWV9FTkFCTEVfV0VCUF9ERVRFQ1RJT046ICd0cnVlJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICBoaWdoQXZhaWxhYmlsaXR5LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIFMzIGNvbXBhdGlibGUgb2JqZWN0IHN0b3JhZ2UgQVBJIHRoYXQgc3RvcmVzIG1ldGFkYXRhIGluIFBvc3RncmVzICovXHJcbiAgICBjb25zdCBzdG9yYWdlID0gbmV3IEF1dG9TY2FsaW5nRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ1N0b3JhZ2UnLCB7XHJcbiAgICAgIGNsdXN0ZXIsXHJcbiAgICAgIHRhc2tJbWFnZU9wdGlvbnM6IHtcclxuICAgICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShzdG9yYWdlSW1hZ2VVcmkudmFsdWVBc1N0cmluZyksXHJcbiAgICAgICAgY29udGFpbmVyUG9ydDogNTAwMCxcclxuICAgICAgICBoZWFsdGhDaGVjazoge1xyXG4gICAgICAgICAgY29tbWFuZDogWydDTUQnLCAnd2dldCcsICctLW5vLXZlcmJvc2UnLCAnLS10cmllcz0xJywgJy0tc3BpZGVyJywgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMC9zdGF0dXMnXSxcclxuICAgICAgICAgIGludGVydmFsOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcclxuICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICAgICAgcmV0cmllczogMyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICBQT1NUR1JFU1RfVVJMOiBgJHtyZXN0LmVuZHBvaW50fWAsXHJcbiAgICAgICAgICBQR09QVElPTlM6ICctYyBzZWFyY2hfcGF0aD1zdG9yYWdlLHB1YmxpYycsXHJcbiAgICAgICAgICBGSUxFX1NJWkVfTElNSVQ6ICc1MjQyODgwMCcsXHJcbiAgICAgICAgICBTVE9SQUdFX0JBQ0tFTkQ6ICdzMycsXHJcbiAgICAgICAgICBURU5BTlRfSUQ6ICdzdHViJyxcclxuICAgICAgICAgIElTX01VTFRJVEVOQU5UOiAnZmFsc2UnLFxyXG4gICAgICAgICAgLy8gVE9ETzogaHR0cHM6Ly9naXRodWIuY29tL3N1cGFiYXNlL3N0b3JhZ2UtYXBpL2lzc3Vlcy81NVxyXG4gICAgICAgICAgUkVHSU9OOiBjZGsuQXdzLlJFR0lPTixcclxuICAgICAgICAgIEdMT0JBTF9TM19CVUNLRVQ6IGJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgICAgRU5BQkxFX0lNQUdFX1RSQU5TRk9STUFUSU9OOiAndHJ1ZScsXHJcbiAgICAgICAgICBJTUdQUk9YWV9VUkw6IGltZ3Byb3h5LmVuZHBvaW50LFxyXG4gICAgICAgICAgLy8gU21hcnQgQ0ROIENhY2hpbmdcclxuICAgICAgICAgIFdFQkhPT0tfVVJMOiBjYWNoZU1hbmFnZXIudXJsLFxyXG4gICAgICAgICAgRU5BQkxFX1FVRVVFX0VWRU5UUzogJ2ZhbHNlJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNlY3JldHM6IHtcclxuICAgICAgICAgIEFOT05fS0VZOiBlY3MuU2VjcmV0LmZyb21Tc21QYXJhbWV0ZXIoYW5vbktleS5zc21QYXJhbWV0ZXIpLFxyXG4gICAgICAgICAgU0VSVklDRV9LRVk6IGVjcy5TZWNyZXQuZnJvbVNzbVBhcmFtZXRlcihzZXJ2aWNlUm9sZUtleS5zc21QYXJhbWV0ZXIpLFxyXG4gICAgICAgICAgUEdSU1RfSldUX1NFQ1JFVDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoand0U2VjcmV0KSxcclxuICAgICAgICAgIERBVEFCQVNFX1VSTDogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoc3VwYWJhc2VTdG9yYWdlQWRtaW5TZWNyZXQsICd1cmknKSxcclxuICAgICAgICAgIFdFQkhPT0tfQVBJX0tFWTogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoY2FjaGVNYW5hZ2VyLmFwaUtleSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgaGlnaEF2YWlsYWJpbGl0eSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsbG93IHN0b3JhZ2UtYXBpIHRvIHJlYWQgYW5kIHdyaXRlIHRvIHRoZSBidWNrZXRcclxuICAgIGJ1Y2tldC5ncmFudFJlYWRXcml0ZShzdG9yYWdlLnNlcnZpY2UudGFza0RlZmluaXRpb24udGFza1JvbGUpO1xyXG5cclxuICAgIC8qKiBBIFJFU1RmdWwgQVBJIGZvciBtYW5hZ2luZyB5b3VyIFBvc3RncmVzLiBGZXRjaCB0YWJsZXMsIGFkZCByb2xlcywgYW5kIHJ1biBxdWVyaWVzICovXHJcbiAgICBjb25zdCBtZXRhID0gbmV3IEF1dG9TY2FsaW5nRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ01ldGEnLCB7XHJcbiAgICAgIGNsdXN0ZXIsXHJcbiAgICAgIHRhc2tJbWFnZU9wdGlvbnM6IHtcclxuICAgICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeShwb3N0Z3Jlc01ldGFJbWFnZVVyaS52YWx1ZUFzU3RyaW5nKSxcclxuICAgICAgICBjb250YWluZXJQb3J0OiA4MDgwLFxyXG4gICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICBQR19NRVRBX1BPUlQ6ICc4MDgwJyxcclxuICAgICAgICAgIFBHX01FVEFfREJfSE9TVDogZGIuY2x1c3Rlci5jbHVzdGVyRW5kcG9pbnQuaG9zdG5hbWUsXHJcbiAgICAgICAgICBQR19NRVRBX0RCX1BPUlQ6IGRiLmNsdXN0ZXIuY2x1c3RlckVuZHBvaW50LnBvcnQudG9TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNlY3JldHM6IHtcclxuICAgICAgICAgIFBHX01FVEFfREJfTkFNRTogZWNzLlNlY3JldC5mcm9tU2VjcmV0c01hbmFnZXIoc3VwYWJhc2VBZG1pblNlY3JldCwgJ2RibmFtZScpLFxyXG4gICAgICAgICAgUEdfTUVUQV9EQl9VU0VSOiBlY3MuU2VjcmV0LmZyb21TZWNyZXRzTWFuYWdlcihzdXBhYmFzZUFkbWluU2VjcmV0LCAndXNlcm5hbWUnKSxcclxuICAgICAgICAgIFBHX01FVEFfREJfUEFTU1dPUkQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKHN1cGFiYXNlQWRtaW5TZWNyZXQsICdwYXNzd29yZCcpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGhpZ2hBdmFpbGFiaWxpdHksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBXYWl0IHVudGlsIHRoZSBkYXRhYmFzZSBtaWdyYXRpb24gaXMgY29tcGxldGUuXHJcbiAgICBtZXRhLnNlcnZpY2Uubm9kZS5hZGREZXBlbmRlbmN5KGRiLm1pZ3JhdGlvbi5ub2RlLmRlZmF1bHRDaGlsZCEpO1xyXG5cclxuICAgIC8vIEFkZCBlbnZpcm9ubWVudCB2YXJpYWJsZXMgdG8ga29uZy1nYXRld2F5XHJcbiAgICBrb25nLnNlcnZpY2UudGFza0RlZmluaXRpb24uZGVmYXVsdENvbnRhaW5lciEuYWRkRW52aXJvbm1lbnQoJ1NVUEFCQVNFX0FVVEhfVVJMJywgYCR7YXV0aC5lbmRwb2ludH0vYCk7XHJcbiAgICBrb25nLnNlcnZpY2UudGFza0RlZmluaXRpb24uZGVmYXVsdENvbnRhaW5lciEuYWRkRW52aXJvbm1lbnQoJ1NVUEFCQVNFX1JFU1RfVVJMJywgYCR7cmVzdC5lbmRwb2ludH0vYCk7XHJcbiAgICAvL2tvbmcuc2VydmljZS50YXNrRGVmaW5pdGlvbi5kZWZhdWx0Q29udGFpbmVyIS5hZGRFbnZpcm9ubWVudCgnU1VQQUJBU0VfR1JBUEhRTF9VUkwnLCBgJHtncWwuZW5kcG9pbnR9L2dyYXBocWxgKTtcclxuICAgIGtvbmcuc2VydmljZS50YXNrRGVmaW5pdGlvbi5kZWZhdWx0Q29udGFpbmVyIS5hZGRFbnZpcm9ubWVudCgnU1VQQUJBU0VfUkVBTFRJTUVfVVJMJywgYCR7cmVhbHRpbWUuZW5kcG9pbnR9L3NvY2tldC9gKTtcclxuICAgIGtvbmcuc2VydmljZS50YXNrRGVmaW5pdGlvbi5kZWZhdWx0Q29udGFpbmVyIS5hZGRFbnZpcm9ubWVudCgnU1VQQUJBU0VfU1RPUkFHRV9VUkwnLCBgJHtzdG9yYWdlLmVuZHBvaW50fS9gKTtcclxuICAgIGtvbmcuc2VydmljZS50YXNrRGVmaW5pdGlvbi5kZWZhdWx0Q29udGFpbmVyIS5hZGRFbnZpcm9ubWVudCgnU1VQQUJBU0VfTUVUQV9IT1NUJywgYCR7bWV0YS5lbmRwb2ludH0vYCk7XHJcblxyXG4gICAgLy8gQWxsb3cga29uZy1nYXRld2F5IHRvIGNvbm5lY3Qgb3RoZXIgc2VydmljZXNcclxuICAgIGtvbmcuY29ubmVjdGlvbnMuYWxsb3dUb0RlZmF1bHRQb3J0KGF1dGgpO1xyXG4gICAga29uZy5jb25uZWN0aW9ucy5hbGxvd1RvRGVmYXVsdFBvcnQocmVzdCk7XHJcbiAgICAvL2tvbmcuY29ubmVjdGlvbnMuYWxsb3dUb0RlZmF1bHRQb3J0KGdxbCk7XHJcbiAgICBrb25nLmNvbm5lY3Rpb25zLmFsbG93VG9EZWZhdWx0UG9ydChyZWFsdGltZSk7XHJcbiAgICBrb25nLmNvbm5lY3Rpb25zLmFsbG93VG9EZWZhdWx0UG9ydChzdG9yYWdlKTtcclxuICAgIGtvbmcuY29ubmVjdGlvbnMuYWxsb3dUb0RlZmF1bHRQb3J0KG1ldGEpO1xyXG5cclxuICAgIGF1dGguY29ubmVjdGlvbnMuYWxsb3dUb0RlZmF1bHRQb3J0KHJlc3QpO1xyXG4gICAgc3RvcmFnZS5jb25uZWN0aW9ucy5hbGxvd1RvRGVmYXVsdFBvcnQocmVzdCk7XHJcbiAgICBzdG9yYWdlLmNvbm5lY3Rpb25zLmFsbG93VG9EZWZhdWx0UG9ydChpbWdwcm94eSk7XHJcblxyXG4gICAgLy8gQWxsb3cgc29tZSBzZXJ2aWNlcyB0byBjb25uZWN0IHRoZSBkYXRhYmFzZVxyXG4gICAgYXV0aC5jb25uZWN0aW9ucy5hbGxvd1RvRGVmYXVsdFBvcnQoZGIuY2x1c3Rlcik7XHJcbiAgICByZXN0LmNvbm5lY3Rpb25zLmFsbG93VG9EZWZhdWx0UG9ydChkYi5jbHVzdGVyKTtcclxuICAgIC8vZ3FsLmNvbm5lY3Rpb25zLmFsbG93VG9EZWZhdWx0UG9ydChkYi5jbHVzdGVyKTtcclxuICAgIHJlYWx0aW1lLmNvbm5lY3Rpb25zLmFsbG93VG9EZWZhdWx0UG9ydChkYi5jbHVzdGVyKTtcclxuICAgIHN0b3JhZ2UuY29ubmVjdGlvbnMuYWxsb3dUb0RlZmF1bHRQb3J0KGRiLmNsdXN0ZXIpO1xyXG4gICAgbWV0YS5jb25uZWN0aW9ucy5hbGxvd1RvRGVmYXVsdFBvcnQoZGIuY2x1c3Rlcik7XHJcblxyXG4gICAgY29uc3QgZm9yY2VEZXBsb3lKb2IgPSBuZXcgRm9yY2VEZXBsb3lKb2IodGhpcywgJ0ZvcmNlRGVwbG95Sm9iJywgeyBjbHVzdGVyIH0pO1xyXG4gICAgLy8gZm9yIERCIHNlY3JldCByb3RhdGlvblxyXG4gICAgLy9mb3JjZURlcGxveUpvYi5hZGRUcmlnZ2VyKHtcclxuICAgIC8vICBydWxlOiBkYi5zZWNyZXRSb3RhdGlvblN1Y2NlZWRlZCxcclxuICAgIC8vfSk7XHJcbiAgICAvLyBmb3IgQXV0aCBwcm92aWRlciBzZXR0aW5ncyBjaGFuZ2VkXHJcbiAgICBmb3JjZURlcGxveUpvYi5hZGRUcmlnZ2VyKHtcclxuICAgICAgaW5wdXQ6IHsgc2VydmljZXM6IFthdXRoLnNlcnZpY2Uuc2VydmljZUFybl0gfSxcclxuICAgICAgcnVsZTogbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdBdXRoUGFyYW1ldGVyQ2hhbmdlZCcsIHtcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1N1cGFiYXNlIC0gQXV0aCBwYXJhbWV0ZXIgY2hhbmdlZCcsXHJcbiAgICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgICBzb3VyY2U6IFsnYXdzLnNzbSddLFxyXG4gICAgICAgICAgZGV0YWlsVHlwZTogWydQYXJhbWV0ZXIgU3RvcmUgQ2hhbmdlJ10sXHJcbiAgICAgICAgICBkZXRhaWw6IHtcclxuICAgICAgICAgICAgbmFtZTogW3sgcHJlZml4OiBgLyR7Y2RrLkF3cy5TVEFDS19OQU1FfS8ke2F1dGgubm9kZS5pZH0vYCB9XSxcclxuICAgICAgICAgICAgb3BlcmF0aW9uOiBbJ1VwZGF0ZSddLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBTdXBhYmFzZSBTdHVkaW8gVmVyc2lvbiAqL1xyXG4gICAgY29uc3Qgc3R1ZGlvQnJhbmNoID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1N0dWRpb0JyYW5jaCcsIHtcclxuICAgICAgdHlwZTogJ1N0cmluZycsXHJcbiAgICAgIGRlZmF1bHQ6ICd2MC4yMy4wOScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQnJhbmNoIG9yIHRhZyAtIGh0dHBzOi8vZ2l0aHViLmNvbS9zdXBhYmFzZS9zdXBhYmFzZS90YWdzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBTdXBhYmFzZSBTdHVkaW8gKi9cclxuICAgIGNvbnN0IHN0dWRpbyA9IG5ldyBTdXBhYmFzZVN0dWRpbyh0aGlzLCAnU3R1ZGlvJywge1xyXG4gICAgICBzb3VyY2VCcmFuY2g6IHN0dWRpb0JyYW5jaC52YWx1ZUFzU3RyaW5nLFxyXG4gICAgICBzdXBhYmFzZVVybDogYXBpRXh0ZXJuYWxVcmwsXHJcbiAgICAgIGRiU2VjcmV0OiBkYXNoYm9hcmRVc2VyU2VjcmV0LFxyXG4gICAgICBhbm9uS2V5OiBhbm9uS2V5LnNzbVBhcmFtZXRlcixcclxuICAgICAgc2VydmljZVJvbGVLZXk6IHNlcnZpY2VSb2xlS2V5LnNzbVBhcmFtZXRlcixcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTdHVkaW9VcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBzdHVkaW8ucHJvZEJyYW5jaFVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdUaGUgZGFzaGJvYXJkIGZvciBTdXBhYmFzZSBwcm9qZWN0cy4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1N1cGFiYXNlVXJsJywge1xyXG4gICAgICB2YWx1ZTogYXBpRXh0ZXJuYWxVcmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQSBSRVNUZnVsIGVuZHBvaW50IGZvciBxdWVyeWluZyBhbmQgbWFuYWdpbmcgeW91ciBkYXRhYmFzZS4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtjZGsuQXdzLlNUQUNLX05BTUV9VXJsYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTdXBhYmFzQW5vbktleScsIHtcclxuICAgICAgdmFsdWU6IGFub25LZXkudmFsdWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhpcyBrZXkgaXMgc2FmZSB0byB1c2UgaW4gYSBicm93c2VyIGlmIHlvdSBoYXZlIGVuYWJsZWQgUm93IExldmVsIFNlY3VyaXR5IGZvciB5b3VyIHRhYmxlcyBhbmQgY29uZmlndXJlZCBwb2xpY2llcy4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtjZGsuQXdzLlNUQUNLX05BTUV9QW5vbktleWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIENsb3VkRm9ybWF0aW9uIEludGVyZmFjZVxyXG4gICAgICogQHJlc291cmNlIEFXUzo6Q2xvdWRGb3JtYXRpb246OkludGVyZmFjZVxyXG4gICAgICovXHJcbiAgICBjb25zdCBjZm5JbnRlcmZhY2UgPSB7XHJcbiAgICAgIFBhcmFtZXRlckdyb3VwczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIExhYmVsOiB7IGRlZmF1bHQ6ICdTdXBhYmFzZSAtIEF1dGggU2V0dGluZ3MnIH0sXHJcbiAgICAgICAgICBQYXJhbWV0ZXJzOiBbXHJcbiAgICAgICAgICAgIGRpc2FibGVTaWdudXAubG9naWNhbElkLFxyXG4gICAgICAgICAgICBzaXRlVXJsLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgcmVkaXJlY3RVcmxzLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgand0RXhwaXJ5TGltaXQubG9naWNhbElkLFxyXG4gICAgICAgICAgICBwYXNzd29yZE1pbkxlbmd0aC5sb2dpY2FsSWQsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTGFiZWw6IHsgZGVmYXVsdDogJ1N1cGFiYXNlIC0gU01UUCBTZXR0aW5ncycgfSxcclxuICAgICAgICAgIFBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgc2VuZGVyRW1haWwubG9naWNhbElkLFxyXG4gICAgICAgICAgICBzZW5kZXJOYW1lLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgc2VzUmVnaW9uLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgZW5hYmxlV29ya01haWwubG9naWNhbElkLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIExhYmVsOiB7IGRlZmF1bHQ6ICdTdXBhYmFzZSAtIFZlcnNpb25zIChDb250YWluZXIgSW1hZ2VzKScgfSxcclxuICAgICAgICAgIFBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgYXV0aEltYWdlVXJpLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgcmVzdEltYWdlVXJpLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgcmVhbHRpbWVJbWFnZVVyaS5sb2dpY2FsSWQsXHJcbiAgICAgICAgICAgIHN0b3JhZ2VJbWFnZVVyaS5sb2dpY2FsSWQsXHJcbiAgICAgICAgICAgIGltZ3Byb3h5SW1hZ2VVcmkubG9naWNhbElkLFxyXG4gICAgICAgICAgICBwb3N0Z3Jlc01ldGFJbWFnZVVyaS5sb2dpY2FsSWQsXHJcbiAgICAgICAgICAgIHN0dWRpb0JyYW5jaC5sb2dpY2FsSWQsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTGFiZWw6IHsgZGVmYXVsdDogJ0luZnJhc3RydWN0dXJlIFNldHRpbmdzJyB9LFxyXG4gICAgICAgICAgUGFyYW1ldGVyczogW1xyXG4gICAgICAgICAgICBlbmFibGVIaWdoQXZhaWxhYmlsaXR5LmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgd2ViQWNsQXJuLmxvZ2ljYWxJZCxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBMYWJlbDogeyBkZWZhdWx0OiAnSW5mcmFzdHJ1Y3R1cmUgU2V0dGluZ3MgLSBEYXRhYmFzZScgfSxcclxuICAgICAgICAgIFBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgICAgbWluQUNVLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgbWF4QUNVLmxvZ2ljYWxJZCxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBMYWJlbDogeyBkZWZhdWx0OiAnSW5mcmFzdHJ1Y3R1cmUgU2V0dGluZ3MgLSBDb250YWluZXJzJyB9LFxyXG4gICAgICAgICAgUGFyYW1ldGVyczogW1xyXG4gICAgICAgICAgICBrb25nLnRhc2tTaXplLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgYXV0aC50YXNrU2l6ZS5sb2dpY2FsSWQsXHJcbiAgICAgICAgICAgIHJlc3QudGFza1NpemUubG9naWNhbElkLFxyXG4gICAgICAgICAgICAvL2dxbC50YXNrU2l6ZS5sb2dpY2FsSWQsXHJcbiAgICAgICAgICAgIHJlYWx0aW1lLnRhc2tTaXplLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgc3RvcmFnZS50YXNrU2l6ZS5sb2dpY2FsSWQsXHJcbiAgICAgICAgICAgIGltZ3Byb3h5LnRhc2tTaXplLmxvZ2ljYWxJZCxcclxuICAgICAgICAgICAgbWV0YS50YXNrU2l6ZS5sb2dpY2FsSWQsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICAgIFBhcmFtZXRlckxhYmVsczoge1xyXG4gICAgICAgIFtkaXNhYmxlU2lnbnVwLmxvZ2ljYWxJZF06IHsgZGVmYXVsdDogJ0Rpc2FibGUgVXNlciBTaWdudXBzJyB9LFxyXG4gICAgICAgIFtzaXRlVXJsLmxvZ2ljYWxJZF06IHsgZGVmYXVsdDogJ1NpdGUgVVJMJyB9LFxyXG4gICAgICAgIFtyZWRpcmVjdFVybHMubG9naWNhbElkXTogeyBkZWZhdWx0OiAnUmVkaXJlY3QgVVJMcycgfSxcclxuICAgICAgICBband0RXhwaXJ5TGltaXQubG9naWNhbElkXTogeyBkZWZhdWx0OiAnSldUIGV4cGlyeSBsaW1pdCcgfSxcclxuICAgICAgICBbcGFzc3dvcmRNaW5MZW5ndGgubG9naWNhbElkXTogeyBkZWZhdWx0OiAnTWluIHBhc3N3b3JkIGxlbmd0aCcgfSxcclxuICAgICAgICBbc2VuZGVyRW1haWwubG9naWNhbElkXTogeyBkZWZhdWx0OiAnU2VuZGVyIEVtYWlsIEFkZHJlc3MnIH0sXHJcbiAgICAgICAgW3NlbmRlck5hbWUubG9naWNhbElkXTogeyBkZWZhdWx0OiAnU2VuZGVyIE5hbWUnIH0sXHJcbiAgICAgICAgW3Nlc1JlZ2lvbi5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdBbWF6b24gU0VTIFJlZ2lvbicgfSxcclxuICAgICAgICBbZW5hYmxlV29ya01haWwubG9naWNhbElkXTogeyBkZWZhdWx0OiAnRW5hYmxlIFRlc3QgRS1tYWlsIERvbWFpbiAodmlhIEFtYXpvbiBXb3JrTWFpbCknIH0sXHJcblxyXG4gICAgICAgIFthdXRoSW1hZ2VVcmkubG9naWNhbElkXTogeyBkZWZhdWx0OiAnSW1hZ2UgVVJJIC0gR29UcnVlJyB9LFxyXG4gICAgICAgIFtyZXN0SW1hZ2VVcmkubG9naWNhbElkXTogeyBkZWZhdWx0OiAnSW1hZ2UgVVJJIC0gUG9zdGdSRVNUJyB9LFxyXG4gICAgICAgIFtyZWFsdGltZUltYWdlVXJpLmxvZ2ljYWxJZF06IHsgZGVmYXVsdDogJ0ltYWdlIFVSSSAtIFJlYWx0aW1lJyB9LFxyXG4gICAgICAgIFtzdG9yYWdlSW1hZ2VVcmkubG9naWNhbElkXTogeyBkZWZhdWx0OiAnSW1hZ2UgVVJJIC0gU3RvcmFnZScgfSxcclxuICAgICAgICBbaW1ncHJveHlJbWFnZVVyaS5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdJbWFnZSBVUkkgLSBpbWdwcm94eScgfSxcclxuICAgICAgICBbcG9zdGdyZXNNZXRhSW1hZ2VVcmkubG9naWNhbElkXTogeyBkZWZhdWx0OiAnSW1hZ2UgVVJJIC0gcG9zdGdyZXMtbWV0YScgfSxcclxuXHJcbiAgICAgICAgW2VuYWJsZUhpZ2hBdmFpbGFiaWxpdHkubG9naWNhbElkXTogeyBkZWZhdWx0OiAnSGlnaCBBdmFpbGFiaWxpdHkgKEhBKScgfSxcclxuICAgICAgICBbd2ViQWNsQXJuLmxvZ2ljYWxJZF06IHsgZGVmYXVsdDogJ1dlYiBBQ0wgQVJOIChBV1MgV0FGKScgfSxcclxuXHJcbiAgICAgICAgW21pbkFDVS5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdNaW5pbXVtIEFDVXMnIH0sXHJcbiAgICAgICAgW21heEFDVS5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdNYXhpbXVtIEFDVXMnIH0sXHJcblxyXG4gICAgICAgIFtrb25nLnRhc2tTaXplLmxvZ2ljYWxJZF06IHsgZGVmYXVsdDogJ1Rhc2sgU2l6ZSAtIEtvbmcnIH0sXHJcbiAgICAgICAgW2F1dGgudGFza1NpemUubG9naWNhbElkXTogeyBkZWZhdWx0OiAnVGFzayBTaXplIC0gR29UcnVlJyB9LFxyXG4gICAgICAgIFtyZXN0LnRhc2tTaXplLmxvZ2ljYWxJZF06IHsgZGVmYXVsdDogJ1Rhc2sgU2l6ZSAtIFBvc3RnUkVTVCcgfSxcclxuICAgICAgICAvL1tncWwudGFza1NpemUubG9naWNhbElkXTogeyBkZWZhdWx0OiAnVGFzayBTaXplIC0gUG9zdEdyYXBoaWxlJyB9LFxyXG4gICAgICAgIFtyZWFsdGltZS50YXNrU2l6ZS5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdUYXNrIFNpemUgLSBSZWFsdGltZScgfSxcclxuICAgICAgICBbc3RvcmFnZS50YXNrU2l6ZS5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdUYXNrIFNpemUgLSBTdG9yYWdlJyB9LFxyXG4gICAgICAgIFtpbWdwcm94eS50YXNrU2l6ZS5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdUYXNrIFNpemUgLSBpbWdwcm94eScgfSxcclxuICAgICAgICBbbWV0YS50YXNrU2l6ZS5sb2dpY2FsSWRdOiB7IGRlZmF1bHQ6ICdUYXNrIFNpemUgLSBwb3N0Z3Jlcy1tZXRhJyB9LFxyXG5cclxuICAgICAgICBbc3R1ZGlvQnJhbmNoLmxvZ2ljYWxJZF06IHsgZGVmYXVsdDogJ1N1cGFiYXNlIFN0dWRpbyBCcmFuY2gnIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXV0aFByb3ZpZGVycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBwcm92aWRlciA9IGF1dGhQcm92aWRlcnNbaV07XHJcbiAgICAgIGNmbkludGVyZmFjZS5QYXJhbWV0ZXJHcm91cHMucHVzaCh7XHJcbiAgICAgICAgTGFiZWw6IHsgZGVmYXVsdDogYEV4dGVybmFsIEF1dGggUHJvdmlkZXIgJHtpKzF9YCB9LFxyXG4gICAgICAgIFBhcmFtZXRlcnM6IFtcclxuICAgICAgICAgIHByb3ZpZGVyLm5hbWUubG9naWNhbElkLFxyXG4gICAgICAgICAgcHJvdmlkZXIuY2xpZW50SWQubG9naWNhbElkLFxyXG4gICAgICAgICAgcHJvdmlkZXIuc2VjcmV0LmxvZ2ljYWxJZCxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgICAgY2ZuSW50ZXJmYWNlLlBhcmFtZXRlckxhYmVsc1twcm92aWRlci5uYW1lLmxvZ2ljYWxJZF0gPSB7IGRlZmF1bHQ6ICdQcm92aWRlciBOYW1lJyB9O1xyXG4gICAgICBjZm5JbnRlcmZhY2UuUGFyYW1ldGVyTGFiZWxzW3Byb3ZpZGVyLmNsaWVudElkLmxvZ2ljYWxJZF0gPSB7IGRlZmF1bHQ6ICdDbGllbnQgSUQnIH07XHJcbiAgICAgIGNmbkludGVyZmFjZS5QYXJhbWV0ZXJMYWJlbHNbcHJvdmlkZXIuc2VjcmV0LmxvZ2ljYWxJZF0gPSB7IGRlZmF1bHQ6ICdDbGllbnQgU2VjcmV0JyB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGZvciBDbG91ZEZvcm1hdGlvblxyXG4gICAgdGhpcy50ZW1wbGF0ZU9wdGlvbnMuZGVzY3JpcHRpb24gPSAnU2VsZi1ob3N0ZWQgU3VwYWJhc2UnO1xyXG4gICAgdGhpcy50ZW1wbGF0ZU9wdGlvbnMubWV0YWRhdGEgPSB7ICdBV1M6OkNsb3VkRm9ybWF0aW9uOjpJbnRlcmZhY2UnOiBjZm5JbnRlcmZhY2UgfTtcclxuXHJcbiAgfVxyXG59XHJcbiJdfQ==