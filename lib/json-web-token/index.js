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
exports.JwtSecret = void 0;
const path = __importStar(require("path"));
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_secretsmanager_1 = require("aws-cdk-lib/aws-secretsmanager");
const ssm = __importStar(require("aws-cdk-lib/aws-ssm"));
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
const constructs_1 = require("constructs");
class JwtSecret extends aws_secretsmanager_1.Secret {
    /** Creates a new jwt secret in AWS SecretsManager. */
    constructor(scope, id, props) {
        super(scope, id, {
            description: `${cdk.Aws.STACK_NAME} - Json Web Token Secret`,
            generateSecretString: {
                passwordLength: 64,
                excludePunctuation: true,
            },
            ...props,
        });
        /** Custom resource handler to generate a json web token */
        const jwtFunction = new aws_lambda_nodejs_1.NodejsFunction(this, 'JsonWebTokenFunction', {
            description: `${cdk.Aws.STACK_NAME} - Generate token via jwt secret`,
            entry: path.resolve(__dirname, 'cr-json-web-token.ts'),
            runtime: lambda.Runtime.NODEJS_20_X,
            environment: {
                JWT_SECRET_ARN: this.secretArn,
            },
        });
        /** Allow the function to read the jwt secret */
        this.grantRead(jwtFunction);
        this.genTokenProvider = new cr.Provider(this, 'GenerateTokenProvider', { onEventHandler: jwtFunction });
    }
    /** Generate a new token in ParameterStore. */
    genApiKey(id, props) {
        const apiKey = new ApiKey(this, id, props);
        return apiKey;
    }
}
exports.JwtSecret = JwtSecret;
class ApiKey extends constructs_1.Construct {
    /** Json Web Token */
    constructor(scope, id, props) {
        super(scope, id);
        const jwtSecret = scope;
        const roleName = props.roleName;
        const issuer = props.issuer;
        const expiresIn = props.expiresIn;
        /** String value of Json Web Token */
        const token = new cdk.CustomResource(this, 'Resource', {
            serviceToken: jwtSecret.genTokenProvider.serviceToken,
            resourceType: 'Custom::JsonWebToken',
            properties: {
                Payload: { role: roleName },
                Issuer: issuer,
                ExpiresIn: expiresIn,
            },
        });
        this.value = token.getAttString('Value');
        this.ssmParameter = new ssm.StringParameter(this, 'Parameter', {
            description: `${cdk.Aws.STACK_NAME} - Json Web Token, role: ${roleName}`,
            parameterName: `/${cdk.Aws.STACK_NAME}/${jwtSecret.node.id}/${id}`,
            stringValue: this.value,
            simpleName: false,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvanNvbi13ZWItdG9rZW4vaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsaURBQW1DO0FBQ25DLCtEQUFpRDtBQUNqRCxxRUFBK0Q7QUFDL0QsdUVBQXFFO0FBQ3JFLHlEQUEyQztBQUMzQyxpRUFBbUQ7QUFDbkQsMkNBQXVDO0FBRXZDLE1BQWEsU0FBVSxTQUFRLDJCQUFNO0lBSW5DLHNEQUFzRDtJQUN0RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQ2YsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLDBCQUEwQjtZQUM1RCxvQkFBb0IsRUFBRTtnQkFDcEIsY0FBYyxFQUFFLEVBQUU7Z0JBQ2xCLGtCQUFrQixFQUFFLElBQUk7YUFDekI7WUFDRCxHQUFHLEtBQUs7U0FDVCxDQUFDLENBQUM7UUFFSCwyREFBMkQ7UUFDM0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNuRSxXQUFXLEVBQUUsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLFVBQVUsa0NBQWtDO1lBQ3BFLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxzQkFBc0IsQ0FBQztZQUN0RCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUUsSUFBSSxDQUFDLFNBQVM7YUFDL0I7U0FDRixDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU1QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzFHLENBQUM7SUFFRCw4Q0FBOEM7SUFDOUMsU0FBUyxDQUFDLEVBQVUsRUFBRSxLQUFrQjtRQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNDLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUM7Q0FDRjtBQXBDRCw4QkFvQ0M7QUFRRCxNQUFNLE1BQU8sU0FBUSxzQkFBUztJQU01QixxQkFBcUI7SUFDckIsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUMxRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN4QixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDO1FBQ2hDLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDNUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztRQUVsQyxxQ0FBcUM7UUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDckQsWUFBWSxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZO1lBQ3JELFlBQVksRUFBRSxzQkFBc0I7WUFDcEMsVUFBVSxFQUFFO2dCQUNWLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7Z0JBQzNCLE1BQU0sRUFBRSxNQUFNO2dCQUNkLFNBQVMsRUFBRSxTQUFTO2FBQ3JCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXpDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDN0QsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLDRCQUE0QixRQUFRLEVBQUU7WUFDeEUsYUFBYSxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFO1lBQ2xFLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSztZQUN2QixVQUFVLEVBQUUsS0FBSztTQUNsQixDQUFDLENBQUM7SUFFTCxDQUFDO0NBQ0YiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xyXG5pbXBvcnQgeyBTZWNyZXQsIFNlY3JldFByb3BzIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgc3NtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zc20nO1xyXG5pbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgY2xhc3MgSnd0U2VjcmV0IGV4dGVuZHMgU2VjcmV0IHtcclxuICAvKiogQ3VzdG9tIHJlc291cmNlIHByb3ZpZGVyIHRvIGdlbmVyYXRlIGEganNvbiB3ZWIgdG9rZW4gKi9cclxuICBnZW5Ub2tlblByb3ZpZGVyOiBjci5Qcm92aWRlcjtcclxuXHJcbiAgLyoqIENyZWF0ZXMgYSBuZXcgand0IHNlY3JldCBpbiBBV1MgU2VjcmV0c01hbmFnZXIuICovXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTZWNyZXRQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgJHtjZGsuQXdzLlNUQUNLX05BTUV9IC0gSnNvbiBXZWIgVG9rZW4gU2VjcmV0YCxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcclxuICAgICAgICBwYXNzd29yZExlbmd0aDogNjQsXHJcbiAgICAgICAgZXhjbHVkZVB1bmN0dWF0aW9uOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICAuLi5wcm9wcyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBDdXN0b20gcmVzb3VyY2UgaGFuZGxlciB0byBnZW5lcmF0ZSBhIGpzb24gd2ViIHRva2VuICovXHJcbiAgICBjb25zdCBqd3RGdW5jdGlvbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnSnNvbldlYlRva2VuRnVuY3Rpb24nLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgJHtjZGsuQXdzLlNUQUNLX05BTUV9IC0gR2VuZXJhdGUgdG9rZW4gdmlhIGp3dCBzZWNyZXRgLFxyXG4gICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NyLWpzb24td2ViLXRva2VuLnRzJyksXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEpXVF9TRUNSRVRfQVJOOiB0aGlzLnNlY3JldEFybixcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8qKiBBbGxvdyB0aGUgZnVuY3Rpb24gdG8gcmVhZCB0aGUgand0IHNlY3JldCAqL1xyXG4gICAgdGhpcy5ncmFudFJlYWQoand0RnVuY3Rpb24pO1xyXG5cclxuICAgIHRoaXMuZ2VuVG9rZW5Qcm92aWRlciA9IG5ldyBjci5Qcm92aWRlcih0aGlzLCAnR2VuZXJhdGVUb2tlblByb3ZpZGVyJywgeyBvbkV2ZW50SGFuZGxlcjogand0RnVuY3Rpb24gfSk7XHJcbiAgfVxyXG5cclxuICAvKiogR2VuZXJhdGUgYSBuZXcgdG9rZW4gaW4gUGFyYW1ldGVyU3RvcmUuICovXHJcbiAgZ2VuQXBpS2V5KGlkOiBzdHJpbmcsIHByb3BzOiBBcGlLZXlQcm9wcykge1xyXG4gICAgY29uc3QgYXBpS2V5ID0gbmV3IEFwaUtleSh0aGlzLCBpZCwgcHJvcHMpO1xyXG4gICAgcmV0dXJuIGFwaUtleTtcclxuICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBBcGlLZXlQcm9wcyB7XHJcbiAgcm9sZU5hbWU6IHN0cmluZztcclxuICBpc3N1ZXI/OiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luPzogc3RyaW5nO1xyXG59XHJcblxyXG5jbGFzcyBBcGlLZXkgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIC8qKiBUb2tlbiB2YWx1ZSAqL1xyXG4gIHZhbHVlOiBzdHJpbmc7XHJcbiAgLyoqIFBhcmFtZXRlclN0b3JlIG9mIHRoZSB0b2tlbiAqL1xyXG4gIHNzbVBhcmFtZXRlcjogc3NtLlN0cmluZ1BhcmFtZXRlcjtcclxuXHJcbiAgLyoqIEpzb24gV2ViIFRva2VuICovXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IEp3dFNlY3JldCwgaWQ6IHN0cmluZywgcHJvcHM6IEFwaUtleVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IGp3dFNlY3JldCA9IHNjb3BlO1xyXG4gICAgY29uc3Qgcm9sZU5hbWUgPSBwcm9wcy5yb2xlTmFtZTtcclxuICAgIGNvbnN0IGlzc3VlciA9IHByb3BzLmlzc3VlcjtcclxuICAgIGNvbnN0IGV4cGlyZXNJbiA9IHByb3BzLmV4cGlyZXNJbjtcclxuXHJcbiAgICAvKiogU3RyaW5nIHZhbHVlIG9mIEpzb24gV2ViIFRva2VuICovXHJcbiAgICBjb25zdCB0b2tlbiA9IG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgJ1Jlc291cmNlJywge1xyXG4gICAgICBzZXJ2aWNlVG9rZW46IGp3dFNlY3JldC5nZW5Ub2tlblByb3ZpZGVyLnNlcnZpY2VUb2tlbixcclxuICAgICAgcmVzb3VyY2VUeXBlOiAnQ3VzdG9tOjpKc29uV2ViVG9rZW4nLFxyXG4gICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgUGF5bG9hZDogeyByb2xlOiByb2xlTmFtZSB9LFxyXG4gICAgICAgIElzc3VlcjogaXNzdWVyLFxyXG4gICAgICAgIEV4cGlyZXNJbjogZXhwaXJlc0luLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy52YWx1ZSA9IHRva2VuLmdldEF0dFN0cmluZygnVmFsdWUnKTtcclxuXHJcbiAgICB0aGlzLnNzbVBhcmFtZXRlciA9IG5ldyBzc20uU3RyaW5nUGFyYW1ldGVyKHRoaXMsICdQYXJhbWV0ZXInLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgJHtjZGsuQXdzLlNUQUNLX05BTUV9IC0gSnNvbiBXZWIgVG9rZW4sIHJvbGU6ICR7cm9sZU5hbWV9YCxcclxuICAgICAgcGFyYW1ldGVyTmFtZTogYC8ke2Nkay5Bd3MuU1RBQ0tfTkFNRX0vJHtqd3RTZWNyZXQubm9kZS5pZH0vJHtpZH1gLFxyXG4gICAgICBzdHJpbmdWYWx1ZTogdGhpcy52YWx1ZSxcclxuICAgICAgc2ltcGxlTmFtZTogZmFsc2UsXHJcbiAgICB9KTtcclxuXHJcbiAgfVxyXG59XHJcbiJdfQ==