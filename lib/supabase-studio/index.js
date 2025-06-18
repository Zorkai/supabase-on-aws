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
exports.Repository = exports.SupabaseStudio = void 0;
const path = __importStar(require("path"));
const amplify = __importStar(require("@aws-cdk/aws-amplify-alpha"));
const cdk = __importStar(require("aws-cdk-lib"));
const aws_codebuild_1 = require("aws-cdk-lib/aws-codebuild");
const codecommit = __importStar(require("aws-cdk-lib/aws-codecommit"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
class SupabaseStudio extends constructs_1.Construct {
    /** Next.js app on Amplify Hosting */
    constructor(scope, id, props) {
        var _a, _b;
        super(scope, id);
        const buildImage = 'public.ecr.aws/sam/build-nodejs18.x:latest';
        const sourceRepo = 'https://github.com/supabase/supabase.git';
        const sourceBranch = (_a = props.sourceBranch) !== null && _a !== void 0 ? _a : 'master';
        const appRoot = (_b = props.appRoot) !== null && _b !== void 0 ? _b : 'studio';
        const { supabaseUrl, dbSecret, anonKey, serviceRoleKey } = props;
        /** CodeCommit - Source Repository for Amplify Hosting */
        const repository = new Repository(this, 'Repository', {
            repositoryName: cdk.Aws.STACK_NAME,
            description: `${this.node.path}/Repository`,
        });
        /** Import from GitHub to CodeComit */
        const repoImportJob = repository.importFromUrl(sourceRepo, sourceBranch);
        /** IAM Role for SSR app logging */
        const role = new iam.Role(this, 'Role', {
            description: 'The service role that will be used by AWS Amplify for SSR app logging.',
            path: '/service-role/',
            assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
        });
        // Allow the role to access Secret and Parameter
        dbSecret.grantRead(role);
        anonKey.grantRead(role);
        serviceRoleKey.grantRead(role);
        /** BuildSpec for Amplify Hosting */
        const buildSpec = aws_codebuild_1.BuildSpec.fromObjectToYaml({
            version: 1,
            applications: [{
                    appRoot,
                    frontend: {
                        phases: {
                            preBuild: {
                                commands: [
                                    'echo POSTGRES_PASSWORD=$(aws secretsmanager get-secret-value --secret-id $DB_SECRET_ARN --query SecretString | jq -r . | jq -r .password) >> .env.production',
                                    'echo SUPABASE_ANON_KEY=$(aws ssm get-parameter --region $SUPABASE_REGION --name $ANON_KEY_NAME --query Parameter.Value) >> .env.production',
                                    'echo SUPABASE_SERVICE_KEY=$(aws ssm get-parameter --region $SUPABASE_REGION --name $SERVICE_KEY_NAME --query Parameter.Value) >> .env.production',
                                    'env | grep -e STUDIO_PG_META_URL >> .env.production',
                                    'env | grep -e SUPABASE_ >> .env.production',
                                    'env | grep -e NEXT_PUBLIC_ >> .env.production',
                                    'cd ../',
                                    'npx turbo@1.10.3 prune --scope=studio',
                                    'npm clean-install',
                                ],
                            },
                            build: {
                                commands: [
                                    'npx turbo run build --scope=studio --include-dependencies --no-deps',
                                    'npm prune --omit=dev',
                                ],
                            },
                            postBuild: {
                                commands: [
                                    `cd ${appRoot}`,
                                    `rsync -av --ignore-existing .next/standalone/${repository.repositoryName}/${appRoot}/ .next/standalone/`,
                                    `rsync -av --ignore-existing .next/standalone/${repository.repositoryName}/node_modules/ .next/standalone/node_modules/`,
                                    `rm -rf .next/standalone/${repository.repositoryName}`,
                                    'cp .env .env.production .next/standalone/',
                                    // https://nextjs.org/docs/advanced-features/output-file-tracing#automatically-copying-traced-files
                                    'rsync -av --ignore-existing public/ .next/standalone/public/',
                                    'rsync -av --ignore-existing .next/static/ .next/standalone/.next/static/',
                                ],
                            },
                        },
                        artifacts: {
                            baseDirectory: '.next',
                            files: ['**/*'],
                        },
                        cache: {
                            paths: [
                                'node_modules/**/*',
                            ],
                        },
                    },
                }],
        });
        this.app = new amplify.App(this, 'App', {
            appName: this.node.path.replace(/\//g, ''),
            role,
            sourceCodeProvider: new amplify.CodeCommitSourceCodeProvider({ repository }),
            buildSpec,
            environmentVariables: {
                // for Amplify Hosting Build
                NODE_OPTIONS: '--max-old-space-size=4096',
                AMPLIFY_MONOREPO_APP_ROOT: appRoot,
                AMPLIFY_DIFF_DEPLOY: 'false',
                _CUSTOM_IMAGE: buildImage,
                // for Supabase
                STUDIO_PG_META_URL: `${supabaseUrl}/pg`,
                SUPABASE_URL: `${supabaseUrl}`,
                SUPABASE_PUBLIC_URL: `${supabaseUrl}`,
                SUPABASE_REGION: serviceRoleKey.env.region,
                DB_SECRET_ARN: dbSecret.secretArn,
                ANON_KEY_NAME: anonKey.parameterName,
                SERVICE_KEY_NAME: serviceRoleKey.parameterName,
            },
            customRules: [
                { source: '/<*>', target: '/index.html', status: amplify.RedirectStatus.NOT_FOUND_REWRITE },
            ],
        });
        /** SSR v2 */
        this.app.node.defaultChild.addPropertyOverride('Platform', 'WEB_COMPUTE');
        this.prodBranch = this.app.addBranch('ProdBranch', {
            branchName: 'main',
            stage: 'PRODUCTION',
            autoBuild: true,
            environmentVariables: {
                NEXT_PUBLIC_SITE_URL: `https://main.${this.app.appId}.amplifyapp.com`,
            },
        });
        this.prodBranch.node.defaultChild.addPropertyOverride('Framework', 'Next.js - SSR');
        repoImportJob.node.addDependency(this.prodBranch.node.defaultChild);
        /** IAM Policy for SSR app logging */
        const amplifySSRLoggingPolicy = new iam.Policy(this, 'AmplifySSRLoggingPolicy', {
            policyName: `AmplifySSRLoggingPolicy-${this.app.appId}`,
            statements: [
                new iam.PolicyStatement({
                    sid: 'PushLogs',
                    actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/amplify/${this.app.appId}:log-stream:*`],
                }),
                new iam.PolicyStatement({
                    sid: 'CreateLogGroup',
                    actions: ['logs:CreateLogGroup'],
                    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/aws/amplify/*`],
                }),
                new iam.PolicyStatement({
                    sid: 'DescribeLogGroups',
                    actions: ['logs:DescribeLogGroups'],
                    resources: [`arn:${cdk.Aws.PARTITION}:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`],
                }),
            ],
        });
        amplifySSRLoggingPolicy.attachToRole(role);
        this.prodBranchUrl = `https://${this.prodBranch.branchName}.${this.app.defaultDomain}`;
    }
}
exports.SupabaseStudio = SupabaseStudio;
class Repository extends codecommit.Repository {
    /** CodeCommit to sync with GitHub */
    constructor(scope, id, props) {
        super(scope, id, props);
        this.importFunction = new lambda.Function(this, 'ImportFunction', {
            description: 'Clone to CodeCommit from remote repo (You can execute this function manually.)',
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.resolve(__dirname, 'cr-import-repo'), {
                bundling: {
                    image: cdk.DockerImage.fromRegistry('public.ecr.aws/sam/build-python3.12:latest-x86_64'),
                    command: [
                        '/bin/bash', '-c', [
                            'mkdir -p /var/task/local/{bin,lib}',
                            'cp /usr/bin/git /usr/libexec/git-core/git-remote-https /usr/libexec/git-core/git-remote-http /var/task/local/bin',
                            'ldd /usr/bin/git | awk \'NF == 4 { system("cp " $3 " /var/task/local/lib/") }\'',
                            'ldd /usr/libexec/git-core/git-remote-https | awk \'NF == 4 { system("cp " $3 " /var/task/local/lib/") }\'',
                            'ldd /usr/libexec/git-core/git-remote-http | awk \'NF == 4 { system("cp " $3 " /var/task/local/lib/") }\'',
                            'pip install -r requirements.txt -t /var/task',
                            'cp -au /asset-input/index.py /var/task',
                            'cp -aur /var/task/* /asset-output',
                        ].join('&&'),
                    ],
                    user: 'root',
                },
            }),
            handler: 'index.handler',
            memorySize: 4096,
            ephemeralStorageSize: cdk.Size.gibibytes(3),
            timeout: cdk.Duration.minutes(15),
            environment: {
                TARGET_REPO: this.repositoryCloneUrlGrc,
            },
        });
        this.grantPullPush(this.importFunction);
        this.importProvider = new cr.Provider(this, 'ImportProvider', { onEventHandler: this.importFunction });
    }
    importFromUrl(sourceRepoUrlHttp, sourceBranch, targetBranch = 'main') {
        this.importFunction.addEnvironment('SOURCE_REPO', sourceRepoUrlHttp);
        this.importFunction.addEnvironment('SOURCE_BRANCH', sourceBranch);
        this.importFunction.addEnvironment('TARGET_BRANCH', targetBranch);
        return new cdk.CustomResource(this, targetBranch, {
            resourceType: 'Custom::RepoImportJob',
            serviceToken: this.importProvider.serviceToken,
            properties: {
                SourceRepo: sourceRepoUrlHttp,
                SourceBranch: sourceBranch,
            },
        });
    }
}
exports.Repository = Repository;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc3VwYWJhc2Utc3R1ZGlvL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLG9FQUFzRDtBQUN0RCxpREFBbUM7QUFDbkMsNkRBQXNEO0FBQ3RELHVFQUF5RDtBQUN6RCx5REFBMkM7QUFDM0MsK0RBQWlEO0FBR2pELGlFQUFtRDtBQUNuRCwyQ0FBdUM7QUFXdkMsTUFBYSxjQUFlLFNBQVEsc0JBQVM7SUFRM0MscUNBQXFDO0lBQ3JDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7O1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxVQUFVLEdBQUcsNENBQTRDLENBQUM7UUFDaEUsTUFBTSxVQUFVLEdBQUcsMENBQTBDLENBQUM7UUFDOUQsTUFBTSxZQUFZLEdBQUcsTUFBQSxLQUFLLENBQUMsWUFBWSxtQ0FBSSxRQUFRLENBQUM7UUFDcEQsTUFBTSxPQUFPLEdBQUcsTUFBQSxLQUFLLENBQUMsT0FBTyxtQ0FBSSxRQUFRLENBQUM7UUFDMUMsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUVqRSx5REFBeUQ7UUFDekQsTUFBTSxVQUFVLEdBQUcsSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwRCxjQUFjLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVO1lBQ2xDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxhQUFhO1NBQzVDLENBQUMsQ0FBQztRQUVILHNDQUFzQztRQUN0QyxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUV6RSxtQ0FBbUM7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dUIsTUFBTTtRQUMxRixJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsZUFBZSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBRWxFLE9BQU8sSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDaEQsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZO1lBQzlDLFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUUsaUJBQWlCO2dCQUM3QixZQUFZLEVBQUUsWUFBWTthQUMzQjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXhERCxnQ0F3REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBhbXBsaWZ5IGZyb20gJ0Bhd3MtY2RrL2F3cy1hbXBsaWZ5LWFscGhhJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQnVpbGRTcGVjIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZGVidWlsZCc7XHJcbmltcG9ydCAqIGFzIGNvZGVjb21taXQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZGVjb21taXQnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgSVNlY3JldCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XHJcbmltcG9ydCB7IFN0cmluZ1BhcmFtZXRlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5pbnRlcmZhY2UgU3VwYWJhc2VTdHVkaW9Qcm9wcyB7XHJcbiAgc291cmNlQnJhbmNoPzogc3RyaW5nO1xyXG4gIGFwcFJvb3Q/OiBzdHJpbmc7XHJcbiAgc3VwYWJhc2VVcmw6IHN0cmluZztcclxuICBkYlNlY3JldDogSVNlY3JldDtcclxuICBhbm9uS2V5OiBTdHJpbmdQYXJhbWV0ZXI7XHJcbiAgc2VydmljZVJvbGVLZXk6IFN0cmluZ1BhcmFtZXRlcjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN1cGFiYXNlU3R1ZGlvIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICAvKiogQXBwIGluIEFtcGxpZnkgSG9zdGluZy4gSXQgaXMgYSBjb2xsZWN0aW9uIG9mIGJyYW5jaGVzLiAqL1xyXG4gIHJlYWRvbmx5IGFwcDogYW1wbGlmeS5BcHA7XHJcbiAgLyoqIFByb2R1Y3Rpb24gYnJhbmNoICovXHJcbiAgcmVhZG9ubHkgcHJvZEJyYW5jaDogYW1wbGlmeS5CcmFuY2g7XHJcbiAgLyoqIFVSTCBvZiBwcm9kdWN0aW9uIGJyYW5jaCAqL1xyXG4gIHJlYWRvbmx5IHByb2RCcmFuY2hVcmw6IHN0cmluZztcclxuXHJcbiAgLyoqIE5leHQuanMgYXBwIG9uIEFtcGxpZnkgSG9zdGluZyAqL1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTdXBhYmFzZVN0dWRpb1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IGJ1aWxkSW1hZ2UgPSAncHVibGljLmVjci5hd3Mvc2FtL2J1aWxkLW5vZGVqczE4Lng6bGF0ZXN0JztcclxuICAgIGNvbnN0IHNvdXJjZVJlcG8gPSAnaHR0cHM6Ly9naXRodWIuY29tL3N1cGFiYXNlL3N1cGFiYXNlLmdpdCc7XHJcbiAgICBjb25zdCBzb3VyY2VCcmFuY2ggPSBwcm9wcy5zb3VyY2VCcmFuY2ggPz8gJ21hc3Rlcic7XHJcbiAgICBjb25zdCBhcHBSb290ID0gcHJvcHMuYXBwUm9vdCA/PyAnc3R1ZGlvJztcclxuICAgIGNvbnN0IHsgc3VwYWJhc2VVcmwsIGRiU2VjcmV0LCBhbm9uS2V5LCBzZXJ2aWNlUm9sZUtleSB9ID0gcHJvcHM7XHJcblxyXG4gICAgLyoqIENvZGVDb21taXQgLSBTb3VyY2UgUmVwb3NpdG9yeSBmb3IgQW1wbGlmeSBIb3N0aW5nICovXHJcbiAgICBjb25zdCByZXBvc2l0b3J5ID0gbmV3IFJlcG9zaXRvcnkodGhpcywgJ1JlcG9zaXRvcnknLCB7XHJcbiAgICAgIHJlcG9zaXRvcnlOYW1lOiBjZGsuQXdzLlNUQUNLX05BTUUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgJHt0aGlzLm5vZGUucGF0aH0vUmVwb3NpdG9yeWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKiogSW1wb3J0IGZyb20gR2l0SHViIHRvIENvZGVDb21pdCAqL1xyXG4gICAgY29uc3QgcmVwb0ltcG9ydEpvYiA9IHJlcG9zaXRvcnkuaW1wb3J0RnJvbVVybChzb3VyY2VSZXBvLCBzb3VyY2VCcmFuY2gpO1xyXG5cclxuICAgIC8qKiBJQU0gUm9sZSBmb3IgU1NSIGFwcCBsb2dnaW5nICovXHJcbiAgICBjb25zdCByb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdSb2xlJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RoZSBzZXJ2aWNlIHJvbGUgdGhhdCB3aWxsIGJlIHVzZWQgYnkgQVdTIEFtcGxpZnkgZm9yIFNTUiBhcHAgbG9nZ2luZy4nLFxyXG4gICAgICBwYXRoOiAnL3NlcnZpY2Utcm9sZS8nLFxyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYW1wbGlmeS5hbWF6b25hd3MuY29tJyksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGxvdyB0aGUgcm9sZSB0byBhY2Nlc3MgU2VjcmV0IGFuZCBQYXJhbWV0ZXJcclxuICAgIGRiU2VjcmV0LmdyYW50UmVhZChyb2xlKTtcclxuICAgIGFub25LZXkuZ3JhbnRSZWFkKHJvbGUpO1xyXG4gICAgc2VydmljZVJvbGVLZXkuZ3JhbnRSZWFkKHJvbGUpO1xyXG5cclxuICAgIC8qKiBCdWlsZFNwZWMgZm9yIEFtcGxpZnkgSG9zdGluZyAqL1xyXG4gICAgY29uc3QgYnVpbGRTcGVjID0gQnVpbGRTcGVjLmZyb21PYmplY3RUb1lhbWwoe1xyXG4gICAgICB2ZXJzaW9uOiAxLFxyXG4gICAgICBhcHBsaWNhdGlvbnM6IFt7XHJcbiAgICAgICAgYXBwUm9vdCxcclxuICAgICAgICBmcm9udGVuZDoge1xyXG4gICAgICAgICAgcGhhc2VzOiB7XHJcbiAgICAgICAgICAgIHByZUJ1aWxkOiB7XHJcbiAgICAgICAgICAgICAgY29tbWFuZHM6IFtcclxuICAgICAgICAgICAgICAgICdlY2hvIFBPU1RHUkVTX1BBU1NXT1JEPSQoYXdzIHNlY3JldHNtYW5hZ2VyIGdldC1zZWNyZXQtdmFsdWUgLS1zZWNyZXQtaWQgJERCX1NFQ1JFVF9BUk4gLS1xdWVyeSBTZWNyZXRTdHJpbmcgfCBqcSAtciAuIHwganEgLXIgLnBhc3N3b3JkKSA+PiAuZW52LnByb2R1Y3Rpb24nLFxyXG4gICAgICAgICAgICAgICAgJ2VjaG8gU1VQQUJBU0VfQU5PTl9LRVk9JChhd3Mgc3NtIGdldC1wYXJhbWV0ZXIgLS1yZWdpb24gJFNVUEFCQVNFX1JFR0lPTiAtLW5hbWUgJEFOT05fS0VZX05BTUUgLS1xdWVyeSBQYXJhbWV0ZXIuVmFsdWUpID4+IC5lbnYucHJvZHVjdGlvbicsXHJcbiAgICAgICAgICAgICAgICAnZWNobyBTVVBBQkFTRV9TRVJWSUNFX0tFWT0kKGF3cyBzc20gZ2V0LXBhcmFtZXRlciAtLXJlZ2lvbiAkU1VQQUJBU0VfUkVHSU9OIC0tbmFtZSAkU0VSVklDRV9LRVlfTkFNRSAtLXF1ZXJ5IFBhcmFtZXRlci5WYWx1ZSkgPj4gLmVudi5wcm9kdWN0aW9uJyxcclxuICAgICAgICAgICAgICAgICdlbnYgfCBncmVwIC1lIFNUVURJT19QR19NRVRBX1VSTCA+PiAuZW52LnByb2R1Y3Rpb24nLFxyXG4gICAgICAgICAgICAgICAgJ2VudiB8IGdyZXAgLWUgU1VQQUJBU0VfID4+IC5lbnYucHJvZHVjdGlvbicsXHJcbiAgICAgICAgICAgICAgICAnZW52IHwgZ3JlcCAtZSBORVhUX1BVQkxJQ18gPj4gLmVudi5wcm9kdWN0aW9uJyxcclxuICAgICAgICAgICAgICAgICdjZCAuLi8nLFxyXG4gICAgICAgICAgICAgICAgJ25weCB0dXJib0AxLjEwLjMgcHJ1bmUgLS1zY29wZT1zdHVkaW8nLFxyXG4gICAgICAgICAgICAgICAgJ25wbSBjbGVhbi1pbnN0YWxsJyxcclxuICAgICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBidWlsZDoge1xyXG4gICAgICAgICAgICAgIGNvbW1hbmRzOiBbXHJcbiAgICAgICAgICAgICAgICAnbnB4IHR1cmJvIHJ1biBidWlsZCAtLXNjb3BlPXN0dWRpbyAtLWluY2x1ZGUtZGVwZW5kZW5jaWVzIC0tbm8tZGVwcycsXHJcbiAgICAgICAgICAgICAgICAnbnBtIHBydW5lIC0tb21pdD1kZXYnLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHBvc3RCdWlsZDoge1xyXG4gICAgICAgICAgICAgIGNvbW1hbmRzOiBbXHJcbiAgICAgICAgICAgICAgICBgY2QgJHthcHBSb290fWAsXHJcbiAgICAgICAgICAgICAgICBgcnN5bmMgLWF2IC0taWdub3JlLWV4aXN0aW5nIC5uZXh0L3N0YW5kYWxvbmUvJHtyZXBvc2l0b3J5LnJlcG9zaXRvcnlOYW1lfS8ke2FwcFJvb3R9LyAubmV4dC9zdGFuZGFsb25lL2AsXHJcbiAgICAgICAgICAgICAgICBgcnN5bmMgLWF2IC0taWdub3JlLWV4aXN0aW5nIC5uZXh0L3N0YW5kYWxvbmUvJHtyZXBvc2l0b3J5LnJlcG9zaXRvcnlOYW1lfS9ub2RlX21vZHVsZXMvIC5uZXh0L3N0YW5kYWxvbmUvbm9kZV9tb2R1bGVzL2AsXHJcbiAgICAgICAgICAgICAgICBgcm0gLXJmIC5uZXh0L3N0YW5kYWxvbmUvJHtyZXBvc2l0b3J5LnJlcG9zaXRvcnlOYW1lfWAsXHJcbiAgICAgICAgICAgICAgICAnY3AgLmVudiAuZW52LnByb2R1Y3Rpb24gLm5leHQvc3RhbmRhbG9uZS8nLFxyXG4gICAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9uZXh0anMub3JnL2RvY3MvYWR2YW5jZWQtZmVhdHVyZXMvb3V0cHV0LWZpbGUtdHJhY2luZyNhdXRvbWF0aWNhbGx5LWNvcHlpbmctdHJhY2VkLWZpbGVzXHJcbiAgICAgICAgICAgICAgICAncnN5bmMgLWF2IC0taWdub3JlLWV4aXN0aW5nIHB1YmxpYy8gLm5leHQvc3RhbmRhbG9uZS9wdWJsaWMvJyxcclxuICAgICAgICAgICAgICAgICdyc3luYyAtYXYgLS1pZ25vcmUtZXhpc3RpbmcgLm5leHQvc3RhdGljLyAubmV4dC9zdGFuZGFsb25lLy5uZXh0L3N0YXRpYy8nLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYXJ0aWZhY3RzOiB7XHJcbiAgICAgICAgICAgIGJhc2VEaXJlY3Rvcnk6ICcubmV4dCcsXHJcbiAgICAgICAgICAgIGZpbGVzOiBbJyoqLyonXSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjYWNoZToge1xyXG4gICAgICAgICAgICBwYXRoczogW1xyXG4gICAgICAgICAgICAgICdub2RlX21vZHVsZXMvKiovKicsXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5hcHAgPSBuZXcgYW1wbGlmeS5BcHAodGhpcywgJ0FwcCcsIHtcclxuICAgICAgYXBwTmFtZTogdGhpcy5ub2RlLnBhdGgucmVwbGFjZSgvXFwvL2csICcnKSxcclxuICAgICAgcm9sZSxcclxuICAgICAgc291cmNlQ29kZVByb3ZpZGVyOiBuZXcgYW1wbGlmeS5Db2RlQ29tbWl0U291cmNlQ29kZVByb3ZpZGVyKHsgcmVwb3NpdG9yeSB9KSxcclxuICAgICAgYnVpbGRTcGVjLFxyXG4gICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xyXG4gICAgICAgIC8vIGZvciBBbXBsaWZ5IEhvc3RpbmcgQnVpbGRcclxuICAgICAgICBOT0RFX09QVElPTlM6ICctLW1heC1vbGQtc3BhY2Utc2l6ZT00MDk2JyxcclxuICAgICAgICBBTVBMSUZZX01PTk9SRVBPX0FQUF9ST09UOiBhcHBSb290LFxyXG4gICAgICAgIEFNUExJRllfRElGRl9ERVBMT1k6ICdmYWxzZScsXHJcbiAgICAgICAgX0NVU1RPTV9JTUFHRTogYnVpbGRJbWFnZSxcclxuICAgICAgICAvLyBmb3IgU3VwYWJhc2VcclxuICAgICAgICBTVFVESU9fUEdfTUVUQV9VUkw6IGAke3N1cGFiYXNlVXJsfS9wZ2AsXHJcbiAgICAgICAgU1VQQUJBU0VfVVJMOiBgJHtzdXBhYmFzZVVybH1gLFxyXG4gICAgICAgIFNVUEFCQVNFX1BVQkxJQ19VUkw6IGAke3N1cGFiYXNlVXJsfWAsXHJcbiAgICAgICAgU1VQQUJBU0VfUkVHSU9OOiBzZXJ2aWNlUm9sZUtleS5lbnYucmVnaW9uLFxyXG4gICAgICAgIERCX1NFQ1JFVF9BUk46IGRiU2VjcmV0LnNlY3JldEFybixcclxuICAgICAgICBBTk9OX0tFWV9OQU1FOiBhbm9uS2V5LnBhcmFtZXRlck5hbWUsXHJcbiAgICAgICAgU0VSVklDRV9LRVlfTkFNRTogc2VydmljZVJvbGVLZXkucGFyYW1ldGVyTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgY3VzdG9tUnVsZXM6IFtcclxuICAgICAgICB7IHNvdXJjZTogJy88Kj4nLCB0YXJnZXQ6ICcvaW5kZXguaHRtbCcsIHN0YXR1czogYW1wbGlmeS5SZWRpcmVjdFN0YXR1cy5OT1RfRk9VTkRfUkVXUklURSB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIFNTUiB2MiAqL1xyXG4gICAgKHRoaXMuYXBwLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNkay5DZm5SZXNvdXJjZSkuYWRkUHJvcGVydHlPdmVycmlkZSgnUGxhdGZvcm0nLCAnV0VCX0NPTVBVVEUnKTtcclxuXHJcbiAgICB0aGlzLnByb2RCcmFuY2ggPSB0aGlzLmFwcC5hZGRCcmFuY2goJ1Byb2RCcmFuY2gnLCB7XHJcbiAgICAgIGJyYW5jaE5hbWU6ICdtYWluJyxcclxuICAgICAgc3RhZ2U6ICdQUk9EVUNUSU9OJyxcclxuICAgICAgYXV0b0J1aWxkOiB0cnVlLFxyXG4gICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xyXG4gICAgICAgIE5FWFRfUFVCTElDX1NJVEVfVVJMOiBgaHR0cHM6Ly9tYWluLiR7dGhpcy5hcHAuYXBwSWR9LmFtcGxpZnlhcHAuY29tYCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgKHRoaXMucHJvZEJyYW5jaC5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjZGsuQ2ZuUmVzb3VyY2UpLmFkZFByb3BlcnR5T3ZlcnJpZGUoJ0ZyYW1ld29yaycsICdOZXh0LmpzIC0gU1NSJyk7XHJcblxyXG4gICAgcmVwb0ltcG9ydEpvYi5ub2RlLmFkZERlcGVuZGVuY3kodGhpcy5wcm9kQnJhbmNoLm5vZGUuZGVmYXVsdENoaWxkISk7XHJcblxyXG4gICAgLyoqIElBTSBQb2xpY3kgZm9yIFNTUiBhcHAgbG9nZ2luZyAqL1xyXG4gICAgY29uc3QgYW1wbGlmeVNTUkxvZ2dpbmdQb2xpY3kgPSBuZXcgaWFtLlBvbGljeSh0aGlzLCAnQW1wbGlmeVNTUkxvZ2dpbmdQb2xpY3knLCB7XHJcbiAgICAgIHBvbGljeU5hbWU6IGBBbXBsaWZ5U1NSTG9nZ2luZ1BvbGljeS0ke3RoaXMuYXBwLmFwcElkfWAsXHJcbiAgICAgIHN0YXRlbWVudHM6IFtcclxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICBzaWQ6ICdQdXNoTG9ncycsXHJcbiAgICAgICAgICBhY3Rpb25zOiBbJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJywgJ2xvZ3M6UHV0TG9nRXZlbnRzJ10sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFtgYXJuOiR7Y2RrLkF3cy5QQVJUSVRJT059OmxvZ3M6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OmxvZy1ncm91cDovYXdzL2FtcGxpZnkvJHt0aGlzLmFwcC5hcHBJZH06bG9nLXN0cmVhbToqYF0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgc2lkOiAnQ3JlYXRlTG9nR3JvdXAnLFxyXG4gICAgICAgICAgYWN0aW9uczogWydsb2dzOkNyZWF0ZUxvZ0dyb3VwJ10sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFtgYXJuOiR7Y2RrLkF3cy5QQVJUSVRJT059OmxvZ3M6JHtjZGsuQXdzLlJFR0lPTn06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OmxvZy1ncm91cDovYXdzL2FtcGxpZnkvKmBdLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIHNpZDogJ0Rlc2NyaWJlTG9nR3JvdXBzJyxcclxuICAgICAgICAgIGFjdGlvbnM6IFsnbG9nczpEZXNjcmliZUxvZ0dyb3VwcyddLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbYGFybjoke2Nkay5Bd3MuUEFSVElUSU9OfTpsb2dzOiR7Y2RrLkF3cy5SRUdJT059OiR7Y2RrLkF3cy5BQ0NPVU5UX0lEfTpsb2ctZ3JvdXA6KmBdLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcbiAgICBhbXBsaWZ5U1NSTG9nZ2luZ1BvbGljeS5hdHRhY2hUb1JvbGUocm9sZSk7XHJcblxyXG4gICAgdGhpcy5wcm9kQnJhbmNoVXJsID0gYGh0dHBzOi8vJHt0aGlzLnByb2RCcmFuY2guYnJhbmNoTmFtZX0uJHt0aGlzLmFwcC5kZWZhdWx0RG9tYWlufWA7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJlcG9zaXRvcnkgZXh0ZW5kcyBjb2RlY29tbWl0LlJlcG9zaXRvcnkge1xyXG4gIHJlYWRvbmx5IGltcG9ydEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcmVhZG9ubHkgaW1wb3J0UHJvdmlkZXI6IGNyLlByb3ZpZGVyO1xyXG5cclxuICAvKiogQ29kZUNvbW1pdCB0byBzeW5jIHdpdGggR2l0SHViICovXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IGNvZGVjb21taXQuUmVwb3NpdG9yeVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICB0aGlzLmltcG9ydEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSW1wb3J0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvbmUgdG8gQ29kZUNvbW1pdCBmcm9tIHJlbW90ZSByZXBvIChZb3UgY2FuIGV4ZWN1dGUgdGhpcyBmdW5jdGlvbiBtYW51YWxseS4pJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY3ItaW1wb3J0LXJlcG8nKSwge1xyXG4gICAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgICBpbWFnZTogY2RrLkRvY2tlckltYWdlLmZyb21SZWdpc3RyeSgncHVibGljLmVjci5hd3Mvc2FtL2J1aWxkLXB5dGhvbjMuMTI6bGF0ZXN0LXg4Nl82NCcpLFxyXG4gICAgICAgICAgY29tbWFuZDogW1xyXG4gICAgICAgICAgICAnL2Jpbi9iYXNoJywgJy1jJywgW1xyXG4gICAgICAgICAgICAgICdta2RpciAtcCAvdmFyL3Rhc2svbG9jYWwve2JpbixsaWJ9JyxcclxuICAgICAgICAgICAgICAnY3AgL3Vzci9iaW4vZ2l0IC91c3IvbGliZXhlYy9naXQtY29yZS9naXQtcmVtb3RlLWh0dHBzIC91c3IvbGliZXhlYy9naXQtY29yZS9naXQtcmVtb3RlLWh0dHAgL3Zhci90YXNrL2xvY2FsL2JpbicsXHJcbiAgICAgICAgICAgICAgJ2xkZCAvdXNyL2Jpbi9naXQgfCBhd2sgXFwnTkYgPT0gNCB7IHN5c3RlbShcImNwIFwiICQzIFwiIC92YXIvdGFzay9sb2NhbC9saWIvXCIpIH1cXCcnLFxyXG4gICAgICAgICAgICAgICdsZGQgL3Vzci9saWJleGVjL2dpdC1jb3JlL2dpdC1yZW1vdGUtaHR0cHMgfCBhd2sgXFwnTkYgPT0gNCB7IHN5c3RlbShcImNwIFwiICQzIFwiIC92YXIvdGFzay9sb2NhbC9saWIvXCIpIH1cXCcnLFxyXG4gICAgICAgICAgICAgICdsZGQgL3Vzci9saWJleGVjL2dpdC1jb3JlL2dpdC1yZW1vdGUtaHR0cCB8IGF3ayBcXCdORiA9PSA0IHsgc3lzdGVtKFwiY3AgXCIgJDMgXCIgL3Zhci90YXNrL2xvY2FsL2xpYi9cIikgfVxcJycsXHJcbiAgICAgICAgICAgICAgJ3BpcCBpbnN0YWxsIC1yIHJlcXVpcmVtZW50cy50eHQgLXQgL3Zhci90YXNrJyxcclxuICAgICAgICAgICAgICAnY3AgLWF1IC9hc3NldC1pbnB1dC9pbmRleC5weSAvdmFyL3Rhc2snLFxyXG4gICAgICAgICAgICAgICdjcCAtYXVyIC92YXIvdGFzay8qIC9hc3NldC1vdXRwdXQnLFxyXG4gICAgICAgICAgICBdLmpvaW4oJyYmJyksXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgdXNlcjogJ3Jvb3QnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIG1lbW9yeVNpemU6IDQwOTYsXHJcbiAgICAgIGVwaGVtZXJhbFN0b3JhZ2VTaXplOiBjZGsuU2l6ZS5naWJpYnl0ZXMoMyksXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBUQVJHRVRfUkVQTzogdGhpcy5yZXBvc2l0b3J5Q2xvbmVVcmxHcmMsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZ3JhbnRQdWxsUHVzaCh0aGlzLmltcG9ydEZ1bmN0aW9uKTtcclxuXHJcbiAgICB0aGlzLmltcG9ydFByb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdJbXBvcnRQcm92aWRlcicsIHsgb25FdmVudEhhbmRsZXI6IHRoaXMuaW1wb3J0RnVuY3Rpb24gfSk7XHJcbiAgfVxyXG5cclxuICBpbXBvcnRGcm9tVXJsKHNvdXJjZVJlcG9VcmxIdHRwOiBzdHJpbmcsIHNvdXJjZUJyYW5jaDogc3RyaW5nLCB0YXJnZXRCcmFuY2g6IHN0cmluZyA9ICdtYWluJykge1xyXG4gICAgdGhpcy5pbXBvcnRGdW5jdGlvbi5hZGRFbnZpcm9ubWVudCgnU09VUkNFX1JFUE8nLCBzb3VyY2VSZXBvVXJsSHR0cCk7XHJcbiAgICB0aGlzLmltcG9ydEZ1bmN0aW9uLmFkZEVudmlyb25tZW50KCdTT1VSQ0VfQlJBTkNIJywgc291cmNlQnJhbmNoKTtcclxuICAgIHRoaXMuaW1wb3J0RnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoJ1RBUkdFVF9CUkFOQ0gnLCB0YXJnZXRCcmFuY2gpO1xyXG5cclxuICAgIHJldHVybiBuZXcgY2RrLkN1c3RvbVJlc291cmNlKHRoaXMsIHRhcmdldEJyYW5jaCwge1xyXG4gICAgICByZXNvdXJjZVR5cGU6ICdDdXN0b206OlJlcG9JbXBvcnRKb2InLFxyXG4gICAgICBzZXJ2aWNlVG9rZW46IHRoaXMuaW1wb3J0UHJvdmlkZXIuc2VydmljZVRva2VuLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgU291cmNlUmVwbzogc291cmNlUmVwb1VybEh0dHAsXHJcbiAgICAgICAgU291cmNlQnJhbmNoOiBzb3VyY2VCcmFuY2gsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19