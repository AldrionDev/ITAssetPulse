module "network" {
  source = "../modules/network"

  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  vpc_cidr                = var.vpc_cidr
  public_subnet_cidrs     = var.public_subnet_cidrs
  private_subnet_cidrs    = var.private_subnet_cidrs
  availability_zone_count = var.availability_zone_count
}
