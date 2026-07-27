# Demo Fargate-only cluster: no capacity provider, no EC2 capacity, no
# Container Insights (observability is #181's scope, not this issue's).

resource "aws_ecs_cluster" "this" {
  name = "${local.name_prefix}-cluster"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cluster"
  })
}
