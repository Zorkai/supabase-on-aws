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
exports.AuthProvider = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const aws_ssm_1 = require("aws-cdk-lib/aws-ssm");
const constructs_1 = require("constructs");
class AuthProvider extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        this.name = new cdk.CfnParameter(this, 'Name', {
            description: 'External Auth Provider Name',
            type: 'String',
            default: '',
            allowedValues: ['', 'APPLE', 'AZURE', 'BITBUCKET', 'DISCORD', 'FACEBOOK', 'GITHUB', 'GITLAB', 'GOOGLE', 'KEYCLOAK', 'LINKEDIN', 'NOTION', 'SPOTIFY', 'SLACK', 'TWITCH', 'TWITTER', 'WORKOS'],
        });
        this.clientId = new cdk.CfnParameter(this, 'ClientId', {
            description: 'The OAuth2 Client ID registered with the external provider.',
            type: 'String',
            default: '',
        });
        this.secret = new cdk.CfnParameter(this, 'Secret', {
            description: 'The OAuth2 Client Secret provided by the external provider when you registered.',
            type: 'String',
            default: '',
            noEcho: true,
        });
        const enabled = new cdk.CfnCondition(this, 'Enabled', { expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.name, '')) });
        this.enabled = cdk.Fn.conditionIf(enabled.logicalId, 'true', 'false').toString();
        // If provider name is not specified, dummy provider name is configured such as PROVIDER1.
        const dummyProviderName = id.toUpperCase();
        this.id = cdk.Fn.conditionIf(enabled.logicalId, this.name, dummyProviderName).toString();
        const parameterPrefix = `/${cdk.Aws.STACK_NAME}/${scope.node.id}/External/`;
        this.clientIdParameter = new aws_ssm_1.StringParameter(this, 'ClientIdParameter', {
            description: 'The OAuth2 Client ID registered with the external provider.',
            simpleName: false,
            parameterName: parameterPrefix + cdk.Fn.conditionIf(enabled.logicalId, this.name.valueAsString, id).toString() + '/ClientId',
            stringValue: cdk.Fn.conditionIf(enabled.logicalId, this.clientId.valueAsString, 'null').toString(),
        });
        this.secretParameter = new aws_ssm_1.StringParameter(this, 'SecretParameter', {
            description: 'The OAuth2 Client Secret provided by the external provider when you registered.',
            simpleName: false,
            parameterName: parameterPrefix + cdk.Fn.conditionIf(enabled.logicalId, this.name.valueAsString, id).toString() + '/Secret',
            stringValue: cdk.Fn.conditionIf(enabled.logicalId, this.secret.valueAsString, 'null').toString(),
        });
        new cdk.CfnRule(this, 'CheckClientId', {
            ruleCondition: enabled.expression,
            assertions: [{
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.clientId, '')),
                    assertDescription: `${id} Client Id is must not null, if ${id} is enabled as external auth provider.`,
                }],
        });
        new cdk.CfnRule(this, 'CheckSecret', {
            ruleCondition: enabled.expression,
            assertions: [{
                    assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.secret, '')),
                    assertDescription: `${id} Client Secret is must not null, if ${id} is enabled as external auth provider.`,
                }],
        });
    }
}
exports.AuthProvider = AuthProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwYWJhc2UtYXV0aC1wcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9zdXBhYmFzZS1hdXRoLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLGlEQUFzRDtBQUN0RCwyQ0FBdUM7QUFFdkMsTUFBYSxZQUFhLFNBQVEsc0JBQVM7SUFTekMsWUFBWSxLQUFnQixFQUFFLEVBQVU7UUFDdEMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQzdDLFdBQVcsRUFBRSw2QkFBNkI7WUFDMUMsSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsRUFBRTtZQUNYLGFBQWEsRUFBRSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUM7U0FDN0wsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUNyRCxXQUFXLEVBQUUsNkRBQTZEO1lBQzFFLElBQUksRUFBRSxRQUFRO1lBQ2QsT0FBTyxFQUFFLEVBQUU7U0FDWixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ2pELFdBQVcsRUFBRSxpRkFBaUY7WUFDOUYsSUFBSSxFQUFFLFFBQVE7WUFD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O29CQUNYLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNwRSxpQkFBaUIsRUFBRSxHQUFHLEVBQUUsdUNBQXVDLEVBQUUsd0NBQXdDO2lCQUMxRyxDQUFDO1NBQ0gsQ0FBQyxDQUFDO0lBRUwsQ0FBQztDQUNGO0FBeEVELG9DQXdFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IFN0cmluZ1BhcmFtZXRlciB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBdXRoUHJvdmlkZXIgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHJlYWRvbmx5IGlkOiBzdHJpbmc7XHJcbiAgcmVhZG9ubHkgbmFtZTogY2RrLkNmblBhcmFtZXRlcjtcclxuICByZWFkb25seSBjbGllbnRJZDogY2RrLkNmblBhcmFtZXRlcjtcclxuICByZWFkb25seSBzZWNyZXQ6IGNkay5DZm5QYXJhbWV0ZXI7XHJcbiAgcmVhZG9ubHkgY2xpZW50SWRQYXJhbWV0ZXI6IFN0cmluZ1BhcmFtZXRlcjtcclxuICByZWFkb25seSBzZWNyZXRQYXJhbWV0ZXI6IFN0cmluZ1BhcmFtZXRlcjtcclxuICByZWFkb25seSBlbmFibGVkOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgdGhpcy5uYW1lID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ05hbWUnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRXh0ZXJuYWwgQXV0aCBQcm92aWRlciBOYW1lJyxcclxuICAgICAgdHlwZTogJ1N0cmluZycsXHJcbiAgICAgIGRlZmF1bHQ6ICcnLFxyXG4gICAgICBhbGxvd2VkVmFsdWVzOiBbJycsICdBUFBMRScsICdBWlVSRScsICdCSVRCVUNLRVQnLCAnRElTQ09SRCcsICdGQUNFQk9PSycsICdHSVRIVUInLCAnR0lUTEFCJywgJ0dPT0dMRScsICdLRVlDTE9BSycsICdMSU5LRURJTicsICdOT1RJT04nLCAnU1BPVElGWScsICdTTEFDSycsICdUV0lUQ0gnLCAnVFdJVFRFUicsICdXT1JLT1MnXSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuY2xpZW50SWQgPSBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnQ2xpZW50SWQnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIE9BdXRoMiBDbGllbnQgSUQgcmVnaXN0ZXJlZCB3aXRoIHRoZSBleHRlcm5hbCBwcm92aWRlci4nLFxyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVmYXVsdDogJycsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnNlY3JldCA9IG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdTZWNyZXQnLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIE9BdXRoMiBDbGllbnQgU2VjcmV0IHByb3ZpZGVkIGJ5IHRoZSBleHRlcm5hbCBwcm92aWRlciB3aGVuIHlvdSByZWdpc3RlcmVkLicsXHJcbiAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICBkZWZhdWx0OiAnJyxcclxuICAgICAgbm9FY2hvOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZW5hYmxlZCA9IG5ldyBjZGsuQ2ZuQ29uZGl0aW9uKHRoaXMsICdFbmFibGVkJywgeyBleHByZXNzaW9uOiBjZGsuRm4uY29uZGl0aW9uTm90KGNkay5Gbi5jb25kaXRpb25FcXVhbHModGhpcy5uYW1lLCAnJykpIH0pO1xyXG4gICAgdGhpcy5lbmFibGVkID0gY2RrLkZuLmNvbmRpdGlvbklmKGVuYWJsZWQubG9naWNhbElkLCAndHJ1ZScsICdmYWxzZScpLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgLy8gSWYgcHJvdmlkZXIgbmFtZSBpcyBub3Qgc3BlY2lmaWVkLCBkdW1teSBwcm92aWRlciBuYW1lIGlzIGNvbmZpZ3VyZWQgc3VjaCBhcyBQUk9WSURFUjEuXHJcbiAgICBjb25zdCBkdW1teVByb3ZpZGVyTmFtZSA9IGlkLnRvVXBwZXJDYXNlKCk7XHJcbiAgICB0aGlzLmlkID0gY2RrLkZuLmNvbmRpdGlvbklmKGVuYWJsZWQubG9naWNhbElkLCB0aGlzLm5hbWUsIGR1bW15UHJvdmlkZXJOYW1lKS50b1N0cmluZygpO1xyXG5cclxuICAgIGNvbnN0IHBhcmFtZXRlclByZWZpeCA9IGAvJHtjZGsuQXdzLlNUQUNLX05BTUV9LyR7c2NvcGUubm9kZS5pZH0vRXh0ZXJuYWwvYDtcclxuXHJcbiAgICB0aGlzLmNsaWVudElkUGFyYW1ldGVyID0gbmV3IFN0cmluZ1BhcmFtZXRlcih0aGlzLCAnQ2xpZW50SWRQYXJhbWV0ZXInLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIE9BdXRoMiBDbGllbnQgSUQgcmVnaXN0ZXJlZCB3aXRoIHRoZSBleHRlcm5hbCBwcm92aWRlci4nLFxyXG4gICAgICBzaW1wbGVOYW1lOiBmYWxzZSxcclxuICAgICAgcGFyYW1ldGVyTmFtZTogcGFyYW1ldGVyUHJlZml4ICsgY2RrLkZuLmNvbmRpdGlvbklmKGVuYWJsZWQubG9naWNhbElkLCB0aGlzLm5hbWUudmFsdWVBc1N0cmluZywgaWQpLnRvU3RyaW5nKCkgKyAnL0NsaWVudElkJyxcclxuICAgICAgc3RyaW5nVmFsdWU6IGNkay5Gbi5jb25kaXRpb25JZihlbmFibGVkLmxvZ2ljYWxJZCwgdGhpcy5jbGllbnRJZC52YWx1ZUFzU3RyaW5nLCAnbnVsbCcpLnRvU3RyaW5nKCksXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnNlY3JldFBhcmFtZXRlciA9IG5ldyBTdHJpbmdQYXJhbWV0ZXIodGhpcywgJ1NlY3JldFBhcmFtZXRlcicsIHtcclxuICAgICAgZGVzY3JpcHRpb246ICdUaGUgT0F1dGgyIENsaWVudCBTZWNyZXQgcHJvdmlkZWQgYnkgdGhlIGV4dGVybmFsIHByb3ZpZGVyIHdoZW4geW91IHJlZ2lzdGVyZWQuJyxcclxuICAgICAgc2ltcGxlTmFtZTogZmFsc2UsXHJcbiAgICAgIHBhcmFtZXRlck5hbWU6IHBhcmFtZXRlclByZWZpeCArIGNkay5Gbi5jb25kaXRpb25JZihlbmFibGVkLmxvZ2ljYWxJZCwgdGhpcy5uYW1lLnZhbHVlQXNTdHJpbmcsIGlkKS50b1N0cmluZygpICsgJy9TZWNyZXQnLFxyXG4gICAgICBzdHJpbmdWYWx1ZTogY2RrLkZuLmNvbmRpdGlvbklmKGVuYWJsZWQubG9naWNhbElkLCB0aGlzLnNlY3JldC52YWx1ZUFzU3RyaW5nLCAnbnVsbCcpLnRvU3RyaW5nKCksXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmblJ1bGUodGhpcywgJ0NoZWNrQ2xpZW50SWQnLCB7XHJcbiAgICAgIHJ1bGVDb25kaXRpb246IGVuYWJsZWQuZXhwcmVzc2lvbixcclxuICAgICAgYXNzZXJ0aW9uczogW3tcclxuICAgICAgICBhc3NlcnQ6IGNkay5Gbi5jb25kaXRpb25Ob3QoY2RrLkZuLmNvbmRpdGlvbkVxdWFscyh0aGlzLmNsaWVudElkLCAnJykpLFxyXG4gICAgICAgIGFzc2VydERlc2NyaXB0aW9uOiBgJHtpZH0gQ2xpZW50IElkIGlzIG11c3Qgbm90IG51bGwsIGlmICR7aWR9IGlzIGVuYWJsZWQgYXMgZXh0ZXJuYWwgYXV0aCBwcm92aWRlci5gLFxyXG4gICAgICB9XSxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuUnVsZSh0aGlzLCAnQ2hlY2tTZWNyZXQnLCB7XHJcbiAgICAgIHJ1bGVDb25kaXRpb246IGVuYWJsZWQuZXhwcmVzc2lvbixcclxuICAgICAgYXNzZXJ0aW9uczogW3tcclxuICAgICAgICBhc3NlcnQ6IGNkay5Gbi5jb25kaXRpb25Ob3QoY2RrLkZuLmNvbmRpdGlvbkVxdWFscyh0aGlzLnNlY3JldCwgJycpKSxcclxuICAgICAgICBhc3NlcnREZXNjcmlwdGlvbjogYCR7aWR9IENsaWVudCBTZWNyZXQgaXMgbXVzdCBub3QgbnVsbCwgaWYgJHtpZH0gaXMgZW5hYmxlZCBhcyBleHRlcm5hbCBhdXRoIHByb3ZpZGVyLmAsXHJcbiAgICAgIH1dLFxyXG4gICAgfSk7XHJcblxyXG4gIH1cclxufVxyXG4iXX0=