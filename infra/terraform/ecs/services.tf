# Two explicit module blocks (no for_each) - spec §5.3.

module "frontend" {
  source = "../modules/ecs-fargate-service"

  name         = "frontend"
  cluster_arn  = aws_ecs_cluster.this.arn
  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  container_image = local.frontend_image_uri
  container_port  = var.frontend_container_port
  desired_count   = var.frontend_desired_count
  cpu             = var.frontend_cpu
  memory          = var.frontend_memory

  public_subnet_ids     = data.terraform_remote_state.foundation.outputs.public_subnet_ids
  assign_public_ip      = true
  alb_security_group_id = aws_security_group.alb.id
  vpc_id                = data.terraform_remote_state.foundation.outputs.vpc_id

  environment_variables = {}
  secrets               = {}

  target_group_arn = aws_lb_target_group.frontend.arn

  # No external dependency (static SPA) - no manual runbook step to wait out.
  health_check_grace_period_seconds = 0
  deployment_min_healthy_percent    = 100
  deployment_max_percent            = 200
  log_retention_days                = var.log_retention_days

  # The frontend target group must already be the listener's default action
  # before the service can register with it.
  depends_on = [aws_lb_listener.http]
}

module "backend" {
  source = "../modules/ecs-fargate-service"

  name         = "backend"
  cluster_arn  = aws_ecs_cluster.this.arn
  project_name = var.project_name
  environment  = var.environment
  common_tags  = local.common_tags

  container_image = local.backend_image_uri
  container_port  = var.backend_container_port
  desired_count   = var.backend_desired_count
  cpu             = var.backend_cpu
  memory          = var.backend_memory

  public_subnet_ids     = data.terraform_remote_state.foundation.outputs.public_subnet_ids
  assign_public_ip      = true
  alb_security_group_id = aws_security_group.alb.id
  vpc_id                = data.terraform_remote_state.foundation.outputs.vpc_id

  environment_variables = {}
  secrets = {
    MONGO_URI  = data.terraform_remote_state.data.outputs.mongodb_secret_arn
    JWT_SECRET = aws_secretsmanager_secret.jwt.arn
  }

  target_group_arn = aws_lb_target_group.backend.arn

  # Sized for the Mongoose retry budget plus the manual Atlas allow-list
  # window (see variables.tf / README).
  health_check_grace_period_seconds = var.backend_health_check_grace_period_seconds
  deployment_min_healthy_percent    = 100
  deployment_max_percent            = 200
  log_retention_days                = var.log_retention_days

  # The backend target group must already be attached to the /api listener
  # rule before the service can register with it (target-group-behind-a-
  # listener requirement, see README "Target group ownership").
  depends_on = [aws_lb_listener_rule.backend_api]
}
