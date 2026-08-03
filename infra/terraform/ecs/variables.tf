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
  description = "AWS region where the ECS stack and its remote-state reads are located."
  type        = string
  default     = "eu-north-1"
}

variable "release_sha" {
  description = "Full Git commit SHA of the backend/frontend images published by publish-images.yml. Used as the ECR image_tag for the digest lookup; no fallback tag is accepted."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{40}$", var.release_sha))
    error_message = "release_sha must be a full 40-character lowercase hexadecimal Git commit SHA (not a short SHA, branch name, or \"latest\")."
  }
}

variable "frontend_container_port" {
  description = "Port the frontend container listens on (nginx, cloud-static image)."
  type        = number
  default     = 80
}

variable "backend_container_port" {
  description = "Port the backend container listens on (NestJS, backend/src/main.ts)."
  type        = number
  default     = 3000
}

variable "frontend_cpu" {
  description = "Fargate CPU units for the frontend task."
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Fargate memory (MiB) for the frontend task."
  type        = number
  default     = 512
}

variable "backend_cpu" {
  description = "Fargate CPU units for the backend task."
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Fargate memory (MiB) for the backend task."
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  description = "Desired number of running frontend tasks."
  type        = number
  default     = 1

  validation {
    condition     = var.frontend_desired_count >= 0 && floor(var.frontend_desired_count) == var.frontend_desired_count
    error_message = "frontend_desired_count must be a non-negative whole number."
  }
}

variable "backend_desired_count" {
  description = "Desired number of running backend tasks."
  type        = number
  default     = 1

  validation {
    condition     = var.backend_desired_count >= 0 && floor(var.backend_desired_count) == var.backend_desired_count
    error_message = "backend_desired_count must be a non-negative whole number."
  }
}

variable "backend_health_check_grace_period_seconds" {
  description = "Seconds the backend ECS service ignores failing ALB health checks after a task starts. Sized for a ~15-minute Mongoose connection-retry budget (#178) plus a ~5-minute operator buffer to complete the manual MongoDB Atlas IP allow-list step (spec §11) before the task could otherwise be replaced (which would hand the next task a new public IP). The frontend has no such external dependency; its grace period is fixed at 0 in services.tf, not exposed as a variable."
  type        = number
  default     = 1200

  validation {
    condition     = var.backend_health_check_grace_period_seconds >= 0 && floor(var.backend_health_check_grace_period_seconds) == var.backend_health_check_grace_period_seconds
    error_message = "backend_health_check_grace_period_seconds must be a non-negative whole number."
  }
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period in days for both services' log groups."
  type        = number
  default     = 7

  validation {
    condition = contains(
      [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653],
      var.log_retention_days
    )
    error_message = "log_retention_days must be one of the values CloudWatch Logs accepts for retention_in_days (e.g. 1, 3, 5, 7, 14, 30, 60, 90, ...)."
  }
}
