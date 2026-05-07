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
  description = "Common tags applied to AWS resources"
  value       = local.name_prefix
}

output "common_tags" {
  description = "Common tags applied to AWS resources"
  value       = local.common_tags
}