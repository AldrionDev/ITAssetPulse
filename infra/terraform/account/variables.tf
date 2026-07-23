variable "project_name" {
  description = "Project name used to build resource names (Budget, SNS topic, IAM role)."
  type        = string
  default     = "itassetpulse"

  # Charset/length only: this stack creates no S3 bucket, so the S3 reserved-prefix
  # exclusions used by the bootstrap stack's project_name validation do not apply here.
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,32}[a-z0-9])?$", var.project_name))
    error_message = "project_name must be 1-34 characters, lowercase letters, digits and hyphens only, and start and end with a letter or digit."
  }
}

variable "aws_region" {
  description = "AWS region where the account-level guardrails are created."
  type        = string
  default     = "eu-north-1"
}

variable "budget_limit_usd" {
  description = "Monthly AWS Budget threshold in USD."
  type        = number
  default     = 10

  validation {
    condition     = var.budget_limit_usd > 0
    error_message = "budget_limit_usd must be greater than 0."
  }
}

variable "budget_notification_email" {
  description = "Email address subscribed to the budget-alerts SNS topic. Requires a one-time manual confirmation (see README)."
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub organization or user that owns the repository allowed to assume the image-publish role."
  type        = string
  default     = "AldrionDev"
}

variable "github_repo" {
  description = "GitHub repository name allowed to assume the image-publish role."
  type        = string
  default     = "ITAssetPulse"
}

variable "github_branch" {
  description = "Branch the GitHub Actions OIDC trust policy is scoped to. Only workflow runs dispatched against this branch can assume the image-publish role."
  type        = string
  default     = "main"
}

variable "create_oidc_provider" {
  description = "Whether to create the GitHub Actions OIDC provider. Set to false if the shared account already has one for token.actions.githubusercontent.com (verify via the read-only preflight before every apply)."
  type        = bool
  default     = true
}
