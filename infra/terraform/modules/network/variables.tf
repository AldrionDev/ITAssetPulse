variable "project_name" {
  description = "Project name used to build resource names and tags."
  type        = string
}

variable "environment" {
  description = "Environment name used to build resource names and tags (e.g. \"demo\")."
  type        = string
}

variable "common_tags" {
  description = "Tags applied to every resource created by this module."
  type        = map(string)
  default     = {}
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets, one per availability zone, in AZ order."
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_cidrs) == length(var.private_subnet_cidrs)
    error_message = "public_subnet_cidrs and private_subnet_cidrs must have the same length."
  }
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
    condition     = length(var.public_subnet_cidrs) == var.availability_zone_count
    error_message = "public_subnet_cidrs and private_subnet_cidrs must each have exactly availability_zone_count entries."
  }
}
