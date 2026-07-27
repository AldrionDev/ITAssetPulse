variable "name" {
  description = "Short name of the service (e.g. \"backend\", \"frontend\"), combined with project_name/environment for resource names."
  type        = string
}

variable "cluster_arn" {
  description = "ARN of the ECS cluster the service runs in."
  type        = string
}

variable "common_tags" {
  description = "Tags applied to every taggable resource created by this module."
  type        = map(string)
  default     = {}
}

variable "project_name" {
  description = "Project name used to build resource names and tags."
  type        = string
}

variable "environment" {
  description = "Environment name used to build resource names and tags (e.g. \"demo\")."
  type        = string
}

variable "container_image" {
  description = "Digest-pinned container image URI (<repository-uri>@sha256:<64 lowercase hex characters>). Mutable tags are not accepted."
  type        = string

  validation {
    condition     = can(regex("^[^@[:space:]]+@sha256:[0-9a-f]{64}$", var.container_image))
    error_message = "container_image must be a digest-pinned URI in the form <repository-uri>@sha256:<64 lowercase hex characters>; tags (including \"latest\" or a Git SHA tag), whitespace, and multiple \"@\" characters are not accepted."
  }
}

variable "container_port" {
  description = "Port the container listens on."
  type        = number

  validation {
    condition     = var.container_port >= 1 && var.container_port <= 65535 && floor(var.container_port) == var.container_port
    error_message = "container_port must be a whole number between 1 and 65535."
  }
}

variable "desired_count" {
  description = "Desired number of running tasks."
  type        = number

  validation {
    condition     = var.desired_count >= 0 && floor(var.desired_count) == var.desired_count
    error_message = "desired_count must be a non-negative whole number."
  }
}

variable "cpu" {
  description = "Fargate task CPU units (e.g. 256, 512, 1024). Must be paired with a supported memory value."
  type        = number
}

variable "memory" {
  description = "Fargate task memory in MiB. Must be a value supported for the given cpu (see locals.fargate_cpu_memory_options)."
  type        = number
}

variable "public_subnet_ids" {
  description = "Public subnet IDs the task ENI is placed in."
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_ids) > 0
    error_message = "public_subnet_ids must contain at least one subnet ID."
  }
}

variable "assign_public_ip" {
  description = "Whether tasks receive a public IP (required for public-subnet Fargate with no NAT Gateway)."
  type        = bool
}

variable "alb_security_group_id" {
  description = "Security group ID of the ALB; the only allowed ingress source for this service's security group."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID the service security group is created in."
  type        = string
}

variable "environment_variables" {
  description = "Plain (non-secret) environment variables injected into the container, as name => value."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secrets Manager-backed environment variables, as name => secret ARN. Empty map creates no IAM policy."
  type        = map(string)
  default     = {}
}

variable "target_group_arn" {
  description = "ARN of the ALB target group this service registers with. Created and attached to a listener/listener rule by the ecs root stack; this module does not create a target group."
  type        = string

  validation {
    condition     = can(regex("^arn:aws:elasticloadbalancing:[a-z0-9-]+:[0-9]{12}:targetgroup/[A-Za-z0-9-]+/[0-9a-f]+$", var.target_group_arn))
    error_message = "target_group_arn must be a fully-formed Elastic Load Balancing target group ARN (arn:aws:elasticloadbalancing:<region>:<account-id>:targetgroup/<name>/<id>)."
  }
}

variable "health_check_grace_period_seconds" {
  description = "Seconds the ECS service ignores failing health checks after a task starts, so the manual MongoDB Atlas allow-list step (spec §11) doesn't cause premature task replacement."
  type        = number

  validation {
    condition     = var.health_check_grace_period_seconds >= 0 && floor(var.health_check_grace_period_seconds) == var.health_check_grace_period_seconds
    error_message = "health_check_grace_period_seconds must be a whole number greater than or equal to 0."
  }
}

variable "deployment_min_healthy_percent" {
  description = "Minimum healthy percent during deployments."
  type        = number

  validation {
    condition     = var.deployment_min_healthy_percent >= 0 && var.deployment_min_healthy_percent <= 100 && floor(var.deployment_min_healthy_percent) == var.deployment_min_healthy_percent
    error_message = "deployment_min_healthy_percent must be a whole number between 0 and 100."
  }
}

variable "deployment_max_percent" {
  description = "Maximum percent during deployments."
  type        = number

  validation {
    condition     = var.deployment_max_percent >= 100 && var.deployment_max_percent <= 200 && floor(var.deployment_max_percent) == var.deployment_max_percent
    error_message = "deployment_max_percent must be a whole number between 100 and 200."
  }
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention period in days for the service's log group."
  type        = number

  validation {
    condition = contains(
      [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653],
      var.log_retention_days
    )
    error_message = "log_retention_days must be one of the values CloudWatch Logs accepts for retention_in_days (e.g. 1, 3, 5, 7, 14, 30, 60, 90, ...)."
  }
}
