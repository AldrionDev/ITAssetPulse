data "aws_caller_identity" "current" {}

locals {
  # Deterministic, project-stable and strongly collision-resistant. The account
  # id is unique within the partition, but the bucket lives in S3's shared
  # namespace, so creation can still fail if the name is already taken.
  state_bucket_name = "${var.project_name}-terraform-state-${data.aws_caller_identity.current.account_id}"

  common_tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
    Purpose   = "terraform-state"
  }
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = local.state_bucket_name

  # Terraform must never auto-empty the shared state store: force_destroy stays
  # false, so removing prevent_destroy alone is not enough to delete content
  # (see the break-glass procedure in README.md).
  force_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}
