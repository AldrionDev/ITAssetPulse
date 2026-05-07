variable "project_name" {
  description = "Project name used for naming AWS resources"
  type        = string
  default     = "itassetpulse"
}

variable "environment" {
  description = "Demo environment name"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-north-1"
}
