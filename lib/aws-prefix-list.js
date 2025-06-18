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
exports.PrefixList = void 0;
const cr = __importStar(require("aws-cdk-lib/custom-resources"));
class PrefixList extends cr.AwsCustomResource {
    constructor(scope, id, props) {
        super(scope, id, {
            resourceType: 'Custom::PrefixList',
            policy: cr.AwsCustomResourcePolicy.fromSdkCalls({ resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE }),
            onCreate: {
                service: 'EC2',
                action: 'describeManagedPrefixLists',
                parameters: {
                    Filters: [{ Name: 'prefix-list-name', Values: [props.prefixListName] }],
                },
                //outputPaths: ['PrefixLists.0'],
                physicalResourceId: cr.PhysicalResourceId.fromResponse('PrefixLists.0.PrefixListId'),
            },
        });
        this.prefixListId = this.getResponseField('PrefixLists.0.PrefixListId');
    }
}
exports.PrefixList = PrefixList;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLXByZWZpeC1saXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2F3cy1wcmVmaXgtbGlzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlFQUFtRDtBQU9uRCxNQUFhLFVBQVcsU0FBUSxFQUFFLENBQUMsaUJBQWlCO0lBR2xELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDZixZQUFZLEVBQUUsb0JBQW9CO1lBQ2xDLE1BQU0sRUFBRSxFQUFFLENBQUMsdUJBQXVCLENBQUMsWUFBWSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2RyxRQUFRLEVBQUU7Z0JBQ1IsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsTUFBTSxFQUFFLDRCQUE0QjtnQkFDcEMsVUFBVSxFQUFFO29CQUNWLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO2lCQUN4RTtnQkFDRCxpQ0FBaUM7Z0JBQ2pDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsNEJBQTRCLENBQUM7YUFDckY7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBQzFFLENBQUM7Q0FDRjtBQXBCRCxnQ0FvQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjciBmcm9tICdhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5pbnRlcmZhY2UgUHJlZml4TGlzdFByb3BzIHtcclxuICBwcmVmaXhMaXN0TmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJlZml4TGlzdCBleHRlbmRzIGNyLkF3c0N1c3RvbVJlc291cmNlIHtcclxuICBwcmVmaXhMaXN0SWQ6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFByZWZpeExpc3RQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCB7XHJcbiAgICAgIHJlc291cmNlVHlwZTogJ0N1c3RvbTo6UHJlZml4TGlzdCcsXHJcbiAgICAgIHBvbGljeTogY3IuQXdzQ3VzdG9tUmVzb3VyY2VQb2xpY3kuZnJvbVNka0NhbGxzKHsgcmVzb3VyY2VzOiBjci5Bd3NDdXN0b21SZXNvdXJjZVBvbGljeS5BTllfUkVTT1VSQ0UgfSksXHJcbiAgICAgIG9uQ3JlYXRlOiB7XHJcbiAgICAgICAgc2VydmljZTogJ0VDMicsXHJcbiAgICAgICAgYWN0aW9uOiAnZGVzY3JpYmVNYW5hZ2VkUHJlZml4TGlzdHMnLFxyXG4gICAgICAgIHBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgIEZpbHRlcnM6IFt7IE5hbWU6ICdwcmVmaXgtbGlzdC1uYW1lJywgVmFsdWVzOiBbcHJvcHMucHJlZml4TGlzdE5hbWVdIH1dLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy9vdXRwdXRQYXRoczogWydQcmVmaXhMaXN0cy4wJ10sXHJcbiAgICAgICAgcGh5c2ljYWxSZXNvdXJjZUlkOiBjci5QaHlzaWNhbFJlc291cmNlSWQuZnJvbVJlc3BvbnNlKCdQcmVmaXhMaXN0cy4wLlByZWZpeExpc3RJZCcpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5wcmVmaXhMaXN0SWQgPSB0aGlzLmdldFJlc3BvbnNlRmllbGQoJ1ByZWZpeExpc3RzLjAuUHJlZml4TGlzdElkJyk7XHJcbiAgfVxyXG59XHJcbiJdfQ==