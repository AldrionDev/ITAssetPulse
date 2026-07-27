# Target groups live here, not in modules/ecs-fargate-service: a target group
# must already be attached to a listener/listener rule before an ECS service
# can reference it, so it has to be created next to the ALB/listener it is
# coupled with (see README "Target group ownership").

resource "aws_lb_target_group" "frontend" {
  name        = "${local.name_prefix}-frontend-tg"
  port        = var.frontend_container_port
  protocol    = "HTTP"
  vpc_id      = data.terraform_remote_state.foundation.outputs.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-frontend-tg"
  })
}

resource "aws_lb_target_group" "backend" {
  name        = "${local.name_prefix}-backend-tg"
  port        = var.backend_container_port
  protocol    = "HTTP"
  vpc_id      = data.terraform_remote_state.foundation.outputs.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-tg"
  })
}
