locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = merge(var.common_tags, {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    Purpose     = "ecs"
  })

  # aws_ecr_image requires a bare repository_name, not the ARN/URL foundation
  # exports - the repository name is the segment after "repository/" in the ARN.
  backend_ecr_repository_name  = split("/", data.terraform_remote_state.foundation.outputs.backend_ecr_repository_arn)[1]
  frontend_ecr_repository_name = split("/", data.terraform_remote_state.foundation.outputs.frontend_ecr_repository_arn)[1]
}
