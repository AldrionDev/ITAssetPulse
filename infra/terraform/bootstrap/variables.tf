variable "project_name" {
  description = "Project name used for naming AWS resources."
  type        = string
  default     = "itassetpulse"
}

variable "environment" {
  description = "Demo environment name."
  type        = string
  default     = "demo"
}

variable "aws_region" {
  description = "AWS region where the Terraform state bucket will be created."
  type        = string
  default     = "eu-north-1"
}