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
  description = "AWS region where the Secrets Manager secret is created."
  type        = string
  default     = "eu-north-1"
}

variable "atlas_project_id" {
  description = "MongoDB Atlas project (group) ID that owns the database user."
  type        = string

  validation {
    condition     = can(regex("^[a-f0-9]{24}$", var.atlas_project_id))
    error_message = "atlas_project_id must be a 24-character lowercase hexadecimal Atlas project ID."
  }
}

variable "mongodb_atlas_srv_host" {
  description = "MongoDB Atlas cluster SRV hostname only, e.g. \"cluster0.abcde.mongodb.net\" - no scheme, credentials, path, or query string."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9.-]+$", var.mongodb_atlas_srv_host))
    error_message = "mongodb_atlas_srv_host must be a bare hostname only (no \"mongodb+srv://\" scheme, credentials, path, or query string)."
  }
}

variable "mongodb_atlas_app_name" {
  description = "Application name reported to Atlas in the connection string (appName query parameter)."
  type        = string

  validation {
    condition     = length(var.mongodb_atlas_app_name) > 0
    error_message = "mongodb_atlas_app_name must not be empty."
  }
}

variable "atlas_database_username" {
  description = "Username for the Terraform-managed MongoDB Atlas database user."
  type        = string

  validation {
    condition = (
      length(trimspace(var.atlas_database_username)) > 0 &&
      var.atlas_database_username == trimspace(var.atlas_database_username)
    )
    error_message = "atlas_database_username must not be empty or contain leading or trailing whitespace."
  }
}

variable "mongodb_database_name" {
  description = "Name of the application database the generated user has readWrite access to."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9_-]+$", var.mongodb_database_name))
    error_message = "mongodb_database_name must contain only letters, digits, underscores, and hyphens."
  }
}
