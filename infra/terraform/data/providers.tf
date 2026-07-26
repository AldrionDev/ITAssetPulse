provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# Credentials come from the MONGODB_ATLAS_CLIENT_ID / MONGODB_ATLAS_CLIENT_SECRET
# Service Account environment variables (spec §4.4) - never a provider argument
# or a Terraform variable.
provider "mongodbatlas" {}
