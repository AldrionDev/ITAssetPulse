resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  tags = local.common_tags
}

# Routes /api and /api/* to the backend target group. The url-rewrite
# transform strips the /api prefix server-side before the request reaches the
# backend (spec §3.1), so the backend keeps its existing root-relative routes
# and no app.setGlobalPrefix('api') change is needed:
#   /api            -> /
#   /api/           -> /
#   /api/health     -> /health
#   /api/users      -> /users
resource "aws_lb_listener_rule" "backend_api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api", "/api/*"]
    }
  }

  transform {
    type = "url-rewrite"

    url_rewrite_config {
      rewrite {
        regex   = "^/api/?(.*)$"
        replace = "/$1"
      }
    }
  }

  tags = local.common_tags
}
