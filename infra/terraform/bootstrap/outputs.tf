output "state_bucket_name" {
  description = "Name of the S3 bucket that holds Terraform remote state."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "state_bucket_region" {
  description = "AWS region of the Terraform remote-state bucket."
  value       = var.aws_region
}
