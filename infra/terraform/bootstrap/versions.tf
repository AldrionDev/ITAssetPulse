terraform {
  # >= 1.10 is required by the remote-state stacks for S3 native lockfile
  # (use_lockfile). The bootstrap stack itself uses local state, but the whole
  # repository is kept on a consistent minimum version.
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}
