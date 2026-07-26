variable "project_name" {
  description = "Project name used to build resource names and tags."
  type        = string
  default     = "itassetpulse"

  validation {
    condition     = can(regex("^[a-z0-9]([a-z0-9-]{0,32}[a-z0-9])?$", var.project_name))
    error_message = "project_name must be 1-34 characters, lowercase letters, digits and hyphens only, and start and end with a letter or digit."
  }
}

variable "environment" {
  description = "Environment name used to build resource names, tags, and the remote-state key (e.g. \"demo\")."
  type        = string
  default     = "demo"
}

variable "common_tags" {
  description = "Additional tags merged into every resource created by this stack."
  type        = map(string)
  default     = {}
}

variable "aws_region" {
  description = "AWS region where the foundation resources are created."
  type        = string
  default     = "eu-north-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets, one per availability zone, in AZ order."
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the private subnets, one per availability zone, in AZ order."
  type        = list(string)
}

variable "availability_zone_count" {
  description = "Number of availability zones to spread the public and private subnets across."
  type        = number

  validation {
    condition     = var.availability_zone_count >= 1 && var.availability_zone_count == floor(var.availability_zone_count)
    error_message = "availability_zone_count must be a whole number greater than or equal to 1."
  }

  validation {
    condition     = length(var.public_subnet_cidrs) == var.availability_zone_count && length(var.private_subnet_cidrs) == var.availability_zone_count
    error_message = "public_subnet_cidrs and private_subnet_cidrs must each have exactly availability_zone_count entries."
  }
}

variable "scan_on_push" {
  description = "Whether ECR repositories scan images for vulnerabilities on push."
  type        = bool
  default     = true
}

variable "lifecycle_keep_count" {
  description = "Number of most recent images each ECR repository retains."
  type        = number

  validation {
    condition     = var.lifecycle_keep_count > 0 && var.lifecycle_keep_count == floor(var.lifecycle_keep_count)
    error_message = "lifecycle_keep_count must be a positive whole number."
  }
}

variable "force_delete" {
  description = "Whether ECR repositories can be deleted by Terraform even if they still contain images (ephemeral teardown)."
  type        = bool
  default     = true
}
