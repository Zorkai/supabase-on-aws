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
exports.SesSmtp = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
const aws_workmail_1 = require("../aws-workmail");
class SesSmtp extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { region, email, workMailEnabled } = props;
        /** IAM Policy to send email via Amazon SES */
        const sendEmailPolicy = new iam.Policy(this, 'SendEmailPolicy', {
            statements: [
                new iam.PolicyStatement({
                    actions: ['ses:SendRawEmail'],
                    resources: ['*'],
                }),
            ],
        });
        /** IAM User to send email via Amazon SES */
        const user = new iam.User(this, 'User');
        user.attachInlinePolicy(sendEmailPolicy);
        /** SMTP username */
        const accessKey = new iam.CfnAccessKey(this, 'AccessKey', { userName: user.userName });
        /** Custom resource handler to generate a SMTP password */
        const passwordFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'PasswordFunction', {
            description: 'Supabase - Generate SMTP Password Function',
            entry: path.resolve(__dirname, 'cr-smtp-password.ts'),
            runtime: lambda.Runtime.NODEJS_20_X,
        });
        /** Custom resource provider to generate a SMTP password */
        const passwordProvider = new cr.Provider(this, 'PasswordProvider', { onEventHandler: passwordFunction });
        /** SMTP password */
        const password = new cdk.CustomResource(this, 'Password', {
            resourceType: 'Custom::Password',
            serviceToken: passwordProvider.serviceToken,
            properties: {
                Region: region,
                SecretAccessKey: accessKey.attrSecretAccessKey,
            },
        });
        const stackId = cdk.Fn.select(2, cdk.Fn.split('/', cdk.Aws.STACK_ID));
        /** Amazon WorkMail Stack */
        const workMail = new aws_workmail_1.WorkMailStack(this, 'WorkMail', {
            description: 'Amazon WorkMail for Test Domain',
            organization: { region: region, alias: stackId },
        });
        // Add condition
        workMail.node.defaultChild.cfnOptions.condition = workMailEnabled;
        /** The mail user on WorkMail */
        const workMailUser = workMail.organization.addUser('Supabase', password.getAttString('Password'));
        this.host = cdk.Fn.conditionIf(workMailEnabled.logicalId, `smtp.mail.${region}.awsapps.com`, `email-smtp.${region}.amazonaws.com`).toString();
        this.port = 465;
        this.email = cdk.Fn.conditionIf(workMailEnabled.logicalId, workMailUser.getAtt('Email'), email).toString();
        /**
         * SMTP username
         *
         * If WorkMail is enabled, use the WorkMail user's email address.
         */
        const username = cdk.Fn.conditionIf(workMailEnabled.logicalId, workMailUser.getAtt('Email'), accessKey.ref).toString();
        this.secret = new aws_secretsmanager_1.Secret(this, 'Secret', {
            secretName: `${cdk.Aws.STACK_NAME}${id}Secret`,
            description: 'Supabase - SMTP Secret',
            secretObjectValue: {
                username: cdk.SecretValue.unsafePlainText(username),
                password: cdk.SecretValue.resourceAttribute(password.getAttString('Password')),
                host: cdk.SecretValue.unsafePlainText(this.host),
            },
        });
    }
}
exports.SesSmtp = SesSmtp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYW1hem9uLXNlcy1zbXRwL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MsK0RBQWlEO0FBQ2pELHFFQUErRDtBQUMvRCx1RUFBd0Q7QUFDeEQsaUVBQW1EO0FBQ25ELDJDQUF1QztBQUN2QyxrREFBZ0Q7QUFRaEQsTUFBYSxPQUFRLFNBQVEsc0JBQVM7SUFNcEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFtQjtRQUMzRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUVqRCw4Q0FBOEM7UUFDOUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUM5RCxVQUFVLEVBQUU7Z0JBQ1YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO29CQUN0QixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQztvQkFDN0IsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUNqQixDQUFDO2FBQ0g7U0FDRixDQUFDLENBQUM7UUFFSCw0Q0FBNEM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFekMsb0JBQW9CO1FBQ3BCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxD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QixDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzlFLElBQUksRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2FBQ2pEO1NBQ0YsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUNGO0FBbkZELDBCQW1GQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcclxuaW1wb3J0IHsgU2VjcmV0IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgY3IgZnJvbSAnYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlcyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBXb3JrTWFpbFN0YWNrIH0gZnJvbSAnLi4vYXdzLXdvcmttYWlsJztcclxuXHJcbmludGVyZmFjZSBTZXNTbXRwUHJvcHMge1xyXG4gIHJlZ2lvbjogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgd29ya01haWxFbmFibGVkOiBjZGsuQ2ZuQ29uZGl0aW9uO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2VzU210cCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgc2VjcmV0OiBTZWNyZXQ7XHJcbiAgaG9zdDogc3RyaW5nO1xyXG4gIHBvcnQ6IG51bWJlcjtcclxuICBlbWFpbDogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU2VzU210cFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IHsgcmVnaW9uLCBlbWFpbCwgd29ya01haWxFbmFibGVkIH0gPSBwcm9wcztcclxuXHJcbiAgICAvKiogSUFNIFBvbGljeSB0byBzZW5kIGVtYWlsIHZpYSBBbWF6b24gU0VTICovXHJcbiAgICBjb25zdCBzZW5kRW1haWxQb2xpY3kgPSBuZXcgaWFtLlBvbGljeSh0aGlzLCAnU2VuZEVtYWlsUG9saWN5Jywge1xyXG4gICAgICBzdGF0ZW1lbnRzOiBbXHJcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgYWN0aW9uczogWydzZXM6U2VuZFJhd0VtYWlsJ10sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIElBTSBVc2VyIHRvIHNlbmQgZW1haWwgdmlhIEFtYXpvbiBTRVMgKi9cclxuICAgIGNvbnN0IHVzZXIgPSBuZXcgaWFtLlVzZXIodGhpcywgJ1VzZXInKTtcclxuICAgIHVzZXIuYXR0YWNoSW5saW5lUG9saWN5KHNlbmRFbWFpbFBvbGljeSk7XHJcblxyXG4gICAgLyoqIFNNVFAgdXNlcm5hbWUgKi9cclxuICAgIGNvbnN0IGFjY2Vzc0tleSA9IG5ldyBpYW0uQ2ZuQWNjZXNzS2V5KHRoaXMsICdBY2Nlc3NLZXknLCB7IHVzZXJOYW1lOiB1c2VyLnVzZXJOYW1lIH0pO1xyXG5cclxuICAgIC8qKiBDdXN0b20gcmVzb3VyY2UgaGFuZGxlciB0byBnZW5lcmF0ZSBhIFNNVFAgcGFzc3dvcmQgKi9cclxuICAgIGNvbnN0IHBhc3N3b3JkRnVuY3Rpb24gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1Bhc3N3b3JkRnVuY3Rpb24nLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3VwYWJhc2UgLSBHZW5lcmF0ZSBTTVRQIFBhc3N3b3JkIEZ1bmN0aW9uJyxcclxuICAgICAgZW50cnk6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjci1zbXRwLXBhc3N3b3JkLnRzJyksXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIEN1c3RvbSByZXNvdXJjZSBwcm92aWRlciB0byBnZW5lcmF0ZSBhIFNNVFAgcGFzc3dvcmQgKi9cclxuICAgIGNvbnN0IHBhc3N3b3JkUHJvdmlkZXIgPSBuZXcgY3IuUHJvdmlkZXIodGhpcywgJ1Bhc3N3b3JkUHJvdmlkZXInLCB7IG9uRXZlbnRIYW5kbGVyOiBwYXNzd29yZEZ1bmN0aW9uIH0pO1xyXG5cclxuICAgIC8qKiBTTVRQIHBhc3N3b3JkICovXHJcbiAgICBjb25zdCBwYXNzd29yZCA9IG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgJ1Bhc3N3b3JkJywge1xyXG4gICAgICByZXNvdXJjZVR5cGU6ICdDdXN0b206OlBhc3N3b3JkJyxcclxuICAgICAgc2VydmljZVRva2VuOiBwYXNzd29yZFByb3ZpZGVyLnNlcnZpY2VUb2tlbixcclxuICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgIFJlZ2lvbjogcmVnaW9uLFxyXG4gICAgICAgIFNlY3JldEFjY2Vzc0tleTogYWNjZXNzS2V5LmF0dHJTZWNyZXRBY2Nlc3NLZXksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzdGFja0lkID0gY2RrLkZuLnNlbGVjdCgyLCBjZGsuRm4uc3BsaXQoJy8nLCBjZGsuQXdzLlNUQUNLX0lEKSk7XHJcblxyXG4gICAgLyoqIEFtYXpvbiBXb3JrTWFpbCBTdGFjayAqL1xyXG4gICAgY29uc3Qgd29ya01haWwgPSBuZXcgV29ya01haWxTdGFjayh0aGlzLCAnV29ya01haWwnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQW1hem9uIFdvcmtNYWlsIGZvciBUZXN0IERvbWFpbicsXHJcbiAgICAgIG9yZ2FuaXphdGlvbjogeyByZWdpb246IHJlZ2lvbiwgYWxpYXM6IHN0YWNrSWQgfSxcclxuICAgIH0pO1xyXG4gICAgLy8gQWRkIGNvbmRpdGlvblxyXG4gICAgKHdvcmtNYWlsLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNkay5DZm5TdGFjaykuY2ZuT3B0aW9ucy5jb25kaXRpb24gPSB3b3JrTWFpbEVuYWJsZWQ7XHJcblxyXG4gICAgLyoqIFRoZSBtYWlsIHVzZXIgb24gV29ya01haWwgKi9cclxuICAgIGNvbnN0IHdvcmtNYWlsVXNlciA9IHdvcmtNYWlsLm9yZ2FuaXphdGlvbi5hZGRVc2VyKCdTdXBhYmFzZScsIHBhc3N3b3JkLmdldEF0dFN0cmluZygnUGFzc3dvcmQnKSk7XHJcblxyXG4gICAgdGhpcy5ob3N0ID0gY2RrLkZuLmNvbmRpdGlvbklmKHdvcmtNYWlsRW5hYmxlZC5sb2dpY2FsSWQsIGBzbXRwLm1haWwuJHtyZWdpb259LmF3c2FwcHMuY29tYCwgYGVtYWlsLXNtdHAuJHtyZWdpb259LmFtYXpvbmF3cy5jb21gKS50b1N0cmluZygpO1xyXG4gICAgdGhpcy5wb3J0ID0gNDY1O1xyXG4gICAgdGhpcy5lbWFpbCA9IGNkay5Gbi5jb25kaXRpb25JZih3b3JrTWFpbEVuYWJsZWQubG9naWNhbElkLCB3b3JrTWFpbFVzZXIuZ2V0QXR0KCdFbWFpbCcpLCBlbWFpbCkudG9TdHJpbmcoKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFNNVFAgdXNlcm5hbWVcclxuICAgICAqXHJcbiAgICAgKiBJZiBXb3JrTWFpbCBpcyBlbmFibGVkLCB1c2UgdGhlIFdvcmtNYWlsIHVzZXIncyBlbWFpbCBhZGRyZXNzLlxyXG4gICAgICovXHJcbiAgICBjb25zdCB1c2VybmFtZSA9IGNkay5Gbi5jb25kaXRpb25JZih3b3JrTWFpbEVuYWJsZWQubG9naWNhbElkLCB3b3JrTWFpbFVzZXIuZ2V0QXR0KCdFbWFpbCcpLCBhY2Nlc3NLZXkucmVmKS50b1N0cmluZygpO1xyXG5cclxuICAgIHRoaXMuc2VjcmV0ID0gbmV3IFNlY3JldCh0aGlzLCAnU2VjcmV0Jywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgJHtjZGsuQXdzLlNUQUNLX05BTUV9JHtpZH1TZWNyZXRgLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N1cGFiYXNlIC0gU01UUCBTZWNyZXQnLFxyXG4gICAgICBzZWNyZXRPYmplY3RWYWx1ZToge1xyXG4gICAgICAgIHVzZXJuYW1lOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KHVzZXJuYW1lKSxcclxuICAgICAgICBwYXNzd29yZDogY2RrLlNlY3JldFZhbHVlLnJlc291cmNlQXR0cmlidXRlKHBhc3N3b3JkLmdldEF0dFN0cmluZygnUGFzc3dvcmQnKSksXHJcbiAgICAgICAgaG9zdDogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dCh0aGlzLmhvc3QpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gIH1cclxufVxyXG4iXX0=