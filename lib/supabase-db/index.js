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
exports.SupabaseDatabase = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
const excludeCharacters = '%+~`#$&*()|[]{}:;<>?!\'/@\"\\=^,'; // for Password
class SupabaseDatabase extends constructs_1.Construct {
    /** PostgreSQL for Supabase */
    constructor(scope, id, props) {
        var _a;
        super(scope, id);
        const { vpc, highAvailability } = props;
        /** Database Engine */
        const engine = rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.of('15.4', '15') });
        /** Parameter Group */
        const parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
            engine,
            description: 'Parameter group for Supabase',
            parameters: {
                'rds.force_ssl': '0',
                'shared_preload_libraries': 'pg_tle, pg_stat_statements, pgaudit, pg_cron',
                'rds.logical_replication': '1',
                'max_slot_wal_keep_size': '1024', // https://github.com/supabase/realtime
            },
        });
        this.cluster = new rds.DatabaseCluster(this, 'Cluster', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            engine,
            parameterGroup,
            vpc,
            writer: rds.ClusterInstance.serverlessV2('Instance1'),
            readers: [
                rds.ClusterInstance.serverlessV2('Instance2', { scaleWithWriter: true }),
            ],
            credentials: rds.Credentials.fromGeneratedSecret('supabase_admin', {
                secretName: `${cdk.Aws.STACK_NAME}-${id}-supabase_admin`,
            }),
            defaultDatabaseName: 'postgres',
            storageEncrypted: true,
        });
        const instance1 = this.cluster.node.findChild('Instance1').node.defaultChild;
        const instance2 = this.cluster.node.findChild('Instance2').node.defaultChild;
        if (typeof highAvailability !== 'undefined') {
            instance2.cfnOptions.condition = highAvailability;
        }
        /** Custom resource handler for database migration */
        const migrationFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'MigrationFunction', {
            description: 'Supabase - Database migration function',
            entry: path.resolve(__dirname, 'cr-migrations-handler.ts'),
            bundling: {
                nodeModules: [
                    '@databases/pg',
                ],
                commandHooks: {
                    beforeInstall: (_inputDir, _outputDir) => {
                        return [];
                    },
                    beforeBundling: (_inputDir, _outputDir) => {
                        return [];
                    },
                    afterBundling: (inputDir, outputDir) => {
                        return [
                            `cp -rp ${inputDir}/src/supabase-db/sql/* ${outputDir}/`,
                        ];
                    },
                },
            },
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(60),
            environment: {
                DB_SECRET_ARN: this.cluster.secret.secretArn,
            },
            vpc,
        });
        // Allow a function to connect to database
        migrationFunction.connections.allowToDefaultPort(this.cluster);
        // Allow a function to read db secret
        (_a = this.cluster.secret) === null || _a === void 0 ? void 0 : _a.grantRead(migrationFunction);
        /** Custom resource provider for database migration */
        const migrationProvider = new cr.Provider(this, 'MigrationProvider', { onEventHandler: migrationFunction });
        /** Database migration */
        this.migration = new cdk.CustomResource(this, 'Migration', {
            serviceToken: migrationProvider.serviceToken,
            resourceType: 'Custom::DatabaseMigration',
            properties: {
                Fingerprint: cdk.FileSystem.fingerprint(path.resolve(__dirname, 'sql')),
            },
        });
        // Wait until the database is ready.
        this.migration.node.addDependency(instance1);
        /** Custom resource handler to modify db user password */
        const userPasswordFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'UserPasswordFunction', {
            description: 'Supabase - DB user password function',
            entry: path.resolve(__dirname, 'cr-user-password-handler.ts'),
            bundling: {
                nodeModules: ['@databases/pg'],
            },
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(10),
            environment: {
                DB_SECRET_ARN: this.cluster.secret.secretArn,
            },
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: [
                        'secretsmanager:GetSecretValue',
                        'secretsmanager:PutSecretValue',
                    ],
                    resources: [`arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:${cdk.Aws.STACK_NAME}-${id}-*`],
                }),
                new iam.PolicyStatement({
                    notActions: [
                        'secretsmanager:PutSecretValue',
                    ],
                    resources: [this.cluster.secret.secretArn],
                }),
            ],
            vpc,
        });
        // Allow a function to connect to database
        userPasswordFunction.connections.allowToDefaultPort(this.cluster);
        this.userPasswordProvider = new cr.Provider(this, 'UserPasswordProvider', { onEventHandler: userPasswordFunction });
    }
    /** Generate and set password to database user */
    genUserPassword(username) {
        /** Scope */
        const user = new constructs_1.Construct(this, username);
        /** User secret */
        const secret = new secretsmanager.Secret(user, 'Secret', {
            secretName: `${cdk.Aws.STACK_NAME}-${this.node.id}-${username}`,
            description: `Supabase - Database User ${username}`,
            generateSecretString: {
                excludePunctuation: true,
                secretStringTemplate: JSON.stringify({ username }),
                generateStringKey: 'password',
            },
        });
        /** Modify password job */
        const password = new cdk.CustomResource(user, 'Resource', {
            serviceToken: this.userPasswordProvider.serviceToken,
            resourceType: 'Custom::DatabaseUserPassword',
            properties: {
                Username: username,
                SecretId: secret.secretArn,
            },
        });
        // Wait until the database migration is complete.
        secret.node.addDependency(this.migration.node.defaultChild);
        password.node.addDependency(this.migration.node.defaultChild);
        return secret;
    }
}
exports.SupabaseDatabase = SupabaseDatabase;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc3VwYWJhc2UtZGIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsaURBQW1DO0FBSW5DLHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQscUVBQStEO0FBQy9ELHlEQUEyQztBQUMzQywrRUFBaUU7QUFFakUsaUVBQW1EO0FBQ25ELDJDQUF1QztBQUV2QyxNQUFNLGlCQUFpQixHQUFHLGtDQUFrQyxDQUFDLENBQUMsZUFBZTtBQU83RSxNQUFhLGdCQUFpQixTQUFRLHNCQUFTO0lBVTdDLDhCQUE4QjtJQUM5QixZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCOztRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFeEMsc0JBQXNCO1FBQ3RCLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXZILHNCQUFzQjtRQUN0QixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3BFLE1BQU07WUFDTixXQUFXLEVBQUUsOEJBQThCO1lBQzNDLFVBQVUsRUFBRTtnQkFDVixlQUFlLEVBQUUsR0FBRztnQkFDcEIsMEJBQTBCLEVBQUUsOENBQThDO2dCQUMxRSx5QkFBeUIsRUFBRSxHQUFHO2dCQUM5Qix3QkFBd0IsRUFBRSxNQUFNLEVBQUUsdUNBQXVDO2FBQzFFO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLE9B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Q3hELFlBQVksRUFBRSxJQUFJLENBQUMsb0JBQW9CLENBQUMsWUFBWTtZQUNwRCxZQUFZLEVBQUUsOEJBQThCO1lBQzVDLFVBQVUsRUFBRTtnQkFDVixRQUFRLEVBQUUsUUFBUTtnQkFDbEIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxTQUFTO2FBQzNCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsaURBQWlEO1FBQ2pELE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQWEsQ0FBQyxDQUFDO1FBQzdELFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQWEsQ0FBQyxDQUFDO1FBRS9ELE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FFRjtBQTlLRCw0Q0E4S0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XHJcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcclxuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XHJcbmltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcclxuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgc3NtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5jb25zdCBleGNsdWRlQ2hhcmFjdGVycyA9ICclK35gIyQmKigpfFtde306Ozw+PyFcXCcvQFxcXCJcXFxcPV4sJzsgLy8gZm9yIFBhc3N3b3JkXHJcblxyXG5pbnRlcmZhY2UgU3VwYWJhc2VEYXRhYmFzZVByb3BzIHtcclxuICB2cGM6IGVjMi5JVnBjO1xyXG4gIGhpZ2hBdmFpbGFiaWxpdHk/OiBjZGsuQ2ZuQ29uZGl0aW9uO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3VwYWJhc2VEYXRhYmFzZSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgLyoqIEF1cm9yYSBDbHVzdGVyICovXHJcbiAgY2x1c3RlcjogcmRzLkRhdGFiYXNlQ2x1c3RlcjtcclxuXHJcbiAgLyoqIERhdGFiYXNlIG1pZ3JhdGlvbiAqL1xyXG4gIG1pZ3JhdGlvbjogY2RrLkN1c3RvbVJlc291cmNlO1xyXG5cclxuICAvKiogQ3VzdG9tIHJlc291cmNlIHByb3ZpZGVyIHRvIGdlbmVyYXRlIHVzZXIgcGFzc3dvcmQgKi9cclxuICB1c2VyUGFzc3dvcmRQcm92aWRlcjogY3IuUHJvdmlkZXI7XHJcblxyXG4gIC8qKiBQb3N0Z3JlU1FMIGZvciBTdXBhYmFzZSAqL1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTdXBhYmFzZURhdGFiYXNlUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgeyB2cGMsIGhpZ2hBdmFpbGFiaWxpdHkgfSA9IHByb3BzO1xyXG5cclxuICAgIC8qKiBEYXRhYmFzZSBFbmdpbmUgKi9cclxuICAgIGNvbnN0IGVuZ2luZSA9IHJkcy5EYXRhYmFzZUNsdXN0ZXJFbmdpbmUuYXVyb3JhUG9zdGdyZXMoeyB2ZXJzaW9uOiByZHMuQXVyb3JhUG9zdGdyZXNFbmdpbmVWZXJzaW9uLm9mKCcxNS40JywgJzE1JykgfSk7XHJcblxyXG4gICAgLyoqIFBhcmFtZXRlciBHcm91cCAqL1xyXG4gICAgY29uc3QgcGFyYW1ldGVyR3JvdXAgPSBuZXcgcmRzLlBhcmFtZXRlckdyb3VwKHRoaXMsICdQYXJhbWV0ZXJHcm91cCcsIHtcclxuICAgICAgZW5naW5lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1BhcmFtZXRlciBncm91cCBmb3IgU3VwYWJhc2UnLFxyXG4gICAgICBwYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ3Jkcy5mb3JjZV9zc2wnOiAnMCcsXHJcbiAgICAgICAgJ3NoYXJlZF9wcmVsb2FkX2xpYnJhcmllcyc6ICdwZ190bGUsIHBnX3N0YXRfc3RhdGVtZW50cywgcGdhdWRpdCwgcGdfY3JvbicsXHJcbiAgICAgICAgJ3Jkcy5sb2dpY2FsX3JlcGxpY2F0aW9uJzogJzEnLFxyXG4gICAgICAgICdtYXhfc2xvdF93YWxfa2VlcF9zaXplJzogJzEwMjQnLCAvLyBodHRwczovL2dpdGh1Yi5jb20vc3VwYWJhc2UvcmVhbHRpbWVcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2x1c3RlciA9IG5ldyByZHMuRGF0YWJhc2VDbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBlbmdpbmUsXHJcbiAgICAgIHBhcmFtZXRlckdyb3VwLFxyXG4gICAgICB2cGMsXHJcbiAgICAgIHdyaXRlcjogcmRzLkNsdXN0ZXJJbnN0YW5jZS5zZXJ2ZXJsZXNzVjIoJ0luc3RhbmNlMScpLFxyXG4gICAgICByZWFkZXJzOiBbXHJcbiAgICAgICAgcmRzLkNsdXN0ZXJJbnN0YW5jZS5zZXJ2ZXJsZXNzVjIoJ0luc3RhbmNlMicsIHsgc2NhbGVXaXRoV3JpdGVyOiB0cnVlIH0pLFxyXG4gICAgICBdLFxyXG4gICAgICBjcmVkZW50aWFsczogcmRzLkNyZWRlbnRpYWxzLmZyb21HZW5lcmF0ZWRTZWNyZXQoJ3N1cGFiYXNlX2FkbWluJywge1xyXG4gICAgICAgIHNlY3JldE5hbWU6IGAke2Nkay5Bd3MuU1RBQ0tfTkFNRX0tJHtpZH0tc3VwYWJhc2VfYWRtaW5gLFxyXG4gICAgICB9KSxcclxuICAgICAgZGVmYXVsdERhdGFiYXNlTmFtZTogJ3Bvc3RncmVzJyxcclxuICAgICAgc3RvcmFnZUVuY3J5cHRlZDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGluc3RhbmNlMSA9IHRoaXMuY2x1c3Rlci5ub2RlLmZpbmRDaGlsZCgnSW5zdGFuY2UxJykubm9kZS5kZWZhdWx0Q2hpbGQgYXMgcmRzLkNmbkRCSW5zdGFuY2U7XHJcbiAgICBjb25zdCBpbnN0YW5jZTIgPSB0aGlzLmNsdXN0ZXIubm9kZS5maW5kQ2hpbGQoJ0luc3RhbmNlMicpLm5vZGUuZGVmYXVsdENoaWxkIGFzIHJkcy5DZm5EQkluc3RhbmNlO1xyXG5cclxuICAgIGlmICh0eXBlb2YgaGlnaEF2YWlsYWJpbGl0eSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgaW5zdGFuY2UyLmNmbk9wdGlvbnMuY29uZGl0aW9uID0gaGlnaEF2YWlsYWJpbGl0eTtcclxuICAgIH1cclxuXHJcbiAgICAvKiogQ3VzdG9tIHJlc291cmNlIGhhbmRsZXIgZm9yIGRhdGFiYXNlIG1pZ3JhdGlvbiAqL1xyXG4gICAgY29uc3QgbWlncmF0aW9uRnVuY3Rpb24gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ01pZ3JhdGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1cGFiYXNlIC0gRGF0YWJhc2UgbWlncmF0aW9uIGZ1bmN0aW9uJyxcclxuICAgICAgZW50cnk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjci1taWdyYXRpb25zLWhhbmRsZXIudHMnKSxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBub2RlTW9kdWxlczogW1xyXG4gICAgICAgICAgJ0BkYXRhYmFzZXMvcGcnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgY29tbWFuZEhvb2tzOiB7XHJcbiAgICAgICAgICBiZWZvcmVJbnN0YWxsOiAoX2lucHV0RGlyLCBfb3V0cHV0RGlyKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiBbXTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBiZWZvcmVCdW5kbGluZzogKF9pbnB1dERpciwgX291dHB1dERpcikgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYWZ0ZXJCdW5kbGluZzogKGlucHV0RGlyLCBvdXRwdXREaXIpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAgICBgY3AgLXJwICR7aW5wdXREaXJ9L3NyYy9zdXBhYmFzZS1kYi9zcWwvKiAke291dHB1dERpcn0vYCxcclxuICAgICAgICAgICAgXTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBEQl9TRUNSRVRfQVJOOiB0aGlzLmNsdXN0ZXIuc2VjcmV0IS5zZWNyZXRBcm4sXHJcbiAgICAgIH0sXHJcbiAgICAgIHZwYyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsbG93IGEgZnVuY3Rpb24gdG8gY29ubmVjdCB0byBkYXRhYmFzZVxyXG4gICAgbWlncmF0aW9uRnVuY3Rpb24uY29ubmVjdGlvbnMuYWxsb3dUb0RlZmF1bHRQb3J0KHRoaXMuY2x1c3Rlcik7XHJcblxyXG4gICAgLy8gQWxsb3cgYSBmdW5jdGlvbiB0byByZWFkIGRiIHNlY3JldFxyXG4gICAgdGhpcy5jbHVzdGVyLnNlY3JldD8uZ3JhbnRSZWFkKG1pZ3JhdGlvbkZ1bmN0aW9uKTtcclxuXHJcbiAgICAvKiogQ3VzdG9tIHJlc291cmNlIHByb3ZpZGVyIGZvciBkYXRhYmFzZSBtaWdyYXRpb24gKi9cclxuICAgIGNvbnN0IG1pZ3JhdGlvblByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdNaWdyYXRpb25Qcm92aWRlcicsIHsgb25FdmVudEhhbmRsZXI6IG1pZ3JhdGlvbkZ1bmN0aW9uIH0pO1xyXG5cclxuICAgIC8qKiBEYXRhYmFzZSBtaWdyYXRpb24gKi9cclxuICAgIHRoaXMubWlncmF0aW9uID0gbmV3IGNkay5DdXN0b21SZXNvdXJjZSh0aGlzLCAnTWlncmF0aW9uJywge1xyXG4gICAgICBzZXJ2aWNlVG9rZW46IG1pZ3JhdGlvblByb3ZpZGVyLnNlcnZpY2VUb2tlbixcclxuICAgICAgcmVzb3VyY2VUeXBlOiAnQ3VzdG9tOjpEYXRhYmFzZU1pZ3JhdGlvbicsXHJcbiAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICBGaW5nZXJwcmludDogY2RrLkZpbGVTeXN0ZW0uZmluZ2VycHJpbnQocGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NxbCcpKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdhaXQgdW50aWwgdGhlIGRhdGFiYXNlIGlzIHJlYWR5LlxyXG4gICAgdGhpcy5taWdyYXRpb24ubm9kZS5hZGREZXBlbmRlbmN5KGluc3RhbmNlMSk7XHJcblxyXG4gICAgLyoqIEN1c3RvbSByZXNvdXJjZSBoYW5kbGVyIHRvIG1vZGlmeSBkYiB1c2VyIHBhc3N3b3JkICovXHJcbiAgICBjb25zdCB1c2VyUGFzc3dvcmRGdW5jdGlvbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnVXNlclBhc3N3b3JkRnVuY3Rpb24nLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3VwYWJhc2UgLSBEQiB1c2VyIHBhc3N3b3JkIGZ1bmN0aW9uJyxcclxuICAgICAgZW50cnk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjci11c2VyLXBhc3N3b3JkLWhhbmRsZXIudHMnKSxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBub2RlTW9kdWxlczogWydAZGF0YWJhc2VzL3BnJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgREJfU0VDUkVUX0FSTjogdGhpcy5jbHVzdGVyLnNlY3JldCEuc2VjcmV0QXJuLFxyXG4gICAgICB9LFxyXG4gICAgICBpbml0aWFsUG9saWN5OiBbXHJcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6R2V0U2VjcmV0VmFsdWUnLFxyXG4gICAgICAgICAgICAnc2VjcmV0c21hbmFnZXI6UHV0U2VjcmV0VmFsdWUnLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOnNlY3JldHNtYW5hZ2VyOiR7Y2RrLkF3cy5SRUdJT059OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpzZWNyZXQ6JHtjZGsuQXdzLlNUQUNLX05BTUV9LSR7aWR9LSpgXSxcclxuICAgICAgICB9KSxcclxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICBub3RBY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpQdXRTZWNyZXRWYWx1ZScsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5jbHVzdGVyLnNlY3JldCEuc2VjcmV0QXJuXSxcclxuICAgICAgICB9KSxcclxuICAgICAgXSxcclxuICAgICAgdnBjLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxsb3cgYSBmdW5jdGlvbiB0byBjb25uZWN0IHRvIGRhdGFiYXNlXHJcbiAgICB1c2VyUGFzc3dvcmRGdW5jdGlvbi5jb25uZWN0aW9ucy5hbGxvd1RvRGVmYXVsdFBvcnQodGhpcy5jbHVzdGVyKTtcclxuXHJcbiAgICB0aGlzLnVzZXJQYXNzd29yZFByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdVc2VyUGFzc3dvcmRQcm92aWRlcicsIHsgb25FdmVudEhhbmRsZXI6IHVzZXJQYXNzd29yZEZ1bmN0aW9uIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqIEdlbmVyYXRlIGFuZCBzZXQgcGFzc3dvcmQgdG8gZGF0YWJhc2UgdXNlciAqL1xyXG4gIGdlblVzZXJQYXNzd29yZCh1c2VybmFtZTogc3RyaW5nKSB7XHJcbiAgICAvKiogU2NvcGUgKi9cclxuICAgIGNvbnN0IHVzZXIgPSBuZXcgQ29uc3RydWN0KHRoaXMsIHVzZXJuYW1lKTtcclxuXHJcbiAgICAvKiogVXNlciBzZWNyZXQgKi9cclxuICAgIGNvbnN0IHNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodXNlciwgJ1NlY3JldCcsIHtcclxuICAgICAgc2VjcmV0TmFtZTogYCR7Y2RrLkF3cy5TVEFDS19OQU1FfS0ke3RoaXMubm9kZS5pZH0tJHt1c2VybmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYFN1cGFiYXNlIC0gRGF0YWJhc2UgVXNlciAke3VzZXJuYW1lfWAsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XHJcbiAgICAgICAgZXhjbHVkZVB1bmN0dWF0aW9uOiB0cnVlLFxyXG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lIH0pLFxyXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAncGFzc3dvcmQnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIE1vZGlmeSBwYXNzd29yZCBqb2IgKi9cclxuICAgIGNvbnN0IHBhc3N3b3JkID0gbmV3IGNkay5DdXN0b21SZXNvdXJjZSh1c2VyLCAnUmVzb3VyY2UnLCB7XHJcbiAgICAgIHNlcnZpY2VUb2tlbjogdGhpcy51c2VyUGFzc3dvcmRQcm92aWRlci5zZXJ2aWNlVG9rZW4sXHJcbiAgICAgIHJlc291cmNlVHlwZTogJ0N1c3RvbTo6RGF0YWJhc2VVc2VyUGFzc3dvcmQnLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgVXNlcm5hbWU6IHVzZXJuYW1lLFxyXG4gICAgICAgIFNlY3JldElkOiBzZWNyZXQuc2VjcmV0QXJuLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gV2FpdCB1bnRpbCB0aGUgZGF0YWJhc2UgbWlncmF0aW9uIGlzIGNvbXBsZXRlLlxyXG4gICAgc2VjcmV0Lm5vZGUuYWRkRGVwZW5kZW5jeSh0aGlzLm1pZ3JhdGlvbi5ub2RlLmRlZmF1bHRDaGlsZCEpO1xyXG4gICAgcGFzc3dvcmQubm9kZS5hZGREZXBlbmRlbmN5KHRoaXMubWlncmF0aW9uLm5vZGUuZGVmYXVsdENoaWxkISk7XHJcblxyXG4gICAgcmV0dXJuIHNlY3JldDtcclxuICB9XHJcblxyXG59XHJcbiJdfQ==