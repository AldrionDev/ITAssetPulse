variable "project_name" {
  description = "Project name used to build the deterministic Terraform state bucket name."
  type        = string
  default     = "itassetpulse"

  # Keep project_name inside the lowercase S3 general-purpose bucket naming
  # rules so the derived bucket name "<project_name>-terraform-state-<account_id>"
  # is always valid. 1-34 chars leaves room for the "-terraform-state-" infix
  # and the 12-digit account id within the 63-char S3 limit.
  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,32}[a-z0-9])?$", var.project_name))
    error_message = "project_name must be 1-34 characters, lowercase letters, digits and hyphens only, and start and end with a letter or digit."
  }

  # S3 reserves a few name prefixes; exclude the ones a project_name could
  # realistically collide with.
  validation {
    condition = alltrue([
      !startswith(var.project_name, "xn--"),
      !startswith(var.project_name, "sthree-"),
      !startswith(var.project_name, "amzn-s3-demo-"),
    ])
    error_message = "project_name must not start with an S3-reserved prefix (xn--, sthree-, amzn-s3-demo-)."
  }
}

variable "aws_region" {
  description = "AWS region where the Terraform remote-state bucket is created."
  type        = string
  default     = "eu-north-1"
}
