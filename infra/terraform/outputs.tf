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