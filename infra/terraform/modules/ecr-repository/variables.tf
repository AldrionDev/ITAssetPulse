variable "name" {
  description = "Name of the ECR repository."
  type        = string
}

variable "common_tags" {
  description = "Tags applied to the repository."
  type        = map(string)
  default     = {}
}

variable "scan_on_push" {
  description = "Whether to scan images for vulnerabilities on push."
  type        = bool
  default     = true
}

variable "lifecycle_keep_count" {
  description = "Number of most recent images to retain; older images are expired by the lifecycle policy."
  type        = number

  validation {
    condition     = var.lifecycle_keep_count > 0 && var.lifecycle_keep_count == floor(var.lifecycle_keep_count)
    error_message = "lifecycle_keep_count must be a positive whole number."
  }
}

variable "force_delete" {
  description = "Whether to allow Terraform to delete the repository even if it still contains images (ephemeral teardown)."
  type        = bool
  default     = true
}
