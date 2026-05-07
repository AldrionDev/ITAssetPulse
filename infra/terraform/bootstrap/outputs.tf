output "terraform_state_bucket_name" {
  description = "Name of the S3 bucket used for Terraform remote state."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "terraform_state_bucket_region" {
  description = "AWS region of the Terraform state bucket."
  value       = var.aws_region
}

output "name_prefix" {
  description = "Common name prefix used by the bootstrap configuration"
  value       = local.name_prefix
}

output "common_tags" {
  description = "Common tags used by the bootstrap configuration"
  value       = local.common_tags
}