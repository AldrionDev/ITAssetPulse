resource "aws_ecs_service" "this" {
  name             = local.name_prefix
  cluster          = var.cluster_arn
  task_definition  = aws_ecs_task_definition.this.arn
  desired_count    = var.desired_count
  launch_type      = "FARGATE"
  platform_version = local.ecs_platform_version

  # Fixed in v1 (not an input): lets terraform apply return without waiting
  # for backend target health, which is what enables the manual MongoDB
  # Atlas allow-list window (spec §11). No deployment_circuit_breaker block
  # for the same reason - automatic rollback-on-health-check-failure would
  # fight that manual window.
  wait_for_steady_state = false

  health_check_grace_period_seconds  = var.health_check_grace_period_seconds
  deployment_minimum_healthy_percent = var.deployment_min_healthy_percent
  deployment_maximum_percent         = var.deployment_max_percent

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.this.id]
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = var.name
    container_port   = var.container_port
  }

  tags = local.common_tags

  depends_on = [
    aws_iam_role_policy_attachment.execution_managed,
    aws_iam_role_policy.secrets_access,
  ]
}
