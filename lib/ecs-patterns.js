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
exports.AutoScalingFargateService = exports.BaseFargateService = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const elb = __importStar(require("aws-cdk-lib/aws-elasticloadbalancingv2"));
//import * as iam from 'aws-cdk-lib/aws-iam';
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudMap = __importStar(require("aws-cdk-lib/aws-servicediscovery"));
const constructs_1 = require("constructs");
const supabase_auth_provider_1 = require("./supabase-auth-provider");
class BaseFargateService extends constructs_1.Construct {
    constructor(scope, id, props) {
        var _a, _b;
        super(scope, id);
        const serviceName = props.serviceName || id.toLowerCase();
        const { cluster, taskImageOptions } = props;
        const containerPort = taskImageOptions.containerPort;
        const cpuArchitecture = (props.cpuArchitecture == 'X86_64') ? ecs.CpuArchitecture.X86_64 : ecs.CpuArchitecture.ARM64;
        const enableServiceConnect = (typeof props.enableServiceConnect == 'undefined') ? false : props.enableServiceConnect;
        const enableCloudMap = (typeof props.enableCloudMap == 'undefined') ? true : props.enableCloudMap;
        const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
            runtimePlatform: {
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                cpuArchitecture,
            },
        });
        const logGroup = new logs.LogGroup(this, 'Logs', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.ONE_MONTH,
        });
        /** awslogs log driver */
        const logDriver = new ecs.AwsLogDriver({ logGroup, streamPrefix: 'ecs' });
        /** The name of default container */
        const containerName = (_a = taskImageOptions.containerName) !== null && _a !== void 0 ? _a : 'app';
        /** Default container */
        const appContainer = taskDefinition.addContainer(containerName, {
            image: taskImageOptions.image,
            logging: logDriver,
            environment: taskImageOptions.environment,
            secrets: taskImageOptions.secrets,
            dockerLabels: taskImageOptions.dockerLabels,
            healthCheck: taskImageOptions.healthCheck,
            entryPoint: taskImageOptions.entryPoint,
            command: taskImageOptions.command,
        });
        appContainer.addUlimits({ name: ecs.UlimitName.NOFILE, softLimit: 65536, hardLimit: 65536 });
        appContainer.addPortMappings({ name: 'http', containerPort: taskImageOptions.containerPort });
        this.service = new ecs.FargateService(this, 'Service', {
            cluster,
            taskDefinition,
            circuitBreaker: { rollback: true },
            enableECSManagedTags: true,
            propagateTags: ecs.PropagatedTagSource.SERVICE,
        });
        if (enableServiceConnect) {
            this.service.enableServiceConnect({
                services: [{
                        portMappingName: 'http',
                        discoveryName: serviceName,
                    }],
                logDriver,
            });
        }
        if (enableCloudMap) {
            const cloudMapService = this.service.enableCloudMap({
                cloudMapNamespace: cluster.defaultCloudMapNamespace,
                name: serviceName,
                container: appContainer,
                dnsRecordType: cloudMap.DnsRecordType.SRV,
                dnsTtl: cdk.Duration.seconds(10),
            });
            cloudMapService.node.defaultChild.addPropertyOverride('DnsConfig.DnsRecords.1', { Type: 'A', TTL: 10 });
        }
        this.connections = new ec2.Connections({
            defaultPort: ec2.Port.tcp(containerPort),
            securityGroups: this.service.connections.securityGroups,
        });
        this.endpoint = `http://${serviceName}.${(_b = cluster.defaultCloudMapNamespace) === null || _b === void 0 ? void 0 : _b.namespaceName}:${containerPort}`;
    }
    /** Create a Target Group and link it to the ECS Service. */
    addTargetGroup(props) {
        const targetGroup = new elb.ApplicationTargetGroup(this, 'TargetGroup', {
            protocol: elb.ApplicationProtocol.HTTP,
            port: Number(this.connections.defaultPort),
            targets: [this.service.loadBalancerTarget({ containerName: 'app' })],
            deregistrationDelay: cdk.Duration.seconds(30),
            healthCheck: props === null || props === void 0 ? void 0 : props.healthCheck,
            vpc: this.service.cluster.vpc,
        });
        return targetGroup;
    }
    addExternalAuthProviders(redirectUri, providerCount) {
        const providers = [];
        for (let i = 0; i < providerCount; i++) {
            const authProvider = new supabase_auth_provider_1.AuthProvider(this, `Provider${i + 1}`);
            const container = this.service.taskDefinition.defaultContainer;
            // Set environment variables
            container.addEnvironment(`GOTRUE_EXTERNAL_${authProvider.id}_ENABLED`, authProvider.enabled);
            container.addEnvironment(`GOTRUE_EXTERNAL_${authProvider.id}_REDIRECT_URI`, redirectUri);
            container.addSecret(`GOTRUE_EXTERNAL_${authProvider.id}_CLIENT_ID`, ecs.Secret.fromSsmParameter(authProvider.clientIdParameter));
            container.addSecret(`GOTRUE_EXTERNAL_${authProvider.id}_SECRET`, ecs.Secret.fromSsmParameter(authProvider.secretParameter));
            providers.push(authProvider);
        }
        return providers;
    }
}
exports.BaseFargateService = BaseFargateService;
class AutoScalingFargateService extends BaseFargateService {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { minTaskCount, maxTaskCount, highAvailability } = props;
        this.taskSize = new cdk.CfnParameter(this, 'TaskSize', {
            description: 'Fargare task size',
            type: 'String',
            default: 'medium',
            allowedValues: ['none', 'micro', 'small', 'medium', 'large', 'xlarge', '2xlarge', '4xlarge'],
        });
        /** CFn task definition to override */
        const taskDef = this.service.taskDefinition.node.defaultChild;
        const cpu = scope.taskSizeMapping.findInMap(this.taskSize.valueAsString, 'cpu');
        const memory = scope.taskSizeMapping.findInMap(this.taskSize.valueAsString, 'memory');
        taskDef.addPropertyOverride('Cpu', cpu);
        taskDef.addPropertyOverride('Memory', memory);
        const autoScaling = this.service.autoScaleTaskCount({
            minCapacity: minTaskCount !== null && minTaskCount !== void 0 ? minTaskCount : 2,
            maxCapacity: maxTaskCount !== null && maxTaskCount !== void 0 ? maxTaskCount : 20,
        });
        autoScaling.scaleOnCpuUtilization('ScaleOnCpu', {
            targetUtilizationPercent: 50,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60),
        });
        /** CFn condition for ECS service */
        const serviceEnabled = new cdk.CfnCondition(this, 'ServiceEnabled', { expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(this.taskSize, 'none')) });
        this.service.node.defaultChild.addPropertyOverride('DesiredCount', cdk.Fn.conditionIf(serviceEnabled.logicalId, cdk.Aws.NO_VALUE, 0));
        if (typeof highAvailability != 'undefined') {
            /** CFn condition for auto-scaling */
            const autoScalingEnabled = new cdk.CfnCondition(this, 'AutoScalingEnabled', { expression: cdk.Fn.conditionAnd(serviceEnabled, highAvailability) });
            const target = autoScaling.node.findChild('Target');
            target.node.defaultChild.cfnOptions.condition = autoScalingEnabled;
            target.node.findChild('ScaleOnCpu').node.defaultChild.cfnOptions.condition = autoScalingEnabled;
        }
    }
}
exports.AutoScalingFargateService = AutoScalingFargateService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLXBhdHRlcm5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Vjcy1wYXR0ZXJucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUVuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBRTNDLDRFQUE4RDtBQUM5RCw2Q0FBNkM7QUFDN0MsMkRBQTZDO0FBQzdDLDJFQUE2RDtBQUM3RCwyQ0FBdUM7QUFDdkMscUVBQXdEO0FBNkJ4RCxNQUFhLGtCQUFtQixTQUFRLHNCQUFTO0lBZ0IvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCOztRQUN0RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzFELE1BQU0sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDNUMsTUFBTSxhQUFhLEdBQUcsZ0JBQWdCLENBQUMsYUFBYSxDQUFDO1FBQ3JELE1BQU0sZUFBZSxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO1FBQ3JILE1BQU0sb0JBQW9CLEdBQUcsQ0FBQyxPQUFPLEtBQUssQ0FBQyxvQkFBb0IsSUFBSSxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLENBQUM7UUFDckgsTUFBTSxjQUFjLEdBQUcsQ0FBQyxPQUFPLEtBQUssQ0FBQyxjQUFjLElBQUksV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNB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QS9DRCw4REErQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBTY2FsYWJsZVRhcmdldCwgQ2ZuU2NhbGFibGVUYXJnZXQsIENmblNjYWxpbmdQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwbGljYXRpb25hdXRvc2NhbGluZyc7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xyXG5pbXBvcnQgeyBOZXR3b3JrTG9hZEJhbGFuY2VkVGFza0ltYWdlT3B0aW9ucyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MtcGF0dGVybnMnO1xyXG5pbXBvcnQgKiBhcyBlbGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVsYXN0aWNsb2FkYmFsYW5jaW5ndjInO1xyXG4vL2ltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGNsb3VkTWFwIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZXJ2aWNlZGlzY292ZXJ5JztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IEF1dGhQcm92aWRlciB9IGZyb20gJy4vc3VwYWJhc2UtYXV0aC1wcm92aWRlcic7XHJcbmltcG9ydCB7IEZhcmdhdGVTdGFjayB9IGZyb20gJy4vc3VwYWJhc2Utc3RhY2snO1xyXG5cclxuaW50ZXJmYWNlIFN1cGFiYXNlVGFza0ltYWdlT3B0aW9ucyBleHRlbmRzIE5ldHdvcmtMb2FkQmFsYW5jZWRUYXNrSW1hZ2VPcHRpb25zIHtcclxuICBjb250YWluZXJQb3J0OiBudW1iZXI7XHJcbiAgaGVhbHRoQ2hlY2s/OiBlY3MuSGVhbHRoQ2hlY2s7XHJcbiAgZW50cnlQb2ludD86IHN0cmluZ1tdO1xyXG4gIGNvbW1hbmQ/OiBzdHJpbmdbXTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCYXNlRmFyZ2F0ZVNlcnZpY2VQcm9wcyB7XHJcbiAgc2VydmljZU5hbWU/OiBzdHJpbmc7XHJcbiAgY2x1c3RlcjogZWNzLklDbHVzdGVyO1xyXG4gIHRhc2tJbWFnZU9wdGlvbnM6IFN1cGFiYXNlVGFza0ltYWdlT3B0aW9ucztcclxuICBjcHVBcmNoaXRlY3R1cmU/OiAnWDg2XzY0J3wnQVJNNjQnO1xyXG4gIGVuYWJsZVNlcnZpY2VDb25uZWN0PzogYm9vbGVhbjtcclxuICBlbmFibGVDbG91ZE1hcD86IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQXV0b1NjYWxpbmdGYXJnYXRlU2VydmljZVByb3BzIGV4dGVuZHMgQmFzZUZhcmdhdGVTZXJ2aWNlUHJvcHMge1xyXG4gIG1pblRhc2tDb3VudD86IG51bWJlcjtcclxuICBtYXhUYXNrQ291bnQ/OiBudW1iZXI7XHJcbiAgaGlnaEF2YWlsYWJpbGl0eT86IGNkay5DZm5Db25kaXRpb247XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVGFyZ2V0R3JvdXBQcm9wcyB7XHJcbiAgaGVhbHRoQ2hlY2s/OiBlbGIuSGVhbHRoQ2hlY2s7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCYXNlRmFyZ2F0ZVNlcnZpY2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIC8qKlxyXG4gICAqIFRoZSBVUkwgdG8gY29ubmVjdCB0byBhbiBBUEkuIFRoZSBVUkwgY29udGFpbnMgdGhlIHByb3RvY29sLCBhIEROUyBuYW1lLCBhbmQgdGhlIHBvcnQuXHJcbiAgICogKGUuZy4gYGh0dHA6Ly9yZXN0LnN1cGFiYXNlLmludGVybmFsOjgwMDBgKVxyXG4gICAqL1xyXG4gIHJlYWRvbmx5IGVuZHBvaW50OiBzdHJpbmc7XHJcbiAgLyoqXHJcbiAgICogVGhpcyBjcmVhdGVzIGEgc2VydmljZSB1c2luZyB0aGUgRmFyZ2F0ZSBsYXVuY2ggdHlwZSBvbiBhbiBFQ1MgY2x1c3Rlci5cclxuICAgKiBAcmVzb3VyY2Ug4oCUIEFXUzo6RUNTOjpTZXJ2aWNlXHJcbiAgICovXHJcbiAgcmVhZG9ubHkgc2VydmljZTogZWNzLkZhcmdhdGVTZXJ2aWNlO1xyXG4gIC8qKlxyXG4gICAqIE1hbmFnZSB0aGUgYWxsb3dlZCBuZXR3b3JrIGNvbm5lY3Rpb25zIGZvciBjb25zdHJ1Y3RzIHdpdGggU2VjdXJpdHkgR3JvdXBzLlxyXG4gICAqL1xyXG4gIHJlYWRvbmx5IGNvbm5lY3Rpb25zOiBlYzIuQ29ubmVjdGlvbnM7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBCYXNlRmFyZ2F0ZVNlcnZpY2VQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCBzZXJ2aWNlTmFtZSA9IHByb3BzLnNlcnZpY2VOYW1lIHx8IGlkLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBjb25zdCB7IGNsdXN0ZXIsIHRhc2tJbWFnZU9wdGlvbnMgfSA9IHByb3BzO1xyXG4gICAgY29uc3QgY29udGFpbmVyUG9ydCA9IHRhc2tJbWFnZU9wdGlvbnMuY29udGFpbmVyUG9ydDtcclxuICAgIGNvbnN0IGNwdUFyY2hpdGVjdHVyZSA9IChwcm9wcy5jcHVBcmNoaXRlY3R1cmUgPT0gJ1g4Nl82NCcpID8gZWNzLkNwdUFyY2hpdGVjdHVyZS5YODZfNjQgOiBlY3MuQ3B1QXJjaGl0ZWN0dXJlLkFSTTY0O1xyXG4gICAgY29uc3QgZW5hYmxlU2VydmljZUNvbm5lY3QgPSAodHlwZW9mIHByb3BzLmVuYWJsZVNlcnZpY2VDb25uZWN0ID09ICd1bmRlZmluZWQnKSA/IGZhbHNlIDogcHJvcHMuZW5hYmxlU2VydmljZUNvbm5lY3Q7XHJcbiAgICBjb25zdCBlbmFibGVDbG91ZE1hcCA9ICh0eXBlb2YgcHJvcHMuZW5hYmxlQ2xvdWRNYXAgPT0gJ3VuZGVmaW5lZCcpID8gdHJ1ZSA6IHByb3BzLmVuYWJsZUNsb3VkTWFwO1xyXG5cclxuICAgIGNvbnN0IHRhc2tEZWZpbml0aW9uID0gbmV3IGVjcy5GYXJnYXRlVGFza0RlZmluaXRpb24odGhpcywgJ1Rhc2tEZWYnLCB7XHJcbiAgICAgIHJ1bnRpbWVQbGF0Zm9ybToge1xyXG4gICAgICAgIG9wZXJhdGluZ1N5c3RlbUZhbWlseTogZWNzLk9wZXJhdGluZ1N5c3RlbUZhbWlseS5MSU5VWCxcclxuICAgICAgICBjcHVBcmNoaXRlY3R1cmUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMb2dzJywge1xyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEgsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvKiogYXdzbG9ncyBsb2cgZHJpdmVyICovXHJcbiAgICBjb25zdCBsb2dEcml2ZXIgPSBuZXcgZWNzLkF3c0xvZ0RyaXZlcih7IGxvZ0dyb3VwLCBzdHJlYW1QcmVmaXg6ICdlY3MnIH0pO1xyXG5cclxuICAgIC8qKiBUaGUgbmFtZSBvZiBkZWZhdWx0IGNvbnRhaW5lciAqL1xyXG4gICAgY29uc3QgY29udGFpbmVyTmFtZSA9IHRhc2tJbWFnZU9wdGlvbnMuY29udGFpbmVyTmFtZSA/PyAnYXBwJztcclxuXHJcbiAgICAvKiogRGVmYXVsdCBjb250YWluZXIgKi9cclxuICAgIGNvbnN0IGFwcENvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcihjb250YWluZXJOYW1lLCB7XHJcbiAgICAgIGltYWdlOiB0YXNrSW1hZ2VPcHRpb25zLmltYWdlLFxyXG4gICAgICBsb2dnaW5nOiBsb2dEcml2ZXIsXHJcbiAgICAgIGVudmlyb25tZW50OiB0YXNrSW1hZ2VPcHRpb25zLmVudmlyb25tZW50LFxyXG4gICAgICBzZWNyZXRzOiB0YXNrSW1hZ2VPcHRpb25zLnNlY3JldHMsXHJcbiAgICAgIGRvY2tlckxhYmVsczogdGFza0ltYWdlT3B0aW9ucy5kb2NrZXJMYWJlbHMsXHJcbiAgICAgIGhlYWx0aENoZWNrOiB0YXNrSW1hZ2VPcHRpb25zLmhlYWx0aENoZWNrLFxyXG4gICAgICBlbnRyeVBvaW50OiB0YXNrSW1hZ2VPcHRpb25zLmVudHJ5UG9pbnQsXHJcbiAgICAgIGNvbW1hbmQ6IHRhc2tJbWFnZU9wdGlvbnMuY29tbWFuZCxcclxuICAgIH0pO1xyXG4gICAgYXBwQ29udGFpbmVyLmFkZFVsaW1pdHMoeyBuYW1lOiBlY3MuVWxpbWl0TmFtZS5OT0ZJTEUsIHNvZnRMaW1pdDogNjU1MzYsIGhhcmRMaW1pdDogNjU1MzYgfSk7XHJcbiAgICBhcHBDb250YWluZXIuYWRkUG9ydE1hcHBpbmdzKHsgbmFtZTogJ2h0dHAnLCBjb250YWluZXJQb3J0OiB0YXNrSW1hZ2VPcHRpb25zLmNvbnRhaW5lclBvcnQgfSk7XHJcblxyXG4gICAgdGhpcy5zZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnU2VydmljZScsIHtcclxuICAgICAgY2x1c3RlcixcclxuICAgICAgdGFza0RlZmluaXRpb24sXHJcbiAgICAgIGNpcmN1aXRCcmVha2VyOiB7IHJvbGxiYWNrOiB0cnVlIH0sXHJcbiAgICAgIGVuYWJsZUVDU01hbmFnZWRUYWdzOiB0cnVlLFxyXG4gICAgICBwcm9wYWdhdGVUYWdzOiBlY3MuUHJvcGFnYXRlZFRhZ1NvdXJjZS5TRVJWSUNFLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKGVuYWJsZVNlcnZpY2VDb25uZWN0KSB7XHJcbiAgICAgIHRoaXMuc2VydmljZS5lbmFibGVTZXJ2aWNlQ29ubmVjdCh7XHJcbiAgICAgICAgc2VydmljZXM6IFt7XHJcbiAgICAgICAgICBwb3J0TWFwcGluZ05hbWU6ICdodHRwJyxcclxuICAgICAgICAgIGRpc2NvdmVyeU5hbWU6IHNlcnZpY2VOYW1lLFxyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIGxvZ0RyaXZlcixcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVuYWJsZUNsb3VkTWFwKSB7XHJcbiAgICAgIGNvbnN0IGNsb3VkTWFwU2VydmljZSA9IHRoaXMuc2VydmljZS5lbmFibGVDbG91ZE1hcCh7XHJcbiAgICAgICAgY2xvdWRNYXBOYW1lc3BhY2U6IGNsdXN0ZXIuZGVmYXVsdENsb3VkTWFwTmFtZXNwYWNlLFxyXG4gICAgICAgIG5hbWU6IHNlcnZpY2VOYW1lLFxyXG4gICAgICAgIGNvbnRhaW5lcjogYXBwQ29udGFpbmVyLFxyXG4gICAgICAgIGRuc1JlY29yZFR5cGU6IGNsb3VkTWFwLkRuc1JlY29yZFR5cGUuU1JWLFxyXG4gICAgICAgIGRuc1R0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxyXG4gICAgICB9KTtcclxuICAgICAgKGNsb3VkTWFwU2VydmljZS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjbG91ZE1hcC5DZm5TZXJ2aWNlKS5hZGRQcm9wZXJ0eU92ZXJyaWRlKCdEbnNDb25maWcuRG5zUmVjb3Jkcy4xJywgeyBUeXBlOiAnQScsIFRUTDogMTAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jb25uZWN0aW9ucyA9IG5ldyBlYzIuQ29ubmVjdGlvbnMoe1xyXG4gICAgICBkZWZhdWx0UG9ydDogZWMyLlBvcnQudGNwKGNvbnRhaW5lclBvcnQpLFxyXG4gICAgICBzZWN1cml0eUdyb3VwczogdGhpcy5zZXJ2aWNlLmNvbm5lY3Rpb25zLnNlY3VyaXR5R3JvdXBzLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5lbmRwb2ludCA9IGBodHRwOi8vJHtzZXJ2aWNlTmFtZX0uJHtjbHVzdGVyLmRlZmF1bHRDbG91ZE1hcE5hbWVzcGFjZT8ubmFtZXNwYWNlTmFtZX06JHtjb250YWluZXJQb3J0fWA7XHJcbiAgfVxyXG5cclxuICAvKiogQ3JlYXRlIGEgVGFyZ2V0IEdyb3VwIGFuZCBsaW5rIGl0IHRvIHRoZSBFQ1MgU2VydmljZS4gKi9cclxuICBhZGRUYXJnZXRHcm91cChwcm9wcz86IFRhcmdldEdyb3VwUHJvcHMpIHtcclxuICAgIGNvbnN0IHRhcmdldEdyb3VwID0gbmV3IGVsYi5BcHBsaWNhdGlvblRhcmdldEdyb3VwKHRoaXMsICdUYXJnZXRHcm91cCcsIHtcclxuICAgICAgcHJvdG9jb2w6IGVsYi5BcHBsaWNhdGlvblByb3RvY29sLkhUVFAsXHJcbiAgICAgIHBvcnQ6IE51bWJlcih0aGlzLmNvbm5lY3Rpb25zLmRlZmF1bHRQb3J0KSxcclxuICAgICAgdGFyZ2V0czogW3RoaXMuc2VydmljZS5sb2FkQmFsYW5jZXJUYXJnZXQoeyBjb250YWluZXJOYW1lOiAnYXBwJyB9KV0sXHJcbiAgICAgIGRlcmVnaXN0cmF0aW9uRGVsYXk6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgaGVhbHRoQ2hlY2s6IHByb3BzPy5oZWFsdGhDaGVjayxcclxuICAgICAgdnBjOiB0aGlzLnNlcnZpY2UuY2x1c3Rlci52cGMsXHJcbiAgICB9KTtcclxuICAgIHJldHVybiB0YXJnZXRHcm91cDtcclxuICB9XHJcblxyXG5cclxuICBhZGRFeHRlcm5hbEF1dGhQcm92aWRlcnMocmVkaXJlY3RVcmk6IHN0cmluZywgcHJvdmlkZXJDb3VudDogbnVtYmVyKSB7XHJcbiAgICBjb25zdCBwcm92aWRlcnM6IEF1dGhQcm92aWRlcltdID0gW107XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByb3ZpZGVyQ291bnQ7IGkrKykge1xyXG4gICAgICBjb25zdCBhdXRoUHJvdmlkZXIgPSBuZXcgQXV0aFByb3ZpZGVyKHRoaXMsIGBQcm92aWRlciR7aSsxfWApO1xyXG4gICAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLnNlcnZpY2UudGFza0RlZmluaXRpb24uZGVmYXVsdENvbnRhaW5lciE7XHJcbiAgICAgIC8vIFNldCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgICAgY29udGFpbmVyLmFkZEVudmlyb25tZW50KGBHT1RSVUVfRVhURVJOQUxfJHthdXRoUHJvdmlkZXIuaWR9X0VOQUJMRURgLCBhdXRoUHJvdmlkZXIuZW5hYmxlZCk7XHJcbiAgICAgIGNvbnRhaW5lci5hZGRFbnZpcm9ubWVudChgR09UUlVFX0VYVEVSTkFMXyR7YXV0aFByb3ZpZGVyLmlkfV9SRURJUkVDVF9VUklgLCByZWRpcmVjdFVyaSk7XHJcbiAgICAgIGNvbnRhaW5lci5hZGRTZWNyZXQoYEdPVFJVRV9FWFRFUk5BTF8ke2F1dGhQcm92aWRlci5pZH1fQ0xJRU5UX0lEYCwgZWNzLlNlY3JldC5mcm9tU3NtUGFyYW1ldGVyKGF1dGhQcm92aWRlci5jbGllbnRJZFBhcmFtZXRlcikpO1xyXG4gICAgICBjb250YWluZXIuYWRkU2VjcmV0KGBHT1RSVUVfRVhURVJOQUxfJHthdXRoUHJvdmlkZXIuaWR9X1NFQ1JFVGAsIGVjcy5TZWNyZXQuZnJvbVNzbVBhcmFtZXRlcihhdXRoUHJvdmlkZXIuc2VjcmV0UGFyYW1ldGVyKSk7XHJcbiAgICAgIHByb3ZpZGVycy5wdXNoKGF1dGhQcm92aWRlcik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcHJvdmlkZXJzO1xyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEF1dG9TY2FsaW5nRmFyZ2F0ZVNlcnZpY2UgZXh0ZW5kcyBCYXNlRmFyZ2F0ZVNlcnZpY2Uge1xyXG4gIHJlYWRvbmx5IHRhc2tTaXplOiBjZGsuQ2ZuUGFyYW1ldGVyO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogRmFyZ2F0ZVN0YWNrLCBpZDogc3RyaW5nLCBwcm9wczogQXV0b1NjYWxpbmdGYXJnYXRlU2VydmljZVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCB7IG1pblRhc2tDb3VudCwgbWF4VGFza0NvdW50LCBoaWdoQXZhaWxhYmlsaXR5IH0gPSBwcm9wcztcclxuXHJcbiAgICB0aGlzLnRhc2tTaXplID0gbmV3IGNkay5DZm5QYXJhbWV0ZXIodGhpcywgJ1Rhc2tTaXplJywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ0ZhcmdhcmUgdGFzayBzaXplJyxcclxuICAgICAgdHlwZTogJ1N0cmluZycsXHJcbiAgICAgIGRlZmF1bHQ6ICdtZWRpdW0nLFxyXG4gICAgICBhbGxvd2VkVmFsdWVzOiBbJ25vbmUnLCAnbWljcm8nLCAnc21hbGwnLCAnbWVkaXVtJywgJ2xhcmdlJywgJ3hsYXJnZScsICcyeGxhcmdlJywgJzR4bGFyZ2UnXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBDRm4gdGFzayBkZWZpbml0aW9uIHRvIG92ZXJyaWRlICovXHJcbiAgICBjb25zdCB0YXNrRGVmID0gdGhpcy5zZXJ2aWNlLnRhc2tEZWZpbml0aW9uLm5vZGUuZGVmYXVsdENoaWxkIGFzIGVjcy5DZm5UYXNrRGVmaW5pdGlvbjtcclxuXHJcbiAgICBjb25zdCBjcHUgPSBzY29wZS50YXNrU2l6ZU1hcHBpbmcuZmluZEluTWFwKHRoaXMudGFza1NpemUudmFsdWVBc1N0cmluZywgJ2NwdScpO1xyXG4gICAgY29uc3QgbWVtb3J5ID0gc2NvcGUudGFza1NpemVNYXBwaW5nLmZpbmRJbk1hcCh0aGlzLnRhc2tTaXplLnZhbHVlQXNTdHJpbmcsICdtZW1vcnknKTtcclxuXHJcbiAgICB0YXNrRGVmLmFkZFByb3BlcnR5T3ZlcnJpZGUoJ0NwdScsIGNwdSk7XHJcbiAgICB0YXNrRGVmLmFkZFByb3BlcnR5T3ZlcnJpZGUoJ01lbW9yeScsIG1lbW9yeSk7XHJcblxyXG4gICAgY29uc3QgYXV0b1NjYWxpbmcgPSB0aGlzLnNlcnZpY2UuYXV0b1NjYWxlVGFza0NvdW50KHtcclxuICAgICAgbWluQ2FwYWNpdHk6IG1pblRhc2tDb3VudCA/PyAyLFxyXG4gICAgICBtYXhDYXBhY2l0eTogbWF4VGFza0NvdW50ID8/IDIwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXV0b1NjYWxpbmcuc2NhbGVPbkNwdVV0aWxpemF0aW9uKCdTY2FsZU9uQ3B1Jywge1xyXG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDUwLFxyXG4gICAgICBzY2FsZUluQ29vbGRvd246IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgICAgc2NhbGVPdXRDb29sZG93bjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLyoqIENGbiBjb25kaXRpb24gZm9yIEVDUyBzZXJ2aWNlICovXHJcbiAgICBjb25zdCBzZXJ2aWNlRW5hYmxlZCA9IG5ldyBjZGsuQ2ZuQ29uZGl0aW9uKHRoaXMsICdTZXJ2aWNlRW5hYmxlZCcsIHsgZXhwcmVzc2lvbjogY2RrLkZuLmNvbmRpdGlvbk5vdChjZGsuRm4uY29uZGl0aW9uRXF1YWxzKHRoaXMudGFza1NpemUsICdub25lJykpIH0pO1xyXG4gICAgKHRoaXMuc2VydmljZS5ub2RlLmRlZmF1bHRDaGlsZCBhcyBlY3MuQ2ZuU2VydmljZSkuYWRkUHJvcGVydHlPdmVycmlkZSgnRGVzaXJlZENvdW50JywgY2RrLkZuLmNvbmRpdGlvbklmKHNlcnZpY2VFbmFibGVkLmxvZ2ljYWxJZCwgY2RrLkF3cy5OT19WQUxVRSwgMCkpO1xyXG5cclxuICAgIGlmICh0eXBlb2YgaGlnaEF2YWlsYWJpbGl0eSAhPSAndW5kZWZpbmVkJykge1xyXG4gICAgICAvKiogQ0ZuIGNvbmRpdGlvbiBmb3IgYXV0by1zY2FsaW5nICovXHJcbiAgICAgIGNvbnN0IGF1dG9TY2FsaW5nRW5hYmxlZCA9IG5ldyBjZGsuQ2ZuQ29uZGl0aW9uKHRoaXMsICdBdXRvU2NhbGluZ0VuYWJsZWQnLCB7IGV4cHJlc3Npb246IGNkay5Gbi5jb25kaXRpb25BbmQoc2VydmljZUVuYWJsZWQsIGhpZ2hBdmFpbGFiaWxpdHkpIH0pO1xyXG4gICAgICBjb25zdCB0YXJnZXQgPSBhdXRvU2NhbGluZy5ub2RlLmZpbmRDaGlsZCgnVGFyZ2V0JykgYXMgU2NhbGFibGVUYXJnZXQ7XHJcbiAgICAgICh0YXJnZXQubm9kZS5kZWZhdWx0Q2hpbGQgYXMgQ2ZuU2NhbGFibGVUYXJnZXQpLmNmbk9wdGlvbnMuY29uZGl0aW9uID0gYXV0b1NjYWxpbmdFbmFibGVkO1xyXG4gICAgICAodGFyZ2V0Lm5vZGUuZmluZENoaWxkKCdTY2FsZU9uQ3B1Jykubm9kZS5kZWZhdWx0Q2hpbGQgYXMgQ2ZuU2NhbGluZ1BvbGljeSkuY2ZuT3B0aW9ucy5jb25kaXRpb24gPSBhdXRvU2NhbGluZ0VuYWJsZWQ7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==