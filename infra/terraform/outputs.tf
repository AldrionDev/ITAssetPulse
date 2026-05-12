output "project_name" {
  description = "Project name used by Terraform."
  value       = var.project_name
}

output "environment" {
  description = "Demo environment name."
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
  description = "Availability Zones used by the subnets."
  value       = slice(data.aws_availability_zones.available.names, 0, length(var.public_subnet_cidrs))
}