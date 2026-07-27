# ALB security group: ingress TCP 80 from the internet; egress restricted to
# the frontend/backend container ports, 0.0.0.0/0 (spec §4.5). The two egress
# rules are NOT scoped to the service modules' own security groups - that
# would only let the egress rules be created after the module instances,
# leaving a window where a freshly-started task cannot be reached from the
# ALB. Instead, all three rule resources (ingress + both egress) are created
# before the ALB and before the service modules; the actual access
# restriction happens on the service-module security groups' ingress side
# (each only accepts traffic from this ALB security group - see
# modules/ecs-fargate-service/security_group.tf).

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "ALB security group: HTTP ingress from the internet, port-restricted egress to the ECS services."
  vpc_id      = data.terraform_remote_state.foundation.outputs.vpc_id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb-sg"
  })
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from the internet."
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"

  tags = local.common_tags
}

resource "aws_vpc_security_group_egress_rule" "alb_to_frontend" {
  security_group_id = aws_security_group.alb.id
  description       = "To the frontend service's container port."
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = var.frontend_container_port
  to_port           = var.frontend_container_port
  ip_protocol       = "tcp"

  tags = local.common_tags
}

resource "aws_vpc_security_group_egress_rule" "alb_to_backend" {
  security_group_id = aws_security_group.alb.id
  description       = "To the backend service's container port."
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = var.backend_container_port
  to_port           = var.backend_container_port
  ip_protocol       = "tcp"

  tags = local.common_tags
}

resource "aws_lb" "this" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  ip_address_type    = "ipv4"
  subnets            = data.terraform_remote_state.foundation.outputs.public_subnet_ids
  security_groups    = [aws_security_group.alb.id]

  enable_deletion_protection = false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-alb"
  })

  # aws_lb only implicitly depends on the security group resource itself (via
  # security_groups), not on these separate rule resources. Without this
  # explicit depends_on, Terraform could create the ALB before its security
  # group has any ingress/egress rules attached.
  depends_on = [
    aws_vpc_security_group_ingress_rule.alb_http,
    aws_vpc_security_group_egress_rule.alb_to_frontend,
    aws_vpc_security_group_egress_rule.alb_to_backend,
  ]
}
