provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

# The random provider has no configurable arguments; no provider block needed.
