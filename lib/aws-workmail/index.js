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
exports.Organization = exports.WorkMailStack = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
class WorkMailStack extends cdk.NestedStack {
    /** Nested stack to enable WorkMail */
    constructor(scope, id, props) {
        super(scope, id, props);
        this.organization = new Organization(this, 'Organization', props.organization);
    }
}
exports.WorkMailStack = WorkMailStack;
class Organization extends constructs_1.Construct {
    /** WorkMail Organization */
    constructor(scope, id, props) {
        super(scope, id);
        this.region = props.region;
        this.alias = props.alias;
        this.domain = `${this.alias}.awsapps.com`;
        /** Custom resource handler to create a organization */
        const createOrgFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'CreateOrgFunction', {
            description: 'Supabase - Create WorkMail Org Function',
            entry: path.resolve(__dirname, 'cr-workmail-org.ts'),
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(10),
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: [
                        'workmail:DescribeOrganization',
                        'workmail:CreateOrganization',
                        'workmail:DeleteOrganization',
                        'ses:DescribeActiveReceiptRuleSet',
                        'ses:SetActiveReceiptRuleSet',
                        'ses:CreateReceiptRuleSet',
                        'ses:CreateReceiptRule',
                        'ses:DeleteReceiptRule',
                        'ses:VerifyDomainIdentity',
                        'ses:VerifyDomainDkim',
                        'ses:SetIdentityEmailNotificationEnabled',
                        'ses:PutIdentityPolicy',
                        'ses:DeleteIdentityPolicy',
                        'ses:DeleteIdentity',
                        'ds:DescribeDirectories',
                        'ds:CreateIdentityPoolDirectory',
                        'ds:DeleteDirectory',
                        'ds:ListAuthorizedApplications',
                        'ds:CreateAlias',
                        'ds:AuthorizeApplication',
                        'ds:UnauthorizeApplication',
                    ],
                    resources: ['*'],
                }),
            ],
        });
        const checkOrgFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'CheckOrgFunction', {
            description: 'Supabase - Check state WorkMail Org Function',
            entry: path.resolve(__dirname, 'check-workmail-org.ts'),
            runtime: lambda.Runtime.NODEJS_18_X,
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: [
                        'workmail:DescribeOrganization',
                        'ses:GetIdentityVerificationAttributes',
                    ],
                    resources: ['*'],
                }),
            ],
        });
        /** Custom resource provider to create a organization */
        const createOrgProvider = new cr.Provider(this, 'CreateOrgProvider', {
            onEventHandler: createOrgFunction,
            isCompleteHandler: checkOrgFunction,
        });
        /** The WorkMail Organization */
        const org = new cdk.CfnResource(this, 'Resource', {
            type: 'Custom::WorkMailOrganization',
            properties: {
                ServiceToken: createOrgProvider.serviceToken,
                Region: this.region,
                Alias: this.alias,
            },
        });
        this.organizationId = org.ref;
        /** Custom resource handler to create a user */
        const createUserFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'CreateUserFunction', {
            description: 'Supabase - Create WorkMail User Function',
            entry: path.resolve(__dirname, 'cr-workmail-user.ts'),
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(10),
            initialPolicy: [
                new iam.PolicyStatement({
                    actions: [
                        'workmail:DescribeOrganization',
                        'workmail:CreateUser',
                        'workmail:DeleteUser',
                        'workmail:RegisterToWorkMail',
                        'workmail:DeregisterFromWorkMail',
                        'ses:GetIdentityVerificationAttributes',
                    ],
                    resources: ['*'],
                }),
            ],
        });
        this.createUserProvider = new cr.Provider(this, 'CreateUserProvider', {
            onEventHandler: createUserFunction,
        });
    }
    /** Add WorkMail User */
    addUser(username, password) {
        const user = new cdk.CfnResource(this, username, {
            type: 'Custom::WorkMailUser',
            properties: {
                ServiceToken: this.createUserProvider.serviceToken,
                Region: this.region,
                OrganizationId: this.organizationId,
                Username: username,
                Password: password,
            },
        });
        return user;
    }
}
exports.Organization = Organization;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYXdzLXdvcmttYWlsL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MsK0RBQWlEO0FBQ2pELHFFQUErRDtBQUUvRCxpRUFBbUQ7QUFDbkQsMkNBQXVDO0FBT3ZDLE1BQWEsYUFBYyxTQUFRLEdBQUcsQ0FBQyxXQUFXO0lBR2hELHNDQUFzQztJQUN0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWlCO1FBQ3pELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDakYsQ0FBQztDQUNGO0FBVEQsc0NBU0M7QUFPRCxNQUFhLFlBQWEsU0FBUSxzQkFBUztJQVl6Qyw0QkFBNEI7SUFDNUIsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUMzQixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLGNBQWMsQ0FBQztRQUUxQyx1REFBdUQ7UUFDdkQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGtDQUFjLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3RFLFdBQVcsRUFBRSx5Q0FBeUM7WUFDdEQsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLG9CQUFvQixD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QUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3BFLGNBQWMsRUFBRSxrQkFBa0I7U0FDbkMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELHdCQUF3QjtJQUN4QixPQUFPLENBQUMsUUFBZ0IsRUFBRSxRQUFnQjtRQUN4QyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUMvQyxJQUFJLEVBQUUsc0JBQXNCO1lBQzVCLFVBQVUsRUFBRTtnQkFDVixZQUFZLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFlBQVk7Z0JBQ2xELE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjO2dCQUNuQyxRQUFRLEVBQUUsUUFBUTtnQkFDbEIsUUFBUSxFQUFFLFFBQVE7YUFDbkI7U0FDRixDQUFDLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FDRjtBQWhJRCxvQ0FnSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XHJcbmltcG9ydCB7IFNlY3JldCB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIGNyIGZyb20gJ2F3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcblxyXG5pbnRlcmZhY2UgU3RhY2tQcm9wcyBleHRlbmRzIGNkay5OZXN0ZWRTdGFja1Byb3BzIHtcclxuICBvcmdhbml6YXRpb246IE9yZ2FuaXphdGlvblByb3BzO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgV29ya01haWxTdGFjayBleHRlbmRzIGNkay5OZXN0ZWRTdGFjayB7XHJcbiAgb3JnYW5pemF0aW9uOiBPcmdhbml6YXRpb247XHJcblxyXG4gIC8qKiBOZXN0ZWQgc3RhY2sgdG8gZW5hYmxlIFdvcmtNYWlsICovXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIHRoaXMub3JnYW5pemF0aW9uID0gbmV3IE9yZ2FuaXphdGlvbih0aGlzLCAnT3JnYW5pemF0aW9uJywgcHJvcHMub3JnYW5pemF0aW9uKTtcclxuICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBPcmdhbml6YXRpb25Qcm9wcyB7XHJcbiAgcmVnaW9uOiBzdHJpbmc7XHJcbiAgYWxpYXM6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE9yZ2FuaXphdGlvbiBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgLyoqIFdvcmtNYWlsIFJlZ2lvbiAqL1xyXG4gIHJlZ2lvbjogc3RyaW5nO1xyXG4gIC8qKiBXb3JrTWFpbCBpZGVudGlmaWVyICovXHJcbiAgYWxpYXM6IHN0cmluZztcclxuICAvKiogV29ya01haWwgZG9tYWluICovXHJcbiAgZG9tYWluOiBzdHJpbmc7XHJcbiAgLyoqIFdvcmtNYWlsIG9yZ2FuaXphdGlvbiBJRCAqL1xyXG4gIG9yZ2FuaXphdGlvbklkOiBzdHJpbmc7XHJcbiAgLyoqIEN1c3RvbSByZXNvdXJjZSBwcm92aWRlciB0byBjcmVhdGUgdXNlciAqL1xyXG4gIGNyZWF0ZVVzZXJQcm92aWRlcjogY3IuUHJvdmlkZXI7XHJcblxyXG4gIC8qKiBXb3JrTWFpbCBPcmdhbml6YXRpb24gKi9cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogT3JnYW5pemF0aW9uUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgdGhpcy5yZWdpb24gPSBwcm9wcy5yZWdpb247XHJcbiAgICB0aGlzLmFsaWFzID0gcHJvcHMuYWxpYXM7XHJcbiAgICB0aGlzLmRvbWFpbiA9IGAke3RoaXMuYWxpYXN9LmF3c2FwcHMuY29tYDtcclxuXHJcbiAgICAvKiogQ3VzdG9tIHJlc291cmNlIGhhbmRsZXIgdG8gY3JlYXRlIGEgb3JnYW5pemF0aW9uICovXHJcbiAgICBjb25zdCBjcmVhdGVPcmdGdW5jdGlvbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnQ3JlYXRlT3JnRnVuY3Rpb24nLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3VwYWJhc2UgLSBDcmVhdGUgV29ya01haWwgT3JnIEZ1bmN0aW9uJyxcclxuICAgICAgZW50cnk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjci13b3JrbWFpbC1vcmcudHMnKSxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgaW5pdGlhbFBvbGljeTogW1xyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgJ3dvcmttYWlsOkRlc2NyaWJlT3JnYW5pemF0aW9uJyxcclxuICAgICAgICAgICAgJ3dvcmttYWlsOkNyZWF0ZU9yZ2FuaXphdGlvbicsXHJcbiAgICAgICAgICAgICd3b3JrbWFpbDpEZWxldGVPcmdhbml6YXRpb24nLFxyXG4gICAgICAgICAgICAnc2VzOkRlc2NyaWJlQWN0aXZlUmVjZWlwdFJ1bGVTZXQnLFxyXG4gICAgICAgICAgICAnc2VzOlNldEFjdGl2ZVJlY2VpcHRSdWxlU2V0JyxcclxuICAgICAgICAgICAgJ3NlczpDcmVhdGVSZWNlaXB0UnVsZVNldCcsXHJcbiAgICAgICAgICAgICdzZXM6Q3JlYXRlUmVjZWlwdFJ1bGUnLFxyXG4gICAgICAgICAgICAnc2VzOkRlbGV0ZVJlY2VpcHRSdWxlJyxcclxuICAgICAgICAgICAgJ3NlczpWZXJpZnlEb21haW5JZGVudGl0eScsXHJcbiAgICAgICAgICAgICdzZXM6VmVyaWZ5RG9tYWluRGtpbScsXHJcbiAgICAgICAgICAgICdzZXM6U2V0SWRlbnRpdHlFbWFpbE5vdGlmaWNhdGlvbkVuYWJsZWQnLFxyXG4gICAgICAgICAgICAnc2VzOlB1dElkZW50aXR5UG9saWN5JyxcclxuICAgICAgICAgICAgJ3NlczpEZWxldGVJZGVudGl0eVBvbGljeScsXHJcbiAgICAgICAgICAgICdzZXM6RGVsZXRlSWRlbnRpdHknLFxyXG4gICAgICAgICAgICAnZHM6RGVzY3JpYmVEaXJlY3RvcmllcycsXHJcbiAgICAgICAgICAgICdkczpDcmVhdGVJZGVudGl0eVBvb2xEaXJlY3RvcnknLFxyXG4gICAgICAgICAgICAnZHM6RGVsZXRlRGlyZWN0b3J5JyxcclxuICAgICAgICAgICAgJ2RzOkxpc3RBdXRob3JpemVkQXBwbGljYXRpb25zJyxcclxuICAgICAgICAgICAgJ2RzOkNyZWF0ZUFsaWFzJyxcclxuICAgICAgICAgICAgJ2RzOkF1dGhvcml6ZUFwcGxpY2F0aW9uJyxcclxuICAgICAgICAgICAgJ2RzOlVuYXV0aG9yaXplQXBwbGljYXRpb24nLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjaGVja09yZ0Z1bmN0aW9uID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdDaGVja09yZ0Z1bmN0aW9uJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1cGFiYXNlIC0gQ2hlY2sgc3RhdGUgV29ya01haWwgT3JnIEZ1bmN0aW9uJyxcclxuICAgICAgZW50cnk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjaGVjay13b3JrbWFpbC1vcmcudHMnKSxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzE4X1gsXHJcbiAgICAgIGluaXRpYWxQb2xpY3k6IFtcclxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICd3b3JrbWFpbDpEZXNjcmliZU9yZ2FuaXphdGlvbicsXHJcbiAgICAgICAgICAgICdzZXM6R2V0SWRlbnRpdHlWZXJpZmljYXRpb25BdHRyaWJ1dGVzJyxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIEN1c3RvbSByZXNvdXJjZSBwcm92aWRlciB0byBjcmVhdGUgYSBvcmdhbml6YXRpb24gKi9cclxuICAgIGNvbnN0IGNyZWF0ZU9yZ1Byb3ZpZGVyID0gbmV3IGNyLlByb3ZpZGVyKHRoaXMsICdDcmVhdGVPcmdQcm92aWRlcicsIHtcclxuICAgICAgb25FdmVudEhhbmRsZXI6IGNyZWF0ZU9yZ0Z1bmN0aW9uLFxyXG4gICAgICBpc0NvbXBsZXRlSGFuZGxlcjogY2hlY2tPcmdGdW5jdGlvbixcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBUaGUgV29ya01haWwgT3JnYW5pemF0aW9uICovXHJcbiAgICBjb25zdCBvcmcgPSBuZXcgY2RrLkNmblJlc291cmNlKHRoaXMsICdSZXNvdXJjZScsIHtcclxuICAgICAgdHlwZTogJ0N1c3RvbTo6V29ya01haWxPcmdhbml6YXRpb24nLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgU2VydmljZVRva2VuOiBjcmVhdGVPcmdQcm92aWRlci5zZXJ2aWNlVG9rZW4sXHJcbiAgICAgICAgUmVnaW9uOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICBBbGlhczogdGhpcy5hbGlhcyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgdGhpcy5vcmdhbml6YXRpb25JZCA9IG9yZy5yZWY7XHJcblxyXG4gICAgLyoqIEN1c3RvbSByZXNvdXJjZSBoYW5kbGVyIHRvIGNyZWF0ZSBhIHVzZXIgKi9cclxuICAgIGNvbnN0IGNyZWF0ZVVzZXJGdW5jdGlvbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnQ3JlYXRlVXNlckZ1bmN0aW9uJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1cGFiYXNlIC0gQ3JlYXRlIFdvcmtNYWlsIFVzZXIgRnVuY3Rpb24nLFxyXG4gICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NyLXdvcmttYWlsLXVzZXIudHMnKSxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgaW5pdGlhbFBvbGljeTogW1xyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgJ3dvcmttYWlsOkRlc2NyaWJlT3JnYW5pemF0aW9uJyxcclxuICAgICAgICAgICAgJ3dvcmttYWlsOkNyZWF0ZVVzZXInLFxyXG4gICAgICAgICAgICAnd29ya21haWw6RGVsZXRlVXNlcicsXHJcbiAgICAgICAgICAgICd3b3JrbWFpbDpSZWdpc3RlclRvV29ya01haWwnLFxyXG4gICAgICAgICAgICAnd29ya21haWw6RGVyZWdpc3RlckZyb21Xb3JrTWFpbCcsXHJcbiAgICAgICAgICAgICdzZXM6R2V0SWRlbnRpdHlWZXJpZmljYXRpb25BdHRyaWJ1dGVzJyxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jcmVhdGVVc2VyUHJvdmlkZXIgPSBuZXcgY3IuUHJvdmlkZXIodGhpcywgJ0NyZWF0ZVVzZXJQcm92aWRlcicsIHtcclxuICAgICAgb25FdmVudEhhbmRsZXI6IGNyZWF0ZVVzZXJGdW5jdGlvbixcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqIEFkZCBXb3JrTWFpbCBVc2VyICovXHJcbiAgYWRkVXNlcih1c2VybmFtZTogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKSB7XHJcbiAgICBjb25zdCB1c2VyID0gbmV3IGNkay5DZm5SZXNvdXJjZSh0aGlzLCB1c2VybmFtZSwge1xyXG4gICAgICB0eXBlOiAnQ3VzdG9tOjpXb3JrTWFpbFVzZXInLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgU2VydmljZVRva2VuOiB0aGlzLmNyZWF0ZVVzZXJQcm92aWRlci5zZXJ2aWNlVG9rZW4sXHJcbiAgICAgICAgUmVnaW9uOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICBPcmdhbml6YXRpb25JZDogdGhpcy5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICBVc2VybmFtZTogdXNlcm5hbWUsXHJcbiAgICAgICAgUGFzc3dvcmQ6IHBhc3N3b3JkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gdXNlcjtcclxuICB9XHJcbn1cclxuIl19