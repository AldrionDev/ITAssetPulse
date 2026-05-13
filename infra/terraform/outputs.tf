output "project_name" {
  description = "Project name used for naming and tagging AWS resources."
  value       = var.project_name
}

output "environment" {
  description = "Environment name used for this Terraform deployment."
  value       = var.environment
}

output "aws_region" {
  description = "AWS region used by Terraform."
  value       = var.aws_region
}

output "name_prefix" {
  description = "Common name prefix used for AWS resources."
  value       = local.name_prefix
}

output "common_tags" {
  description = "Common tags applied to AWS resources."
  value       = local.common_tags
}

output "vpc_id" {
  description = "ID of the main VPC."
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the main VPC."
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of the public subnets."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets."
  value       = aws_subnet.private[*].id
}

output "availability_zones" {
  description = "Availability Zones used by the public and private subnets."
  value       = slice(data.aws_availability_zones.available.names, 0, length(var.public_subnet_cidrs))
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway attached to the VPC."
  value       = aws_internet_gateway.main.id
}

output "nat_gateway_id" {
  description = "ID of the NAT Gateway used for private subnet outbound internet access."
  value       = aws_nat_gateway.main.id
}

output "nat_gateway_public_ip" {
  description = "Public IP address allocated to the NAT Gateway."
  value       = aws_eip.nat.public_ip
}

output "public_route_table_id" {
  description = "ID of the public route table."
  value       = aws_route_table.public.id
}

output "private_route_table_id" {
  description = "ID of the private route table."
  value       = aws_route_table.private.id
}


# --------------- ECR outputs ---------------------------------

output "backend_ecr_repository_name" {
  description = "Name of the backend ECR repository."
  value       = aws_ecr_repository.backend.name
}

output "frontend_ecr_repository_name" {
  description = "Name of the frontend ECR repository."
  value       = aws_ecr_repository.frontend.name
}

output "backend_ecr_repository_url" {
  description = "URL of the backend ECR repository."
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_ecr_repository_url" {
  description = "URL of the frontend ECR repository."
  value       = aws_ecr_repository.frontend.repository_url
}

output "backend_image_uri" {
  description = "Full backend image URI including the configured image tag."
  value       = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"
}

output "frontend_image_uri" {
  description = "Full frontend Docker image URI including the configured image tag."
  value       = "${aws_ecr_repository.frontend.repository_url}:${var.image_tag}"
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster."
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Endpoint URL of the EKS cluster."
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_security_group_id" {
  description = "Security group ID created by EKS for the cluster."
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}

output "eks_cluster_arn" {
  description = "ARN of the EKS cluster."
  value       = aws_eks_cluster.main.arn
}

output "eks_cluster_version" {
  description = "Kubernetes version used by the EKS cluster."
  value       = aws_eks_cluster.main.version
}

output "eks_node_group_name" {
  description = "Name of the EKS managed node group."
  value       = aws_eks_node_group.main.node_group_name
}

output "eks_node_group_arn" {
  description = "ARN of the EKS managed node group."
  value       = aws_eks_node_group.main.arn
}

output "eks_node_group_role_arn" {
  description = "IAM role ARN used by the EKS managed node group."
  value       = aws_iam_role.eks_node_group.arn
}

output "eks_node_instance_types" {
  description = "EC2 instance types used by the EKS managed node group."
  value       = aws_eks_node_group.main.instance_types
}

output "eks_addon_names" {
  description = "EKS addons managed by Terraform."
  value = [
    aws_eks_addon.vpc_cni.addon_name,
    aws_eks_addon.kube_proxy.addon_name,
    aws_eks_addon.coredns.addon_name,
    aws_eks_addon.pod_identity_agent.addon_name,
    aws_eks_addon.ebs_csi_driver.addon_name
  ]
}

output "ebs_csi_driver_role_arn" {
  description = "IAM role ARN used by the EBS CSI driver addon."
  value       = aws_iam_role.ebs_csi_driver.arn
}

output "load_balancer_controller_role_arn" {
  description = "IAM role ARN used by the AWS Load Balancer Controller."
  value       = aws_iam_role.load_balancer_controller.arn
}

output "load_balancer_controller_release_name" {
  description = "Helm release name for the AWS Load Balancer Controller."
  value       = helm_release.load_balancer_controller.name
}

output "kubernetes_namespace" {
  description = "Kubernetes namespace used by the ITAssetPulse application."
  value       = kubernetes_namespace.itassetpulse.metadata[0].name
}

output "app_config_map_name" {
  description = "Name of the base application ConfigMap."
  value       = kubernetes_config_map.app_config.metadata[0].name
}