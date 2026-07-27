# Digest lookup by release_sha (spec §10.2). If no image with this tag has
# been published, the data source errors and plan/apply fails clearly - there
# is no fallback tag (not "latest", not a mutable branch tag).

data "aws_ecr_image" "backend" {
  repository_name = local.backend_ecr_repository_name
  image_tag       = var.release_sha
}

data "aws_ecr_image" "frontend" {
  repository_name = local.frontend_ecr_repository_name
  image_tag       = var.release_sha
}

locals {
  backend_image_uri  = "${data.terraform_remote_state.foundation.outputs.backend_ecr_repository_url}@${data.aws_ecr_image.backend.image_digest}"
  frontend_image_uri = "${data.terraform_remote_state.foundation.outputs.frontend_ecr_repository_url}@${data.aws_ecr_image.frontend.image_digest}"
}
