locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}


# Main AWS infrastructure resources will be added here in later milestones.
# Milestone 6 only prepares the Terraform foundation.