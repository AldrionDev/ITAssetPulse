terraform {
  # >= 1.10 for the S3 native lockfile (use_lockfile) used by this stack's remote backend.
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
