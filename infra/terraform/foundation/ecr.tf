module "ecr_backend" {
  source = "../modules/ecr-repository"

  name                 = "${local.name_prefix}-backend"
  common_tags          = local.common_tags
  scan_on_push         = var.scan_on_push
  lifecycle_keep_count = var.lifecycle_keep_count
  force_delete         = var.force_delete
}

module "ecr_frontend" {
  source = "../modules/ecr-repository"

  name                 = "${local.name_prefix}-frontend"
  common_tags          = local.common_tags
  scan_on_push         = var.scan_on_push
  lifecycle_keep_count = var.lifecycle_keep_count
  force_delete         = var.force_delete
}
