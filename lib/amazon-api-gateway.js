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
exports.ApiGateway = void 0;
const apigw = __importStar(require("@aws-cdk/aws-apigatewayv2-alpha"));
const aws_apigatewayv2_integrations_alpha_1 = require("@aws-cdk/aws-apigatewayv2-integrations-alpha");
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
class ApiGateway extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { vpc } = props;
        this.securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', { vpc, allowAllOutbound: false });
        this.vpcLink = new apigw.VpcLink(this, 'VpcLink', { vpc, securityGroups: [this.securityGroup] });
        this.api = new apigw.HttpApi(this, 'HttpApi', {
            apiName: this.node.path.replace(/\//g, '-'),
            corsPreflight: {
                allowOrigins: ['https://*', 'http://*'],
                //allowHeaders: ['Accept-Profile', 'Apikey', 'Authorization', 'X-Client-Info'],
                allowHeaders: ['*'],
                allowMethods: [apigw.CorsHttpMethod.ANY],
                exposeHeaders: ['*'],
                allowCredentials: true,
            },
        });
        new AccessLog(this, 'AccessLog', { apiId: this.api.apiId });
        this.domainName = cdk.Fn.select(2, cdk.Fn.split('/', this.api.apiEndpoint));
    }
    addProxyRoute(path, service) {
        const cloudMapService = service.service.cloudMapService;
        const parameterMapping = new apigw.ParameterMapping();
        parameterMapping.overwritePath(apigw.MappingValue.custom('/${request.path.proxy}'));
        const integration = new aws_apigatewayv2_integrations_alpha_1.HttpServiceDiscoveryIntegration(service.node.id, cloudMapService, {
            vpcLink: this.vpcLink,
            parameterMapping,
        });
        this.api.addRoutes({
            methods: [apigw.HttpMethod.GET, apigw.HttpMethod.POST, apigw.HttpMethod.PUT],
            path: `${path}{proxy+}`,
            integration,
        });
        this.securityGroup.connections.allowToDefaultPort(service);
    }
}
exports.ApiGateway = ApiGateway;
class AccessLog extends logs.LogGroup {
    constructor(scope, id, props) {
        const removalPolicy = cdk.RemovalPolicy.DESTROY;
        const retention = logs.RetentionDays.ONE_MONTH;
        super(scope, id, { removalPolicy, retention });
        const apiId = props.apiId;
        const stageName = props.stageName || '$default';
        const logFormat = props.logFormat || '{ "requestId":"$context.requestId", "ip": "$context.identity.sourceIp", "requestTime":"$context.requestTime", "httpMethod":"$context.httpMethod","routeKey":"$context.routeKey", "status":"$context.status","protocol":"$context.protocol", "responseLength":"$context.responseLength" }';
        const apiArn = `arn:${cdk.Aws.PARTITION}:apigateway:${cdk.Aws.REGION}::/apis/${apiId}`;
        const accessLogSettingsArn = `${apiArn}/stages/${stageName}/accesslogsettings`;
        new cr.AwsCustomResource(this, 'Settings', {
            resourceType: 'Custom::ApiGatewayAccessLogSettings',
            onCreate: {
                service: 'ApiGatewayV2',
                action: 'updateStage',
                parameters: {
                    ApiId: apiId,
                    StageName: stageName,
                    AccessLogSettings: {
                        DestinationArn: this.logGroupArn,
                        Format: logFormat,
                    },
                },
                physicalResourceId: cr.PhysicalResourceId.of(accessLogSettingsArn),
            },
            onUpdate: {
                service: 'ApiGatewayV2',
                action: 'updateStage',
                parameters: {
                    ApiId: apiId,
                    StageName: stageName,
                    AccessLogSettings: {
                        DestinationArn: this.logGroupArn,
                        Format: logFormat,
                    },
                },
                physicalResourceId: cr.PhysicalResourceId.of(accessLogSettingsArn),
            },
            //onDelete: {
            //  service: 'ApiGatewayV2',
            //  action: 'updateStage',
            //  parameters: {
            //    ApiId: apiId,
            //    StageName: stageName,
            //    AccessLogSettings: {},
            //  },
            //  physicalResourceId: cr.PhysicalResourceId.of(accessLogSettingsArn),
            //},
            policy: cr.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                    actions: ['apigateway:UpdateStage'],
                    resources: [apiArn],
                }),
                new iam.PolicyStatement({
                    actions: ['apigateway:PATCH'],
                    resources: [`${apiArn}/stages/*`],
                }),
                new iam.PolicyStatement({
                    actions: [
                        'logs:DescribeLogGroups',
                        'logs:DescribeLogStreams',
                        'logs:GetLogEvents',
                        'logs:FilterLogEvents',
                    ],
                    resources: ['*'],
                }),
                new iam.PolicyStatement({
                    actions: [
                        'logs:CreateLogDelivery',
                        'logs:PutResourcePolicy',
                        'logs:UpdateLogDelivery',
                        'logs:DeleteLogDelivery',
                        'logs:CreateLogGroup',
                        'logs:DescribeResourcePolicies',
                        'logs:GetLogDelivery',
                        'logs:ListLogDeliveries',
                    ],
                    resources: ['*'],
                }),
            ]),
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1hem9uLWFwaS1nYXRld2F5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2FtYXpvbi1hcGktZ2F0ZXdheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHVFQUF5RDtBQUN6RCxzR0FBK0Y7QUFDL0YsaURBQW1DO0FBQ25DLHlEQUEyQztBQUMzQyx5REFBMkM7QUFDM0MsMkRBQTZDO0FBRTdDLGlFQUFtRDtBQUNuRCwyQ0FBdUM7QUFPdkMsTUFBYSxVQUFXLFNBQVEsc0JBQVM7SUFNdkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFdEIsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRSxFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRXBHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVqRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQzVDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztZQUMzQyxhQUFhLEVBQUU7Z0JBQ2IsWUFBWSxFQUFFLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQztnQkFDdkMsK0VBQStFO2dCQUMvRSxZQUFZLEVBQUUsQ0FBQyxHQUFH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c0I7cUJBQ3ZCO29CQUNELFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDakIsQ0FBQztnQkFDRixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7b0JBQ3RCLE9BQU8sRUFBRTt3QkFDUCx3QkFBd0I7d0JBQ3hCLHdCQUF3Qjt3QkFDeEIsd0JBQXdCO3dCQUN4Qix3QkFBd0I7d0JBQ3hCLHFCQUFxQjt3QkFDckIsK0JBQStCO3dCQUMvQixxQkFBcUI7d0JBQ3JCLHdCQUF3QjtxQkFDekI7b0JBQ0QsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUNqQixDQUFDO2FBQ0gsQ0FBQztTQUNILENBQUMsQ0FBQztJQUVMLENBQUM7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGFwaWd3IGZyb20gJ0Bhd3MtY2RrL2F3cy1hcGlnYXRld2F5djItYWxwaGEnO1xyXG5pbXBvcnQgeyBIdHRwU2VydmljZURpc2NvdmVyeUludGVncmF0aW9uIH0gZnJvbSAnQGF3cy1jZGsvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMtYWxwaGEnO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkTWFwIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZXJ2aWNlZGlzY292ZXJ5JztcclxuaW1wb3J0ICogYXMgY3IgZnJvbSAnYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlcyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBCYXNlRmFyZ2F0ZVNlcnZpY2UgfSBmcm9tICcuL2Vjcy1wYXR0ZXJucyc7XHJcblxyXG5pbnRlcmZhY2UgQXBpR2F0ZXdheVByb3BzIHtcclxuICB2cGM6IGVjMi5JVnBjO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQXBpR2F0ZXdheSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgc2VjdXJpdHlHcm91cDogZWMyLlNlY3VyaXR5R3JvdXA7XHJcbiAgdnBjTGluazogYXBpZ3cuVnBjTGluaztcclxuICBhcGk6IGFwaWd3Lkh0dHBBcGk7XHJcbiAgZG9tYWluTmFtZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXBpR2F0ZXdheVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IHsgdnBjIH0gPSBwcm9wcztcclxuXHJcbiAgICB0aGlzLnNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ1NlY3VyaXR5R3JvdXAnLCB7IHZwYywgYWxsb3dBbGxPdXRib3VuZDogZmFsc2UgfSk7XHJcblxyXG4gICAgdGhpcy52cGNMaW5rID0gbmV3IGFwaWd3LlZwY0xpbmsodGhpcywgJ1ZwY0xpbmsnLCB7IHZwYywgc2VjdXJpdHlHcm91cHM6IFt0aGlzLnNlY3VyaXR5R3JvdXBdIH0pO1xyXG5cclxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWd3Lkh0dHBBcGkodGhpcywgJ0h0dHBBcGknLCB7XHJcbiAgICAgIGFwaU5hbWU6IHRoaXMubm9kZS5wYXRoLnJlcGxhY2UoL1xcLy9nLCAnLScpLFxyXG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJ2h0dHBzOi8vKicsICdodHRwOi8vKiddLFxyXG4gICAgICAgIC8vYWxsb3dIZWFkZXJzOiBbJ0FjY2VwdC1Qcm9maWxlJywgJ0FwaWtleScsICdBdXRob3JpemF0aW9uJywgJ1gtQ2xpZW50LUluZm8nXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnKiddLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogW2FwaWd3LkNvcnNIdHRwTWV0aG9kLkFOWV0sXHJcbiAgICAgICAgZXhwb3NlSGVhZGVyczogWycqJ10sXHJcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBBY2Nlc3NMb2codGhpcywgJ0FjY2Vzc0xvZycsIHsgYXBpSWQ6IHRoaXMuYXBpLmFwaUlkIH0pO1xyXG5cclxuICAgIHRoaXMuZG9tYWluTmFtZSA9IGNkay5Gbi5zZWxlY3QoMiwgY2RrLkZuLnNwbGl0KCcvJywgdGhpcy5hcGkuYXBpRW5kcG9pbnQpKTtcclxuICB9XHJcblxyXG4gIGFkZFByb3h5Um91dGUocGF0aDogc3RyaW5nLCBzZXJ2aWNlOiBCYXNlRmFyZ2F0ZVNlcnZpY2UpIHtcclxuICAgIGNvbnN0IGNsb3VkTWFwU2VydmljZSA9IHNlcnZpY2Uuc2VydmljZS5jbG91ZE1hcFNlcnZpY2UhO1xyXG4gICAgY29uc3QgcGFyYW1ldGVyTWFwcGluZyA9IG5ldyBhcGlndy5QYXJhbWV0ZXJNYXBwaW5nKCk7XHJcbiAgICBwYXJhbWV0ZXJNYXBwaW5nLm92ZXJ3cml0ZVBhdGgoYXBpZ3cuTWFwcGluZ1ZhbHVlLmN1c3RvbSgnLyR7cmVxdWVzdC5wYXRoLnByb3h5fScpKTtcclxuICAgIGNvbnN0IGludGVncmF0aW9uID0gbmV3IEh0dHBTZXJ2aWNlRGlzY292ZXJ5SW50ZWdyYXRpb24oc2VydmljZS5ub2RlLmlkLCBjbG91ZE1hcFNlcnZpY2UsIHtcclxuICAgICAgdnBjTGluazogdGhpcy52cGNMaW5rLFxyXG4gICAgICBwYXJhbWV0ZXJNYXBwaW5nLFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBtZXRob2RzOiBbYXBpZ3cuSHR0cE1ldGhvZC5HRVQsIGFwaWd3Lkh0dHBNZXRob2QuUE9TVCwgYXBpZ3cuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBwYXRoOiBgJHtwYXRofXtwcm94eSt9YCxcclxuICAgICAgaW50ZWdyYXRpb24sXHJcbiAgICB9KTtcclxuICAgIHRoaXMuc2VjdXJpdHlHcm91cC5jb25uZWN0aW9ucy5hbGxvd1RvRGVmYXVsdFBvcnQoc2VydmljZSk7XHJcbiAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgQWNjZXNzTG9nUHJvcHMge1xyXG4gIGFwaUlkOiBzdHJpbmc7XHJcbiAgc3RhZ2VOYW1lPzogc3RyaW5nO1xyXG4gIGxvZ0Zvcm1hdD86IHN0cmluZztcclxufVxyXG5cclxuY2xhc3MgQWNjZXNzTG9nIGV4dGVuZHMgbG9ncy5Mb2dHcm91cCB7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBBY2Nlc3NMb2dQcm9wcykge1xyXG4gICAgY29uc3QgcmVtb3ZhbFBvbGljeSA9IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1k7XHJcbiAgICBjb25zdCByZXRlbnRpb24gPSBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRIO1xyXG5cclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgeyByZW1vdmFsUG9saWN5LCByZXRlbnRpb24gfSk7XHJcblxyXG4gICAgY29uc3QgYXBpSWQgPSBwcm9wcy5hcGlJZDtcclxuICAgIGNvbnN0IHN0YWdlTmFtZSA9IHByb3BzLnN0YWdlTmFtZSB8fCAnJGRlZmF1bHQnO1xyXG4gICAgY29uc3QgbG9nRm9ybWF0ID0gcHJvcHMubG9nRm9ybWF0IHx8ICd7IFwicmVxdWVzdElkXCI6XCIkY29udGV4dC5yZXF1ZXN0SWRcIiwgXCJpcFwiOiBcIiRjb250ZXh0LmlkZW50aXR5LnNvdXJjZUlwXCIsIFwicmVxdWVzdFRpbWVcIjpcIiRjb250ZXh0LnJlcXVlc3RUaW1lXCIsIFwiaHR0cE1ldGhvZFwiOlwiJGNvbnRleHQuaHR0cE1ldGhvZFwiLFwicm91dGVLZXlcIjpcIiRjb250ZXh0LnJvdXRlS2V5XCIsIFwic3RhdHVzXCI6XCIkY29udGV4dC5zdGF0dXNcIixcInByb3RvY29sXCI6XCIkY29udGV4dC5wcm90b2NvbFwiLCBcInJlc3BvbnNlTGVuZ3RoXCI6XCIkY29udGV4dC5yZXNwb25zZUxlbmd0aFwiIH0nO1xyXG5cclxuICAgIGNvbnN0IGFwaUFybiA9IGBhcm46JHtjZGsuQXdzLlBBUlRJVElPTn06YXBpZ2F0ZXdheToke2Nkay5Bd3MuUkVHSU9OfTo6L2FwaXMvJHthcGlJZH1gO1xyXG4gICAgY29uc3QgYWNjZXNzTG9nU2V0dGluZ3NBcm4gPSBgJHthcGlBcm59L3N0YWdlcy8ke3N0YWdlTmFtZX0vYWNjZXNzbG9nc2V0dGluZ3NgO1xyXG5cclxuICAgIG5ldyBjci5Bd3NDdXN0b21SZXNvdXJjZSh0aGlzLCAnU2V0dGluZ3MnLCB7XHJcbiAgICAgIHJlc291cmNlVHlwZTogJ0N1c3RvbTo6QXBpR2F0ZXdheUFjY2Vzc0xvZ1NldHRpbmdzJyxcclxuICAgICAgb25DcmVhdGU6IHtcclxuICAgICAgICBzZXJ2aWNlOiAnQXBpR2F0ZXdheVYyJyxcclxuICAgICAgICBhY3Rpb246ICd1cGRhdGVTdGFnZScsXHJcbiAgICAgICAgcGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgQXBpSWQ6IGFwaUlkLFxyXG4gICAgICAgICAgU3RhZ2VOYW1lOiBzdGFnZU5hbWUsXHJcbiAgICAgICAgICBBY2Nlc3NMb2dTZXR0aW5nczoge1xyXG4gICAgICAgICAgICBEZXN0aW5hdGlvbkFybjogdGhpcy5sb2dHcm91cEFybixcclxuICAgICAgICAgICAgRm9ybWF0OiBsb2dGb3JtYXQsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcGh5c2ljYWxSZXNvdXJjZUlkOiBjci5QaHlzaWNhbFJlc291cmNlSWQub2YoYWNjZXNzTG9nU2V0dGluZ3NBcm4pLFxyXG4gICAgICB9LFxyXG4gICAgICBvblVwZGF0ZToge1xyXG4gICAgICAgIHNlcnZpY2U6ICdBcGlHYXRld2F5VjInLFxyXG4gICAgICAgIGFjdGlvbjogJ3VwZGF0ZVN0YWdlJyxcclxuICAgICAgICBwYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICBBcGlJZDogYXBpSWQsXHJcbiAgICAgICAgICBTdGFnZU5hbWU6IHN0YWdlTmFtZSxcclxuICAgICAgICAgIEFjY2Vzc0xvZ1NldHRpbmdzOiB7XHJcbiAgICAgICAgICAgIERlc3RpbmF0aW9uQXJuOiB0aGlzLmxvZ0dyb3VwQXJuLFxyXG4gICAgICAgICAgICBGb3JtYXQ6IGxvZ0Zvcm1hdCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwaHlzaWNhbFJlc291cmNlSWQ6IGNyLlBoeXNpY2FsUmVzb3VyY2VJZC5vZihhY2Nlc3NMb2dTZXR0aW5nc0FybiksXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vb25EZWxldGU6IHtcclxuICAgICAgLy8gIHNlcnZpY2U6ICdBcGlHYXRld2F5VjInLFxyXG4gICAgICAvLyAgYWN0aW9uOiAndXBkYXRlU3RhZ2UnLFxyXG4gICAgICAvLyAgcGFyYW1ldGVyczoge1xyXG4gICAgICAvLyAgICBBcGlJZDogYXBpSWQsXHJcbiAgICAgIC8vICAgIFN0YWdlTmFtZTogc3RhZ2VOYW1lLFxyXG4gICAgICAvLyAgICBBY2Nlc3NMb2dTZXR0aW5nczoge30sXHJcbiAgICAgIC8vICB9LFxyXG4gICAgICAvLyAgcGh5c2ljYWxSZXNvdXJjZUlkOiBjci5QaHlzaWNhbFJlc291cmNlSWQub2YoYWNjZXNzTG9nU2V0dGluZ3NBcm4pLFxyXG4gICAgICAvL30sXHJcbiAgICAgIHBvbGljeTogY3IuQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3kuZnJvbVN0YXRlbWVudHMoW1xyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIGFjdGlvbnM6IFsnYXBpZ2F0ZXdheTpVcGRhdGVTdGFnZSddLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbYXBpQXJuXSxcclxuICAgICAgICB9KSxcclxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICBhY3Rpb25zOiBbJ2FwaWdhdGV3YXk6UEFUQ0gnXSxcclxuICAgICAgICAgIHJlc291cmNlczogW2Ake2FwaUFybn0vc3RhZ2VzLypgXSxcclxuICAgICAgICB9KSxcclxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcclxuICAgICAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJyxcclxuICAgICAgICAgICAgJ2xvZ3M6R2V0TG9nRXZlbnRzJyxcclxuICAgICAgICAgICAgJ2xvZ3M6RmlsdGVyTG9nRXZlbnRzJyxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nRGVsaXZlcnknLFxyXG4gICAgICAgICAgICAnbG9nczpQdXRSZXNvdXJjZVBvbGljeScsXHJcbiAgICAgICAgICAgICdsb2dzOlVwZGF0ZUxvZ0RlbGl2ZXJ5JyxcclxuICAgICAgICAgICAgJ2xvZ3M6RGVsZXRlTG9nRGVsaXZlcnknLFxyXG4gICAgICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgICAgICdsb2dzOkRlc2NyaWJlUmVzb3VyY2VQb2xpY2llcycsXHJcbiAgICAgICAgICAgICdsb2dzOkdldExvZ0RlbGl2ZXJ5JyxcclxuICAgICAgICAgICAgJ2xvZ3M6TGlzdExvZ0RlbGl2ZXJpZXMnLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIF0pLFxyXG4gICAgfSk7XHJcblxyXG4gIH1cclxufVxyXG4iXX0=