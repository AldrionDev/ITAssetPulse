resource "aws_security_group" "this" {
  name        = "${local.name_prefix}-service"
  description = "Fargate service security group for ${local.name_prefix}"
  vpc_id      = var.vpc_id

  tags = local.common_tags
}

resource "aws_vpc_security_group_ingress_rule" "from_alb" {
  security_group_id = aws_security_group.this.id
  description       = "Container port from the ALB security group"

  referenced_security_group_id = var.alb_security_group_id
  from_port                    = var.container_port
  to_port                      = var.container_port
  ip_protocol                  = "tcp"

  tags = local.common_tags
}

# Explicit allow-all egress (documented ephemeral-demo decision, spec §5.3):
# tasks need outbound access to ECR, CloudWatch Logs, Secrets Manager, DNS,
# and (backend) the public MongoDB Atlas endpoint. Tighter per-port/
# destination egress is a deferred hardening item, not v1 scope.
resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.this.id
  description       = "Allow-all egress (ephemeral demo; see spec section 5.3)"

  cidr_ipv4   = "0.0.0.0/0"
  ip_protocol = "-1"

  tags = local.common_tags
}
